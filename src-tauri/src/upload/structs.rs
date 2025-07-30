#[derive(serde::Serialize, serde::Deserialize)]
pub struct ThumbnailData {
    pub id: String, // uuid
    pub page_index: usize,
    pub file_path: String,
    pub thumbnail: String, // base64 data URL
    pub width: u32,
    pub height: u32,
}

#[derive(serde::Deserialize, Debug)]
pub struct ThumbnailDownloadData {
    pub file_path: String,
    pub page_index: usize,
    pub password: Option<String>,
}

#[derive(serde::Serialize)]
pub struct DocumentData {
    pub id: String, // uuid
    pub file_name: String,
    pub file_path: String,
    pub thumbnails: Vec<ThumbnailData>,
    pub error: Option<String>,
}

#[derive(serde::Serialize)]
pub struct FullImageData {
    pub data_url: String,
    pub width: u32,
    pub height: u32,
}

#[derive(serde::Serialize)]
pub struct DownloadSuccessRes {
    pub key: String,
    pub file_name: String,
    pub file_path: String
}

#[derive(serde::Serialize)]
pub struct CommandErrRes {
    pub key: String,
    pub file_name: String,
    pub file_path: Option<String>,
    pub page_index: Option<usize>
}