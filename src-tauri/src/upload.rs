use std::io::Cursor;
use base64::Engine;
use tauri::{AppHandle, Emitter, Manager};
use pdfium_render::prelude::*;

#[tauri::command]
pub async fn generate_thumbnails(app: AppHandle, file_path: &str) -> Result<PdfThumbnailsData, String> {
    // Find the correct PDFium library based on platform
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
            .map_err(|e| format!("Failed to bind to PDFium library: {}", e))?
    );
    
    // Load the document
    let document = pdfium.load_pdf_from_file(file_path, None)
        .map_err(|e| format!("Failed to load document: {}", e))?;
    
    let mut thumbnails = Vec::new();
    
    // Emit start event
    app.emit("thumbnail-generation-started", file_path).ok();
    
    // For each page
    for (page_index, page) in document.pages().iter().enumerate() {
        // Emit progress event
        app.emit("thumbnail-generation-progress", (file_path, page_index, document.pages().len())).ok();
        
        // Get original page dimensions directly
        let original_width = page.width().value;
        let original_height = page.height().value;
        
        // Calculate aspect ratio
        let aspect_ratio = original_width / original_height;
        
        // Calculate target width based on max height and aspect ratio
        let target_height: f32 = 140.0; // Max height
        let target_width = (target_height * aspect_ratio).round() as i32;
        
        // Configure rendering with calculated dimensions
        let render_config = PdfRenderConfig::new()
            .set_target_width(target_width)
            .set_maximum_height(140) // Your max height constraint
            .render_annotations(true)
            .render_form_data(true);
        
        // Render the page to an image
        let bitmap = page.render_with_config(&render_config)
            .map_err(|e| format!("Failed to render page {}: {}", page_index + 1, e))?;
        
        // Convert to base64
        let mut buffer = Vec::new();
        let img = bitmap.as_image();
        
        img.write_to(&mut Cursor::new(&mut buffer), image::ImageFormat::Png)
            .map_err(|e| format!("Failed to encode image: {}", e))?;
        
        let base64_data = base64::engine::general_purpose::STANDARD.encode(&buffer);
        let data_url = format!("data:image/png;base64,{}", base64_data);
        
        thumbnails.push(ThumbnailData {
            page_index: page_index,
            file_path: file_path.to_string(),
            thumbnail: data_url,
            width: bitmap.width() as u32,
            height: bitmap.height() as u32
        });
    }
    
    // Emit completion event
    app.emit("thumbnail-generation-completed", file_path).ok();
    
    // Get just the filename from the path
    let file_name = std::path::Path::new(file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or(file_path)
        .to_string();
    
    Ok(PdfThumbnailsData {
        file_name,
        file_path: file_path.to_string(),
        thumbnails,
    })
}

#[derive(serde::Serialize)]
pub struct ThumbnailData {
  page_index: usize,
  file_path: String,
  thumbnail: String, // base64 data URL
  width: u32,
  height: u32,
}

#[derive(serde::Serialize)]
pub struct PdfThumbnailsData {
    file_name: String,
    file_path: String,
    thumbnails: Vec<ThumbnailData>,
}