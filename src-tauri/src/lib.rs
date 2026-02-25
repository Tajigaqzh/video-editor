// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod ffmpeg;
mod server;
mod commands;
pub mod project;
pub mod media;

use commands::AppState;
use std::sync::Mutex;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            ffmpeg_initialized: Mutex::new(false),
        })
        .setup(|app| {
            // 启动 WebSocket 服务器
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let ffmpeg_cmd = ffmpeg::path::get_ffmpeg_command(&app_handle);
                let mut server = server::WebSocketServer::new(ffmpeg_cmd);

                if let Err(e) = server.start("127.0.0.1:9001").await {
                    eprintln!("Failed to start WebSocket server: {}", e);
                    return;
                }

                println!("✅ WebSocket server started on ws://127.0.0.1:9001");

                // 在后台接受连接
                loop {
                    if let Err(e) = server.accept_connection().await {
                        eprintln!("Error accepting connection: {}", e);
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::init_ffmpeg,
            commands::get_video_info,
            commands::extract_frame,
            commands::extract_frame_to_temp,
            commands::extract_frame_to_base64,
            commands::trim_video,
            commands::merge_videos,
            commands::batch_extract_frames,
            commands::stream_decode_frame,
            commands::start_websocket_server,
            commands::save_project,
            commands::load_project,
            commands::validate_hpve_file,
            commands::copy_media_to_temp,
            commands::get_temp_size,
            commands::cleanup_temp_files,
            commands::remove_media_from_temp,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
