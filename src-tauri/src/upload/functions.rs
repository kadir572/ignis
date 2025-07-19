use base64::Engine;
use genpdf::{elements, fonts, Document as GenDocument, SimplePageDecorator};
use image::{DynamicImage, EncodableLayout, GenericImageView};
use lopdf::{Dictionary, Document, Object, ObjectId, Stream};
use pdfium_render::prelude::*;
use std::collections::BTreeMap;
use std::{
    io::Cursor,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};

use crate::upload::enums::ImageQuality;

pub(crate) fn clone_with_dependencies(
    doc: &Document,
    obj_id: ObjectId,
    new_doc: &mut Document,
    id_map: &mut BTreeMap<ObjectId, ObjectId>,
) -> ObjectId {
    if let Some(&new_id) = id_map.get(&obj_id) {
        return new_id;
    }

    let new_id = new_doc.new_object_id();
    id_map.insert(obj_id, new_id);

    let obj = doc.get_object(obj_id).unwrap();
    let cloned = match obj {
        Object::Dictionary(dict) => {
            let mut new_dict = Dictionary::new();
            for (k, v) in dict.iter() {
                new_dict.set(k.as_bytes(), clone_object(v, doc, new_doc, id_map));
            }
            Object::Dictionary(new_dict)
        }
        Object::Stream(stream) => {
            let mut new_dict = Dictionary::new();
            for (k, v) in stream.dict.iter() {
                new_dict.set(k.as_bytes(), clone_object(v, doc, new_doc, id_map));
            }
            Object::Stream(lopdf::Stream::new(new_dict, stream.content.clone()))
        }
        other => other.clone(),
    };

    new_doc.objects.insert(new_id, cloned);
    new_id
}

pub(crate) fn clone_object(
    obj: &Object,
    doc: &Document,
    new_doc: &mut Document,
    id_map: &mut BTreeMap<ObjectId, ObjectId>,
) -> Object {
    match obj {
        Object::Reference(oid) => {
            Object::Reference(clone_with_dependencies(doc, *oid, new_doc, id_map))
        }
        Object::Array(arr) => Object::Array(
            arr.iter()
                .map(|o| clone_object(o, doc, new_doc, id_map))
                .collect(),
        ),
        Object::Dictionary(dict) => {
            let mut new_dict = Dictionary::new();
            for (k, v) in dict.iter() {
                new_dict.set(k.as_bytes(), clone_object(v, doc, new_doc, id_map));
            }
            Object::Dictionary(new_dict)
        }
        Object::Stream(stream) => {
            let mut new_dict = Dictionary::new();
            for (k, v) in stream.dict.iter() {
                new_dict.set(k.as_bytes(), clone_object(v, doc, new_doc, id_map));
            }
            Object::Stream(lopdf::Stream::new(new_dict, stream.content.clone()))
        }
        other => other.clone(),
    }
}

pub(crate) fn get_unique_output_path(output_path: std::path::PathBuf) -> std::path::PathBuf {
    let parent = output_path
        .parent()
        .unwrap_or_else(|| std::path::Path::new(""));
    let file_stem = output_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let extension = output_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("pdf");

    let mut candidate = output_path.clone();
    let mut counter = 0;

    while candidate.exists() {
        candidate = parent.join(format!("{}_{}.{}", file_stem, counter, extension));
        counter += 1;
    }

    candidate
}

pub(crate) fn init_pdfium(app: &AppHandle) -> Result<Pdfium, String> {
    let resource_path = app.path().resource_dir().unwrap();

    // Determine platform-specific library path
    #[cfg(target_os = "windows")]
    let lib_path = resource_path.join("binaries/windows/pdfium.dll");

    #[cfg(target_os = "macos")]
    let lib_path = resource_path.join("binaries/macos/libpdfium.dylib");

    #[cfg(target_os = "linux")]
    let lib_path = resource_path.join("binaries/linux/libpdfium.so");

    // Initialize PDFium with our bundled library
    let pdfium = Pdfium::new(
        Pdfium::bind_to_library(lib_path.to_string_lossy().to_string())
            .map_err(|e| format!("Failed to bind to PDFium library: {}", e))?,
    );

    Ok(pdfium)
}

pub(crate) fn convert_text_to_pdf(
    app: &AppHandle,
    text: &str,
    output_path: &Path,
) -> Result<(), String> {
    let lines: Vec<&str> = text.lines().collect();

    // Load the font from resources
    let resource_path = app.path().resource_dir().unwrap();
    let assets_path = resource_path.join("assets");
    let fonts_path = assets_path.join("fonts");

    // Create a new document with DejaVuSans font
    let font_family = fonts::from_files(fonts_path, "DejaVuSans", None)
        .map_err(|e| format!("Failed to load font family: {}", e))?;
    let mut doc = GenDocument::new(font_family);

    // Set up page decorator with margins
    let mut decorator = SimplePageDecorator::new();
    decorator.set_margins(20); // 20mm margins
    doc.set_page_decorator(decorator);

    // Add text content
    for line in lines {
        doc.push(elements::Paragraph::new(line));
    }

    // Render the document
    doc.render_to_file(output_path)
        .map_err(|e| format!("Failed to render PDF: {}", e))?;

    Ok(())
}

pub(crate) fn convert_image_to_pdf(
    _app: &AppHandle,
    image_path: &str,
    output_path: &Path,
) -> Result<(), String> {
    let img = image::open(image_path).map_err(|e| format!("Failed to open image: {}", e))?;
    let (width, height) = img.dimensions();

    // Convert image to RGB (removes alpha channel if present) and encode as JPEG
    let rgb_img = img.to_rgb8();
    let mut img_buf = Vec::new();
    rgb_img
        .write_to(&mut Cursor::new(&mut img_buf), image::ImageFormat::Jpeg)
        .map_err(|e| format!("Failed to encode image as JPEG: {}", e))?;

    let mut doc = Document::with_version("1.5");

    // Add image as XObject
    let xobject_id = doc.new_object_id();
    let mut xobject_dict = Dictionary::new();
    xobject_dict.set("Type", "XObject");
    xobject_dict.set("Subtype", "Image");
    xobject_dict.set("Width", width as i64);
    xobject_dict.set("Height", height as i64);
    xobject_dict.set("ColorSpace", "DeviceRGB");
    xobject_dict.set("BitsPerComponent", 8);
    xobject_dict.set("Filter", "DCTDecode"); // JPEG
    let xobject_stream = Stream::new(xobject_dict, img_buf);
    doc.objects
        .insert(xobject_id, Object::Stream(xobject_stream));

    // Create page content stream to draw the image
    let content = format!("q\n{} 0 0 {} 0 0 cm\n/Im0 Do\nQ\n", width, height);
    let content_id = doc.add_object(Stream::new(Dictionary::new(), content.into_bytes()));

    // Create resources dictionary
    let mut resources = Dictionary::new();
    let mut xobjects = Dictionary::new();
    xobjects.set("Im0", xobject_id);
    resources.set("XObject", Object::Dictionary(xobjects));

    // Create the page dictionary
    let mut page_dict = Dictionary::new();
    page_dict.set("Type", "Page");
    page_dict.set(
        "MediaBox",
        vec![0.into(), 0.into(), width.into(), height.into()],
    );
    page_dict.set("Contents", content_id);
    page_dict.set("Resources", resources);

    let page_id = doc.add_object(page_dict);

    // Build the Pages tree
    let pages_id = doc.new_object_id();
    let kids: Vec<Object> = vec![page_id.into()];
    let mut pages_dict = Dictionary::new();
    pages_dict.set("Type", Object::Name(b"Pages".to_vec()));
    pages_dict.set("Kids", Object::Array(kids));
    pages_dict.set("Count", Object::Integer(1));
    doc.objects.insert(pages_id, Object::Dictionary(pages_dict));

    // Set the root catalog
    let catalog_id = doc.new_object_id();
    let mut catalog_dict = Dictionary::new();
    catalog_dict.set("Type", Object::Name(b"Catalog".to_vec()));
    catalog_dict.set("Pages", Object::Reference(pages_id));
    doc.objects
        .insert(catalog_id, Object::Dictionary(catalog_dict));
    doc.trailer.set("Root", catalog_id);

    // Save the new PDF
    doc.save(output_path)
        .map_err(|e| format!("Failed to save PDF: {}", e))?;
    Ok(())
}

pub(crate) fn get_temp_pdf_path(document_id: &str) -> std::path::PathBuf {
    let temp_dir = std::env::temp_dir();
    temp_dir.join(format!("{}.pdf", document_id))
}

pub(crate) fn get_downloads_dir(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .download_dir()
        .map_err(|_| "Could not get downloads directory")?)
}

pub(crate) fn get_output_path(app: &AppHandle, file_name: &str) -> Result<PathBuf, String> {
    let downloads_dir = get_downloads_dir(app)?;

    let output_file_name = if file_name.to_lowercase().ends_with(".pdf") {
        file_name.to_string()
    } else {
        // Remove any existing extension and add .pdf
        let stem = Path::new(file_name)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(file_name);
        format!("{}.pdf", stem)
    };

    Ok(get_unique_output_path(downloads_dir.join(output_file_name)))
}

pub(crate) fn get_file_ext(file_path: &str) -> Result<String, String> {
    Path::new(file_path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.to_lowercase())
        .ok_or_else(|| format!("Could not get file extension for {}", file_path))
}

fn gen_render_config(width: f32, height: f32, quality: ImageQuality) -> PdfRenderConfig {
    let scale = match quality {
        ImageQuality::Low => 1.0,
        ImageQuality::High => 3.0,
    };

    PdfRenderConfig::new()
        .set_target_width((width * scale) as i32)
        .set_target_height((height * scale) as i32)
}

pub(crate) fn gen_image_bitmap<'a>(
    page: &'a PdfPage,
    width: f32,
    height: f32,
    quality: ImageQuality
) -> Result<PdfBitmap<'a>, String> {
    let render_config = gen_render_config(width, height, quality);

    let bitmap = page
        .render_with_config(&render_config)
        .map_err(|e| format!("Failed to render PDF page: {}", e))?;

    Ok(bitmap)
}

pub(crate) fn gen_data_url_from_buffer(buffer: &[u8]) -> String {
    let base64_data = base64::engine::general_purpose::STANDARD.encode(&buffer);
    format!("data:image/webp;base64,{}", base64_data)
}

pub(crate) fn gen_image_data_url(bitmap: &PdfBitmap) -> Result<String, String> {
    let dynamic_image = DynamicImage::from(bitmap.as_image());
    let mut buffer = Vec::new();

    dynamic_image
        .write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::WebP)
        .map_err(|e| format!("Failed to encode WebP: {}", e))?;

    let data_url = gen_data_url_from_buffer(&buffer);

    Ok(data_url)
}

pub(crate) fn file_name_from_path(file_path: &str) -> String {
    Path::new(file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_else(|| {
            if !Path::new(file_path).exists() {
                "File not found"
            } else {
                "Unknown file"
            }
        })
        .to_string()
}