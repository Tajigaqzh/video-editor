// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod ffmpeg_handler;
mod ffmpeg_path;
mod commands;

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
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::init_ffmpeg,
            commands::get_video_info,
            commands::extract_frame,
            commands::extract_frame_to_temp,
            commands::extract_frame_to_base64,
            commands::trim_video,
            commands::merge_videos,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
