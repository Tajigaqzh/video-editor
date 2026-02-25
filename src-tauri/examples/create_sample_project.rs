use serde_json::json;
use std::path::Path;

fn main() -> anyhow::Result<()> {
    // 创建示例项目数据
    let project = json!({
        "metadata": {
            "name": "Sample Video Project",
            "description": "A sample video editing project created with HPVE format",
            "version": "1.0.0",
            "createdAt": "2024-02-25T10:00:00Z",
            "modifiedAt": "2024-02-25T15:30:00Z"
        },
        "timeline": {
            "fps": 30,
            "resolution": {
                "width": 1920,
                "height": 1080
            },
            "duration": 15.0,
            "playheadPosition": 0
        },
        "media": [
            {
                "id": "media_001",
                "name": "sample_video.mp4",
                "type": "video",
                "path": "/path/to/sample_video.mp4",
                "duration": 10.5,
                "width": 1920,
                "height": 1080,
                "fps": 30,
                "codec": "h264",
                "fileSize": 52428800,
                "createdAt": "2024-02-25T10:00:00Z"
            },
            {
                "id": "media_002",
                "name": "background_music.mp3",
                "type": "audio",
                "path": "/path/to/background_music.mp3",
                "duration": 15.0,
                "codec": "aac",
                "fileSize": 2097152,
                "createdAt": "2024-02-25T10:05:00Z"
            }
        ],
        "tracks": [
            {
                "id": "track_video_001",
                "name": "Video Track 1",
                "type": "video",
                "order": 1,
                "height": 100,
                "visible": true,
                "locked": false,
                "clips": [
                    {
                        "id": "clip_001",
                        "mediaId": "media_001",
                        "trackId": "track_video_001",
                        "startTime": 0,
                        "duration": 5,
                        "trimStart": 0,
                        "trimEnd": 5,
                        "position": { "x": 0, "y": 0 },
                        "scale": { "x": 1.0, "y": 1.0 },
                        "rotation": 0,
                        "opacity": 1.0,
                        "effects": []
                    },
                    {
                        "id": "clip_002",
                        "mediaId": "media_001",
                        "trackId": "track_video_001",
                        "startTime": 6,
                        "duration": 4.5,
                        "trimStart": 5,
                        "trimEnd": 9.5,
                        "position": { "x": 0, "y": 0 },
                        "scale": { "x": 1.0, "y": 1.0 },
                        "rotation": 0,
                        "opacity": 1.0,
                        "effects": [
                            {
                                "id": "effect_001",
                                "type": "brightness",
                                "enabled": true,
                                "params": {
                                    "value": 1.2
                                }
                            }
                        ]
                    }
                ],
                "transitions": [
                    {
                        "id": "transition_001",
                        "type": "fade",
                        "duration": 0.5,
                        "fromClipId": "clip_001",
                        "toClipId": "clip_002",
                        "params": {
                            "easing": "easeInOut"
                        }
                    }
                ]
            },
            {
                "id": "track_audio_001",
                "name": "Audio Track 1",
                "type": "audio",
                "order": 2,
                "height": 60,
                "visible": true,
                "locked": false,
                "clips": [
                    {
                        "id": "audio_clip_001",
                        "mediaId": "media_002",
                        "trackId": "track_audio_001",
                        "startTime": 0,
                        "duration": 15.0,
                        "trimStart": 0,
                        "trimEnd": 15.0,
                        "effects": [
                            {
                                "id": "audio_effect_001",
                                "type": "volume",
                                "enabled": true,
                                "params": {
                                    "volume": 0.8
                                }
                            }
                        ]
                    }
                ],
                "transitions": []
            }
        ],
        "settings": {
            "autoSave": true,
            "autoSaveInterval": 300,
            "snapToGrid": true,
            "snapThreshold": 5,
            "showRuler": true,
            "showGuides": true,
            "defaultTransitionDuration": 0.5,
            "theme": "dark"
        },
        "history": {
            "undoStack": [],
            "redoStack": [],
            "maxHistorySize": 100
        }
    });

    // 保存选项
    let options = video_editor_lib::project::SaveOptions {
        password: Some("demo123".to_string()),
        compress: true,
        include_cache: true,
        encryption_level: video_editor_lib::project::EncryptionLevel::Standard,
    };

    // 保存项目
    let output_path = "sample_project.hpve";
    video_editor_lib::project::save_project(&project, output_path, options)?;

    println!("✅ Sample project created: {}", output_path);
    println!("📦 File size: {} bytes", std::fs::metadata(output_path)?.len());
    println!("🔐 Password: demo123");
    println!("📝 Project name: Sample Video Project");

    // 验证文件
    let is_valid = video_editor_lib::project::validate_hpve_file(output_path)?;
    println!("✓ File validation: {}", if is_valid { "PASSED" } else { "FAILED" });

    // 尝试加载文件
    match video_editor_lib::project::load_project(output_path, Some("demo123")) {
        Ok(loaded) => {
            println!("✓ File loaded successfully");
            if let Some(name) = loaded.get("metadata").and_then(|m| m.get("name")) {
                println!("  Project name: {}", name);
            }
        }
        Err(e) => {
            println!("✗ Failed to load file: {}", e);
        }
    }

    Ok(())
}
