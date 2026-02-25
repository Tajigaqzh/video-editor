use crate::ffmpeg::{self, VideoInfo};
use crate::commands::AppState;
use tauri::{AppHandle, State, Manager};

/// 初始化 FFmpeg
#[tauri::command]
pub async fn init_ffmpeg(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let mut initialized = state.ffmpeg_initialized.lock().unwrap();
    
    if !*initialized {
        let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
        ffmpeg::handler::init_ffmpeg(&ffmpeg_cmd)
            .map_err(|e| format!("Failed to initialize FFmpeg: {}", e))?;
        *initialized = true;
    }
    
    Ok(())
}

/// 获取视频信息
#[tauri::command]
pub async fn get_video_info(app: AppHandle, path: String) -> Result<VideoInfo, String> {
    let ffprobe_cmd = ffmpeg::path::get_ffprobe_command(&app);
    ffmpeg::handler::get_video_info(&path, &ffprobe_cmd)
        .map_err(|e| format!("Failed to get video info: {}", e))
}

/// 提取视频帧
#[tauri::command]
pub async fn extract_frame(
    app: AppHandle,
    path: String,
    timestamp: f64,
    output_path: String,
) -> Result<(), String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::extract_frame(&path, timestamp, &output_path, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to extract frame: {}", e))
}

/// 提取视频帧到临时文件并返回文件路径（推荐）
#[tauri::command]
pub async fn extract_frame_to_temp(
    app: AppHandle,
    path: String,
    timestamp: f64,
) -> Result<String, String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::extract_frame_to_temp(&path, timestamp, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to extract frame: {}", e))
}

/// 提取视频帧并返回 base64 编码的数据 URL
#[tauri::command]
pub async fn extract_frame_to_base64(
    app: AppHandle,
    path: String,
    timestamp: f64,
) -> Result<String, String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::extract_frame_to_base64(&path, timestamp, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to extract frame: {}", e))
}

/// 裁剪视频
#[tauri::command]
pub async fn trim_video(
    app: AppHandle,
    input_path: String,
    start: f64,
    duration: f64,
    output_path: String,
) -> Result<(), String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::trim_video(&input_path, start, duration, &output_path, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to trim video: {}", e))
}

/// 合并视频
#[tauri::command]
pub async fn merge_videos(
    app: AppHandle,
    input_paths: Vec<String>,
    output_path: String,
) -> Result<(), String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::merge_videos(input_paths, &output_path, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to merge videos: {}", e))
}

/// 批量提取视频帧
#[tauri::command]
pub async fn batch_extract_frames(
    app: AppHandle,
    path: String,
    timestamps: Vec<f64>,
    output_dir: String,
) -> Result<(), String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    ffmpeg::handler::batch_extract_frames(&path, timestamps, &output_dir, &ffmpeg_cmd)
        .map_err(|e| format!("Failed to batch extract frames: {}", e))
}

/// 流式解码视频帧（返回 base64 编码的 JPEG）
#[tauri::command]
pub async fn stream_decode_frame(
    app: AppHandle,
    path: String,
    timestamp: f64,
) -> Result<String, String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    let streamer = ffmpeg::VideoStreamer::new(ffmpeg_cmd);
    
    let frame_data = streamer.decode_frame(&path, timestamp)
        .map_err(|e| format!("Failed to decode frame: {}", e))?;

    // 编码为 base64
    use base64::{Engine as _, engine::general_purpose};
    let base64_str = general_purpose::STANDARD.encode(&frame_data);
    
    Ok(format!("data:image/jpeg;base64,{}", base64_str))
}

/// 启动 WebSocket 服务器
#[tauri::command]
pub async fn start_websocket_server(app: AppHandle) -> Result<String, String> {
    let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app);
    let mut server = crate::server::WebSocketServer::new(ffmpeg_cmd);

    server
        .start("127.0.0.1:9001")
        .await
        .map_err(|e| format!("Failed to start WebSocket server: {}", e))?;

    // 在后台接受连接
    tokio::spawn(async move {
        loop {
            if let Err(e) = server.accept_connection().await {
                eprintln!("Error accepting connection: {}", e);
            }
        }
    });

    Ok("WebSocket server started on ws://127.0.0.1:9001".to_string())
}


/// 保存项目到 .hpve 文件
#[tauri::command]
pub async fn save_project(
    project_data: serde_json::Value,
    file_path: String,
    password: Option<String>,
    compress: Option<bool>,
) -> Result<(), String> {
    let options = crate::project::SaveOptions {
        password,
        compress: compress.unwrap_or(true),
        include_cache: true,
        encryption_level: crate::project::EncryptionLevel::Standard,
    };

    crate::project::save_project(&project_data, &file_path, options)
        .map_err(|e| format!("Failed to save project: {}", e))
}

/// 加载项目从 .hpve 文件
#[tauri::command]
pub async fn load_project(
    file_path: String,
    password: Option<String>,
) -> Result<serde_json::Value, String> {
    crate::project::load_project(&file_path, password.as_deref())
        .map_err(|e| format!("Failed to load project: {}", e))
}

/// 验证 .hpve 文件格式
#[tauri::command]
pub async fn validate_hpve_file(file_path: String) -> Result<bool, String> {
    crate::project::validate_hpve_file(&file_path)
        .map_err(|e| format!("Failed to validate file: {}", e))
}

/// 复制媒体文件到应用 temp 文件夹
#[tauri::command]
pub async fn copy_media_to_temp(
    app: AppHandle,
    source_path: String,
) -> Result<String, String> {
    // 获取应用数据目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let manager = crate::media::MediaManager::new(app_data_dir)
        .map_err(|e| format!("Failed to create media manager: {}", e))?;

    manager.copy_media_to_temp(&source_path)
        .map_err(|e| format!("Failed to copy media: {}", e))
}

/// 获取 temp 文件夹大小
#[tauri::command]
pub async fn get_temp_size(app: AppHandle) -> Result<u64, String> {
    // 获取应用数据目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let manager = crate::media::MediaManager::new(app_data_dir)
        .map_err(|e| format!("Failed to create media manager: {}", e))?;

    manager.get_temp_size()
        .map_err(|e| format!("Failed to get temp size: {}", e))
}

/// 清理 temp 文件夹中的过期文件
#[tauri::command]
pub async fn cleanup_temp_files(
    app: AppHandle,
    keep_files: Vec<String>,
) -> Result<(), String> {
    // 获取应用数据目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let manager = crate::media::MediaManager::new(app_data_dir)
        .map_err(|e| format!("Failed to create media manager: {}", e))?;

    manager.cleanup_temp(&keep_files)
        .map_err(|e| format!("Failed to cleanup temp: {}", e))
}

/// 删除 temp 文件夹中的特定文件
#[tauri::command]
pub async fn remove_media_from_temp(
    app: AppHandle,
    relative_path: String,
) -> Result<(), String> {
    // 获取应用数据目录
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let manager = crate::media::MediaManager::new(app_data_dir)
        .map_err(|e| format!("Failed to create media manager: {}", e))?;

    manager.remove_media_from_temp(&relative_path)
        .map_err(|e| format!("Failed to remove media: {}", e))
}
