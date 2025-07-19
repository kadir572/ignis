use base64::Engine;
use image::DynamicImage;
use lopdf::{Dictionary, Document, Object, ObjectId};
use pdfium_render::prelude::*;
use std::{fs, io::Cursor, path::Path};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;
use std::collections::BTreeMap;

use crate::upload::{functions::{clone_with_dependencies, convert_image_to_pdf, convert_text_to_pdf, get_file_ext, get_output_path, get_temp_pdf_path, init_pdfium}, structs::{DocumentData, FullImageData, ThumbnailData, ThumbnailDownloadData}};

#[tauri::command]
pub async fn download_file(app: AppHandle, file_name: &str, thumbnails: Vec<ThumbnailDownloadData>) -> Result<String, String> { // password_map: file_path -> password
    println!("thumbnails: {:?}", thumbnails);
   
    let output_path = get_output_path(&app, file_name)?;

    // Check if we're dealing with a text file
    let _first_thumb = thumbnails.first().ok_or("No thumbnails provided")?;

    // Original PDF handling code
    let mut new_doc = Document::with_version("1.5");
    let mut new_pages = Vec::new();
    let mut global_id_map: BTreeMap<String, BTreeMap<ObjectId, ObjectId>> = BTreeMap::new();
    let mut loaded_docs: std::collections::HashMap<String, Document> = std::collections::HashMap::new();

    for thumb in &thumbnails {
        let password = thumb.password.as_deref();

        // Use PDFium to load the document (with password if needed)
        let pdfium = init_pdfium(&app)?;
        let document = if let Some(pw) = password {
            pdfium.load_pdf_from_file(&thumb.file_path, Some(pw))
                .map_err(|e| format!("Failed to load encrypted PDF: {}", e))?
        } else {
            pdfium.load_pdf_from_file(&thumb.file_path, None)
                .map_err(|e| format!("Failed to load PDF: {}", e))?
        };

        // Get the page
        let page = document.pages().get(thumb.page_index as u16)
            .map_err(|e| format!("Page index {} out of bounds: {}", thumb.page_index, e))?;

        // Render the page to an image (PNG)
        let render_config = PdfRenderConfig::new()
            .set_target_width(page.width().value as i32)
            .set_target_height(page.height().value as i32)
            .render_annotations(true)
            .render_form_data(true);

        let bitmap = page
            .render_with_config(&render_config)
            .map_err(|e| format!("Failed to render page: {}", e))?;

        let img = bitmap.as_image();
        let mut buffer = Vec::new();
        img.write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::Png)
            .map_err(|e| format!("Failed to encode image: {}", e))?;

        // Save the image to a temp file
        let temp_img_path = std::env::temp_dir().join(format!("page_{}_{}.png", thumb.file_path.replace("/", "_"), thumb.page_index));
        std::fs::write(&temp_img_path, &buffer)
            .map_err(|e| format!("Failed to write temp image: {}", e))?;

        // Convert the image to a PDF (using your existing function)
        let temp_pdf_path = std::env::temp_dir().join(format!("page_{}_{}.pdf", thumb.file_path.replace("/", "_"), thumb.page_index));
        convert_image_to_pdf(&app, temp_img_path.to_str().unwrap(), &temp_pdf_path)?;

        // Load the new PDF with lopdf
        let doc = loaded_docs
            .entry(temp_pdf_path.to_string_lossy().to_string())
            .or_insert_with(|| {
                Document::load(&temp_pdf_path)
                    .expect("Failed to load single page PDF")
            });

        let pages = doc.get_pages();
        let page_id = *pages.values().next().expect("No page found in single page PDF");

        let id_map = global_id_map.entry(temp_pdf_path.to_string_lossy().to_string()).or_default();
        let new_id = clone_with_dependencies(doc, page_id, &mut new_doc, id_map);
        new_pages.push(new_id);

        // Optionally, clean up temp files after merging
    }

    // Build the Pages tree
    let pages_id = new_doc.new_object_id();
    let kids: Vec<Object> = new_pages.iter().map(|&id| id.into()).collect();
    let mut pages_dict = Dictionary::new();
    pages_dict.set("Type", Object::Name(b"Pages".to_vec()));

    pages_dict.set("Kids", Object::Array(kids));
    pages_dict.set("Count", Object::Integer(new_pages.len() as i64));
    new_doc.objects.insert(pages_id, Object::Dictionary(pages_dict));

    // Set the root catalog
    let catalog_id = new_doc.new_object_id();
    let mut catalog_dict = Dictionary::new();
    catalog_dict.set("Type", Object::Name(b"Catalog".to_vec()));
    catalog_dict.set("Pages", Object::Reference(pages_id));
    new_doc.objects.insert(catalog_id, Object::Dictionary(catalog_dict));
    new_doc.trailer.set("Root", catalog_id);

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
    document_id: Option<String>
) -> Result<DocumentData, String> {
    let document_id = document_id.unwrap_or_else(|| Uuid::new_v4().to_string());
    let file_ext = Path::new(file_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    let file_name = Path::new(file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_else(|| {
            if !Path::new(file_path).exists() {
                "File not found"
            } else {
                "Unknown file"
            }
        })
        .to_string();

    // Emit start event
    app.emit("thumbnail-generation-started", file_path).ok();

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

    if file_ext == "txt" {
        // For text files, first convert to PDF
        let text = fs::read_to_string(file_path).map_err(|e| format!("Failed to read txt: {}", e))?;
        
        // Create a temporary PDF file
        let temp_pdf_path = get_temp_pdf_path(&document_id);
        
        // Convert text to PDF
        convert_text_to_pdf(&app, &text, &temp_pdf_path)?;

        // Now use PDFium to generate thumbnails from the temporary PDF
        let pdfium = init_pdfium(&app)?;
        let document = pdfium
            .load_pdf_from_file(temp_pdf_path.to_str().unwrap(), None)
            .map_err(|e| format!("Failed to load document: {}", e))?;

        // For each page
        for (page_index, page) in document.pages().iter().enumerate() {
            // Emit progress event
            app.emit(
                "thumbnail-generation-progress",
                (file_path, page_index, document.pages().len()),
            )
            .ok();

            // Get original page dimensions
            let original_width = page.width().value;
            let original_height = page.height().value;

            // Calculate aspect ratio
            let aspect_ratio = original_width / original_height;

            // Calculate target width based on max height and aspect ratio
            let target_height: f32 = 250.0; // Max height
            let target_width = (target_height * aspect_ratio).round() as i32;

            // Configure rendering
            let render_config = PdfRenderConfig::new()
                .set_target_width(target_width)
                .set_maximum_height(250)
                .render_annotations(true)
                .render_form_data(true);

            // Render the page to an image
            let bitmap = page
                .render_with_config(&render_config)
                .map_err(|e| format!("Failed to render page {}: {}", page_index + 1, e))?;

            // Convert to base64
            let mut buffer = Vec::new();
            let img = bitmap.as_image();

            img.write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::Png)
                .map_err(|e| format!("Failed to encode image: {}", e))?;

            let base64_data = base64::engine::general_purpose::STANDARD.encode(&buffer);
            let data_url = format!("data:image/png;base64,{}", base64_data);

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

        // Now use PDFium to generate thumbnails from the temporary PDF
        let pdfium = init_pdfium(&app)?;
        let document = pdfium
            .load_pdf_from_file(temp_pdf_path.to_str().unwrap(), None)
            .map_err(|e| format!("Failed to load document: {}", e))?;

        // For each page (should be just one)
        for (page_index, page) in document.pages().iter().enumerate() {
            // Emit progress event
            app.emit(
                "thumbnail-generation-progress",
                (file_path, page_index, document.pages().len()),
            )
            .ok();

            // Get original page dimensions
            let original_width = page.width().value;
            let original_height = page.height().value;

            // Calculate aspect ratio
            let aspect_ratio = original_width / original_height;

            // Calculate target width based on max height and aspect ratio
            let target_height: f32 = 250.0; // Max height
            let target_width = (target_height * aspect_ratio).round() as i32;

            // Configure rendering
            let render_config = PdfRenderConfig::new()
                .set_target_width(target_width)
                .set_maximum_height(250)
                .render_annotations(true)
                .render_form_data(true);

            // Render the page to an image
            let bitmap = page
                .render_with_config(&render_config)
                .map_err(|e| format!("Failed to render page {}: {}", page_index + 1, e))?;

            // Convert to base64
            let mut buffer = Vec::new();
            let img = bitmap.as_image();

            img.write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::Png)
                .map_err(|e| format!("Failed to encode image: {}", e))?;

            let base64_data = base64::engine::general_purpose::STANDARD.encode(&buffer);
            let data_url = format!("data:image/png;base64,{}", base64_data);

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
        // Internal error: failed to initialize PDFium
        let pdfium = match init_pdfium(&app) {
            Ok(pdfium) => pdfium,
            Err(e) => return Err(format!("Internal error: failed to initialize PDFium: {}", e)),
        };

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
            app.emit(
                "thumbnail-generation-progress",
                (file_path, page_index, document.pages().len()),
            )
            .ok();

            // Get original page dimensions directly
            let original_width = page.width().value;
            let original_height = page.height().value;

            // Calculate aspect ratio
            let aspect_ratio = original_width / original_height;

            // Calculate target width based on max height and aspect ratio
            let target_height: f32 = 250.0; // Max height
            let target_width = (target_height * aspect_ratio).round() as i32;

            // Configure rendering with calculated dimensions
            let render_config = PdfRenderConfig::new()
                .set_target_width(target_width)
                .set_maximum_height(250) // Your max height constraint
                .render_annotations(true)
                .render_form_data(true);

            // Render the page to an image
            let bitmap = page
                .render_with_config(&render_config)
                .map_err(|e| format!("Failed to render page {}: {}", page_index + 1, e))?;

            // Convert to base64
            let mut buffer = Vec::new();
            let img = bitmap.as_image();

            img.write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::Png)
                .map_err(|e| format!("Failed to encode image: {}", e))?;

            let base64_data = base64::engine::general_purpose::STANDARD.encode(&buffer);
            let data_url = format!("data:image/png;base64,{}", base64_data);

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
        app.emit("thumbnail-generation-completed", file_path).ok();

        Ok(DocumentData {
            id: document_id,
            file_name,
            file_path: file_path.to_string(),
            thumbnails,
            error: None,
        })
    }
}

#[tauri::command]
pub async fn gen_full_res(app: AppHandle, file_path: &str, page_index: usize) -> Result<FullImageData, String> {
      let file_ext = get_file_ext(file_path)?;

    if file_ext == "txt" {
        // Check if we have a temporary PDF file
        let temp_pdf_path = get_temp_pdf_path(file_path);
        if !temp_pdf_path.exists() {
            // If no temporary PDF exists, convert the text file
            let text = fs::read_to_string(file_path)
                .map_err(|e| format!("Failed to read txt: {}", e))?;
            convert_text_to_pdf(&app, &text, &temp_pdf_path)?;
        }

        // Use PDFium to render the page
        let pdfium = init_pdfium(&app)?;
        let document = pdfium
            .load_pdf_from_file(temp_pdf_path.to_str().unwrap(), None)
            .map_err(|e| format!("Failed to load document: {}", e))?;

        let page = document.pages()
            .get(page_index as u16)
            .map_err(|e| format!("Page index {} out of bounds: {}", page_index, e))?;

        // High-resolution render (4x the thumbnail size)
        let scale_factor = 4.0;
        let width = (page.width().value * scale_factor).round() as i32;
        let height = (page.height().value * scale_factor).round() as i32;

        let render_config = PdfRenderConfig::new()
            .set_target_width(width)
            .set_target_height(height)
            .render_annotations(true)
            .render_form_data(true);

        let bitmap = page
            .render_with_config(&render_config)
            .map_err(|e| format!("Failed to render PDF page: {}", e))?;

        let dynamic_image = DynamicImage::from(bitmap.as_image());
        let mut buffer = Vec::new();

        dynamic_image
            .write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::WebP)
            .map_err(|e| format!("Failed to encode WebP: {}", e))?;

        let base64_data = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/webp;base64,{}", base64_data);

        Ok(FullImageData {
            data_url,
            width: bitmap.width() as u32,
            height: bitmap.height() as u32,
        })
    } else if file_ext == "png" || file_ext == "jpg" {
        let image = image::open(file_path).map_err(|e| format!("Failed to open image: {}", e))?;
        let mut buffer = Vec::new();

        image.write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::WebP)
            .map_err(|e| format!("Failed to encode WebP: {}", e))?;

        let base64_data = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/webp;base64,{}", base64_data);

        Ok(FullImageData {
            data_url,
            width: image.width() as u32,
            height: image.height() as u32,
        })
    } else {
        // For PDFs, use PDFium but with higher render settings than thumbnails
        let pdfium = init_pdfium(&app)?;
        let document = pdfium
            .load_pdf_from_file(file_path, None)
            .map_err(|e| format!("Failed to load document: {}", e))?;

        let page = document.pages()
            .get(page_index as u16)
            .map_err(|e| format!("Page index {} out of bounds: {}", page_index, e))?;

        // High-resolution render (4x the thumbnail size)
        let scale_factor = 4.0;
        let width = (page.width().value * scale_factor).round() as i32;
        let height = (page.height().value * scale_factor).round() as i32;

        let render_config = PdfRenderConfig::new()
            .set_target_width(width)
            .set_target_height(height)
            .render_annotations(true)
            .render_form_data(true);

        let bitmap = page
            .render_with_config(&render_config)
            .map_err(|e| format!("Failed to render PDF page: {}", e))?;

        let dynamic_image = DynamicImage::from(bitmap.as_image());
        let mut buffer = Vec::new();

        dynamic_image
            .write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::WebP)
            .map_err(|e| format!("Failed to encode WebP: {}", e))?;

        let base64_data = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/webp;base64,{}", base64_data);

        Ok(FullImageData {
            data_url,
            width: bitmap.width() as u32,
            height: bitmap.height() as u32,
        })
    }
}