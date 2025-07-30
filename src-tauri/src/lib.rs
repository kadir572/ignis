pub mod upload;

use upload::commands::{download_file, gen_full_res, generate_thumbnails};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            generate_thumbnails,
            gen_full_res,
            download_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
