use lopdf::{Dictionary, Document, EncryptionState, EncryptionVersion, Object, ObjectId};
use pdfium_render::prelude::*;
use std::collections::BTreeMap;
use std::{fs, io::Cursor, path::Path};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::upload::enums::ImageQuality;
use crate::upload::functions::{file_name_from_path, gen_data_url_from_buffer};
use crate::upload::{
    functions::{
        clone_with_dependencies, convert_image_to_pdf, convert_text_to_pdf, gen_image_bitmap,
        gen_image_data_url, get_file_ext, get_output_path, get_temp_pdf_path, init_pdfium,
    },
    structs::{DocumentData, FullImageData, ThumbnailData, ThumbnailDownloadData},
};
use lopdf::encryption::{Permissions};
use std::convert::TryFrom;

#[tauri::command]
pub async fn download_file(
    app: AppHandle,
    file_name: &str,
    thumbnails: Vec<ThumbnailDownloadData>,
    password: Option<String>,
) -> Result<String, String> {

    let output_path = get_output_path(&app, file_name)?;

    // Original PDF handling code
    let mut new_doc = Document::with_version("1.5");
    let mut new_pages = Vec::new();
    let mut global_id_map: BTreeMap<String, BTreeMap<ObjectId, ObjectId>> = BTreeMap::new();

    for thumb in &thumbnails {
        println!("thumb: {:?}", thumb);
        // Load the PDF (encrypted or not)
        let mut doc = lopdf::Document::load(&thumb.file_path)
            .map_err(|e| format!("Failed to load PDF: {}", e))?;

        // Decrypt if password is provided
        if let Some(ref password) = thumb.password {
            if doc.is_encrypted() {
                doc.decrypt(password)
                    .map_err(|e| format!("Failed to decrypt PDF: {}", e))?;
                doc.trailer.remove(b"Encrypt");
            }
        }

        // Get the page object ID for the given page_index (lopdf is 1-based)
        let pages = doc.get_pages();
        let page_id = match pages.get(&((thumb.page_index + 1) as u32)) {
            Some(id) => *id,
            None => {
                return Err(format!(
                    "Page {} not found in {}",
                    thumb.page_index, thumb.file_path
                ))
            }
        };

        // Merge the page into the new document
        let id_map = global_id_map.entry(thumb.file_path.clone()).or_default();
        let new_id = clone_with_dependencies(&doc, page_id, &mut new_doc, id_map);
        new_pages.push(new_id);
    }

    // Build the Pages tree
    let pages_id = new_doc.new_object_id();
    let kids: Vec<Object> = new_pages.iter().map(|&id| id.into()).collect();
    let mut pages_dict = Dictionary::new();
    pages_dict.set("Type", Object::Name(b"Pages".to_vec()));

    pages_dict.set("Kids", Object::Array(kids));
    pages_dict.set("Count", Object::Integer(new_pages.len() as i64));
    new_doc
        .objects
        .insert(pages_id, Object::Dictionary(pages_dict));

    // Set the root catalog
    let catalog_id = new_doc.new_object_id();
    let mut catalog_dict = Dictionary::new();
    catalog_dict.set("Type", Object::Name(b"Catalog".to_vec()));
    catalog_dict.set("Pages", Object::Reference(pages_id));
    new_doc
        .objects
        .insert(catalog_id, Object::Dictionary(catalog_dict));
    new_doc.trailer.set("Root", catalog_id);

    // Ensure /ID is present in the trailer
    if new_doc.trailer.get(b"ID").is_err() {
        // Generate a random 16-byte ID (twice, as per PDF spec)
        let id = Uuid::new_v4().as_bytes().to_vec();
        let id_obj = Object::Array(vec![
            Object::String(id.clone(), lopdf::StringFormat::Hexadecimal),
            Object::String(id, lopdf::StringFormat::Hexadecimal),
        ]);
        new_doc.trailer.set("ID", id_obj);
    }

    if let Some(password) = password {
        // Set owner and user password to the same value for simplicity
        let owner_password = &password;
        let user_password = &password;
        let permissions = Permissions::default();

        // Build the encryption version
        let version = EncryptionVersion::V1 {
            document: &new_doc,
            owner_password,
            user_password,
            permissions,
        };

        // Convert to EncryptionState
        let state = EncryptionState::try_from(version)
            .map_err(|e| format!("Failed to build encryption state: {}", e))?;

        // Encrypt the document
        new_doc.encrypt(&state)
            .map_err(|e| format!("Failed to encrypt PDF: {}", e))?;
    }


    // Save the new PDF
    new_doc
        .save(&output_path)
        .map_err(|e| format!("Failed to save PDF: {}", e))?;

    Ok(format!(
        "PDF created successfully at {}",
        output_path.to_string_lossy()
    ))
}

#[tauri::command]
pub async fn generate_thumbnails(
    app: AppHandle,
    file_path: &str,
    password: Option<String>,
    document_id: Option<String>,
) -> Result<DocumentData, String> {
    let document_id = document_id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let file_ext = get_file_ext(file_path)?;

    let file_name = file_name_from_path(file_path);

    // Emit start event
    // app.emit("thumbnail-generation-started", file_path).ok();

    let mut thumbnails = Vec::new();

    // User error: file not found
    if !Path::new(file_path).exists() {
        return Ok(DocumentData {
            id: document_id,
            file_name,
            file_path: file_path.to_string(),
            thumbnails,
            error: Some("File not found".to_string()),
        });
    }

    let pdfium = init_pdfium(&app)?;

    if file_ext == "txt" {
        // For text files, first convert to PDF

        let temp_pdf_path = get_temp_pdf_path(file_path);
        if !temp_pdf_path.exists() {
            // If no temporary PDF exists, convert the text file
            let text =
                fs::read_to_string(file_path).map_err(|e| format!("Failed to read txt: {}", e))?;
            convert_text_to_pdf(&app, &text, &temp_pdf_path)?;
        }

        let document = pdfium
            .load_pdf_from_file(temp_pdf_path.to_str().unwrap(), None)
            .map_err(|e| format!("Failed to load document: {}", e))?;

        // For each page
        for (page_index, page) in document.pages().iter().enumerate() {
            // Emit progress event
            // app.emit(
            //     "thumbnail-generation-progress",
            //     (file_path, page_index, document.pages().len()),
            // )
            // .ok();

            let aspect_ratio = page.width().value / page.height().value;

            let target_height: f32 = 250.0;
            let target_width = target_height * aspect_ratio;

            let bitmap = gen_image_bitmap(&page, target_width, target_height, ImageQuality::Low)?;

            let data_url = gen_image_data_url(&bitmap)?;

            thumbnails.push(ThumbnailData {
                id: format!("{}_{}", document_id, page_index),
                page_index: page_index,
                file_path: temp_pdf_path.to_string_lossy().to_string(),
                thumbnail: data_url,
                width: bitmap.width() as u32,
                height: bitmap.height() as u32,
            });
        }

        Ok(DocumentData {
            id: document_id,
            file_name,
            file_path: temp_pdf_path.to_string_lossy().to_string(),
            thumbnails,
            error: None,
        })
    } else if file_ext == "png" || file_ext == "jpg" {
        // Create a temporary PDF file for the image
        let temp_pdf_path = get_temp_pdf_path(&document_id);
        convert_image_to_pdf(&app, file_path, &temp_pdf_path)?;

        let document = pdfium
            .load_pdf_from_file(temp_pdf_path.to_str().unwrap(), None)
            .map_err(|e| format!("Failed to load document: {}", e))?;

        // For each page (should be just one)
        for (page_index, page) in document.pages().iter().enumerate() {
            // Emit progress event
            // app.emit(
            //     "thumbnail-generation-progress",
            //     (file_path, page_index, document.pages().len()),
            // )
            // .ok();

            let aspect_ratio = page.width().value / page.height().value;

            // Calculate target width based on max height and aspect ratio
            let target_height: f32 = 250.0;
            let target_width = target_height * aspect_ratio;

            let bitmap = gen_image_bitmap(&page, target_width, target_height, ImageQuality::Low)?;

            let data_url = gen_image_data_url(&bitmap)?;

            thumbnails.push(ThumbnailData {
                id: format!("{}_{}", document_id, page_index),
                page_index: page_index,
                file_path: temp_pdf_path.to_string_lossy().to_string(),
                thumbnail: data_url,
                width: bitmap.width() as u32,
                height: bitmap.height() as u32,
            });
        }

        Ok(DocumentData {
            id: document_id,
            file_name,
            file_path: temp_pdf_path.to_string_lossy().to_string(),
            thumbnails,
            error: None,
        })
    } else {
        // User error: password required/incorrect
        let document: Result<PdfDocument, DocumentData> = match &password {
            Some(pw) => match pdfium.load_pdf_from_file(file_path, Some(pw)) {
                Ok(doc) => Ok(doc),
                Err(e) => {
                    let msg = e.to_string().to_lowercase();
                    if msg.contains("password") || msg.contains("encrypted") {
                        Err(DocumentData {
                            id: document_id.clone(),
                            file_name: file_name.clone(),
                            file_path: file_path.to_string(),
                            thumbnails: vec![],
                            error: Some("PDF_PASSWORD_INCORRECT".to_string()),
                        })
                    } else {
                        return Err(format!("Internal error: failed to load document: {}", e));
                    }
                }
            },
            None => match pdfium.load_pdf_from_file(file_path, None) {
                Ok(doc) => Ok(doc),
                Err(e) => {
                    let msg = e.to_string().to_lowercase();
                    if msg.contains("password") || msg.contains("encrypted") {
                        Err(DocumentData {
                            id: document_id.clone(),
                            file_name: file_name.clone(),
                            file_path: file_path.to_string(),
                            thumbnails: vec![],
                            error: Some("PDF_PASSWORD_REQUIRED".to_string()),
                        })
                    } else {
                        return Err(format!("Internal error: failed to load document: {}", e));
                    }
                }
            },
        };

        // Now handle the result:
        let document = match document {
            Ok(doc) => doc,
            Err(doc_data) => return Ok(doc_data),
        };

        // For each page
        for (page_index, page) in document.pages().iter().enumerate() {
            // Emit progress event
            // app.emit(
            //     "thumbnail-generation-progress",
            //     (file_path, page_index, document.pages().len()),
            // )
            // .ok();

            let aspect_ratio = page.width().value / page.height().value;

            let target_height: f32 = 250.0;
            let target_width = target_height * aspect_ratio;

            let bitmap = gen_image_bitmap(&page, target_width, target_height, ImageQuality::Low)?;

            // Convert to base64
            let mut buffer = Vec::new();
            let img = bitmap.as_image();

            img.write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::Png)
                .map_err(|e| format!("Failed to encode image: {}", e))?;

            let data_url = gen_data_url_from_buffer(&buffer);

            thumbnails.push(ThumbnailData {
                id: format!("{}_{}", document_id, page_index),
                page_index: page_index,
                file_path: file_path.to_string(),
                thumbnail: data_url,
                width: bitmap.width() as u32,
                height: bitmap.height() as u32,
            });
        }

        // Emit completion event
        // app.emit("thumbnail-generation-completed", file_path).ok();

        Ok(DocumentData {
            id: document_id,
            file_name,
            file_path: file_path.to_string(),
            thumbnails,
            error: None,
        })
    }
}

// #[tauri::command]
// pub async fn download_all_files(
//     app: AppHandle,
//     file_name: String,
//     files: Vec<Vec<ThumbnailData>>,
// ) -> Result<String, String> {
//     // Flatten all thumbnails in the order provided
//     let thumbnails: Vec<ThumbnailData> = files.into_iter().flatten().collect();
//     if thumbnails.is_empty() {
//         return Err("No thumbnails provided".to_string());
//     }
//     // Use the provided file_name and ensure uniqueness
//     let output_path = get_output_path(&app, &file_name)?;

//     let mut new_doc = Document::with_version("1.5");
//     let mut new_pages = Vec::new();
//     let mut global_id_map: BTreeMap<String, BTreeMap<ObjectId, ObjectId>> = BTreeMap::new();

//     for thumb in &thumbnails {
//         // Load the PDF (encrypted or not)
//         let doc = lopdf::Document::load(&thumb.file_path)
//             .map_err(|e| format!("Failed to load PDF: {}", e))?;

//         // No decryption logic needed for ThumbnailData (no password)

//         // Get the page object ID for the given page_index (lopdf is 1-based)
//         let pages = doc.get_pages();
//         let page_id = match pages.get(&((thumb.page_index + 1) as u32)) {
//             Some(id) => *id,
//             None => {
//                 return Err(format!(
//                     "Page {} not found in {}",
//                     thumb.page_index, thumb.file_path
//                 ))
//             }
//         };

//         // Merge the page into the new document
//         let id_map = global_id_map.entry(thumb.file_path.clone()).or_default();
//         let new_id = clone_with_dependencies(&doc, page_id, &mut new_doc, id_map);
//         new_pages.push(new_id);
//     }

//     // Build the Pages tree
//     let pages_id = new_doc.new_object_id();
//     let kids: Vec<Object> = new_pages.iter().map(|&id| id.into()).collect();
//     let mut pages_dict = Dictionary::new();
//     pages_dict.set("Type", Object::Name(b"Pages".to_vec()));
//     pages_dict.set("Kids", Object::Array(kids));
//     pages_dict.set("Count", Object::Integer(new_pages.len() as i64));
//     new_doc
//         .objects
//         .insert(pages_id, Object::Dictionary(pages_dict));

//     // Set the root catalog
//     let catalog_id = new_doc.new_object_id();
//     let mut catalog_dict = Dictionary::new();
//     catalog_dict.set("Type", Object::Name(b"Catalog".to_vec()));
//     catalog_dict.set("Pages", Object::Reference(pages_id));
//     new_doc
//         .objects
//         .insert(catalog_id, Object::Dictionary(catalog_dict));
//     new_doc.trailer.set("Root", catalog_id);

//     // Save the new PDF (ensure unique file name)
//     new_doc
//         .save(&output_path)
//         .map_err(|e| format!("Failed to save PDF: {}", e))?;

//     Ok(output_path.to_string_lossy().to_string())
// }

#[tauri::command]
pub async fn gen_full_res(
    app: AppHandle,
    file_path: &str,
    page_index: usize,
    password: Option<String>,
) -> Result<FullImageData, String> {
    let file_ext = get_file_ext(file_path)?;
    let pdfium = init_pdfium(&app)?;

    if file_ext == "txt" {
        // Check if we have a temporary PDF file
        let temp_pdf_path = get_temp_pdf_path(file_path);
        if !temp_pdf_path.exists() {
            // If no temporary PDF exists, convert the text file
            let text =
                fs::read_to_string(file_path).map_err(|e| format!("Failed to read txt: {}", e))?;
            convert_text_to_pdf(&app, &text, &temp_pdf_path)?;
        }
        
        let document = pdfium
            .load_pdf_from_file(temp_pdf_path.to_str().unwrap(), None)
            .map_err(|e| format!("Failed to load document: {}", e))?;

        let page = document
            .pages()
            .get(page_index as u16)
            .map_err(|e| format!("Page index {} out of bounds: {}", page_index, e))?;

        let bitmap = gen_image_bitmap(&page, page.width().value, page.height().value, ImageQuality::High)?;
        let data_url = gen_image_data_url(&bitmap)?;

        Ok(FullImageData {
            data_url,
            width: bitmap.width() as u32,
            height: bitmap.height() as u32,
        })
    } else if file_ext == "png" || file_ext == "jpg" {
        let image = image::open(file_path).map_err(|e| format!("Failed to open image: {}", e))?;
        let mut buffer = Vec::new();

        image
            .write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::WebP)
            .map_err(|e| format!("Failed to encode WebP: {}", e))?;

        Ok(FullImageData {
            data_url: gen_data_url_from_buffer(&buffer),
            width: image.width() as u32,
            height: image.height() as u32,
        })
    } else {
        let document = pdfium
            .load_pdf_from_file(file_path, password.as_deref())
            .map_err(|e| format!("Failed to load document: {}", e))?;

        let page = document
            .pages()
            .get(page_index as u16)
            .map_err(|e| format!("Page index {} out of bounds: {}", page_index, e))?;

        let bitmap = gen_image_bitmap(&page, page.width().value, page.height().value, ImageQuality::High)?;
        let data_url = gen_image_data_url(&bitmap)?;

        Ok(FullImageData {
            data_url,
            width: bitmap.width() as u32,
            height: bitmap.height() as u32,
        })
    }
}
