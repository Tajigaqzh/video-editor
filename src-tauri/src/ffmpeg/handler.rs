use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoInfo {
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub codec: String,
    pub bitrate: i64,
    pub has_audio: bool,
}

/// 初始化 FFmpeg（检查是否可用）
pub fn init_ffmpeg(ffmpeg_cmd: &str) -> Result<()> {
    let output = Command::new(ffmpeg_cmd)
        .arg("-version")
        .output()
        .context("Failed to execute ffmpeg")?;

    if !output.status.success() {
        anyhow::bail!("FFmpeg is not available");
    }

    Ok(())
}

/// 获取视频信息（使用 ffprobe）
pub fn get_video_info(path: &str, ffprobe_cmd: &str) -> Result<VideoInfo> {
    let output = Command::new(ffprobe_cmd)
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            path,
        ])
        .output()
        .context("Failed to execute ffprobe")?;

    if !output.status.success() {
        anyhow::bail!("FFprobe command failed");
    }

    let json: serde_json::Value = serde_json::from_slice(&output.stdout)
        .context("Failed to parse ffprobe output")?;

    // 解析视频流
    let video_stream = json["streams"]
        .as_array()
        .and_then(|streams| {
            streams.iter().find(|s| s["codec_type"] == "video")
        })
        .context("No video stream found")?;

    // 解析音频流
    let has_audio = json["streams"]
        .as_array()
        .map(|streams| {
            streams.iter().any(|s| s["codec_type"] == "audio")
        })
        .unwrap_or(false);

    let duration = json["format"]["duration"]
        .as_str()
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);

    let width = video_stream["width"].as_u64().unwrap_or(0) as u32;
    let height = video_stream["height"].as_u64().unwrap_or(0) as u32;
    
    let fps_str = video_stream["r_frame_rate"].as_str().unwrap_or("0/1");
    let fps = parse_fps(fps_str);

    let codec = video_stream["codec_name"]
        .as_str()
        .unwrap_or("unknown")
        .to_string();

    let bitrate = json["format"]["bit_rate"]
        .as_str()
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(0);

    Ok(VideoInfo {
        duration,
        width,
        height,
        fps,
        codec,
        bitrate,
        has_audio,
    })
}

/// 解析帧率字符串 (如 "30/1" -> 30.0)
fn parse_fps(fps_str: &str) -> f64 {
    let parts: Vec<&str> = fps_str.split('/').collect();
    if parts.len() == 2 {
        if let (Ok(num), Ok(den)) = (parts[0].parse::<f64>(), parts[1].parse::<f64>()) {
            if den != 0.0 {
                return num / den;
            }
        }
    }
    0.0
}

/// 提取视频帧（用于缩略图）
pub fn extract_frame(path: &str, timestamp: f64, output_path: &str, ffmpeg_cmd: &str) -> Result<()> {
    let status = Command::new(ffmpeg_cmd)
        .args([
            "-ss", &timestamp.to_string(),
            "-i", path,
            "-vframes", "1",
            "-q:v", "2",
            "-y",
            output_path,
        ])
        .status()
        .context("Failed to execute ffmpeg command")?;

    if !status.success() {
        anyhow::bail!("FFmpeg extract frame command failed");
    }

    Ok(())
}

/// 提取视频帧到临时文件并返回文件路径（推荐使用，避免 base64 编码开销）
pub fn extract_frame_to_temp(path: &str, timestamp: f64, ffmpeg_cmd: &str) -> Result<String> {
    // 创建临时文件路径
    let temp_dir = std::env::temp_dir();
    let filename = format!("video_frame_{}_{}.jpg", 
        std::path::Path::new(path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown"),
        timestamp.to_string().replace('.', "_")
    );
    let temp_file = temp_dir.join(filename);
    let temp_path = temp_file.to_str().context("Invalid temp path")?;
    
    // 优化的 FFmpeg 命令：
    // 1. -ss 在 -i 之前：输入端 seek，速度更快
    // 2. -threads 1：单线程解码，减少开销
    // 3. -vf scale=640:-1：缩小到 640 宽度（预览足够）
    // 4. -q:v 8：降低质量，加快编码（2-31，越大质量越低）
    // 5. -update 1：告诉 FFmpeg 这是单帧输出，消除警告
    let status = Command::new(ffmpeg_cmd)
        .args([
            "-ss", &timestamp.to_string(),      // 输入端 seek（快速）
            "-i", path,
            "-vframes", "1",                     // 只提取一帧
            "-vf", "scale=640:-1",               // 缩放到 640 宽度（预览用）
            "-q:v", "8",                         // JPEG 质量（降低以加快速度）
            "-threads", "1",                     // 单线程
            "-update", "1",                      // 单帧输出模式
            "-y",
            temp_path,
        ])
        .status()
        .context("Failed to execute ffmpeg command")?;

    if !status.success() {
        anyhow::bail!("FFmpeg extract frame command failed");
    }

    // 返回文件路径
    Ok(temp_file.to_string_lossy().to_string())
}

/// 提取视频帧并返回 base64 编码的 JPEG 数据
pub fn extract_frame_to_base64(path: &str, timestamp: f64, ffmpeg_cmd: &str) -> Result<String> {
    // 先提取到临时文件
    let temp_path = extract_frame_to_temp(path, timestamp, ffmpeg_cmd)?;
    
    // 读取文件内容
    let buffer = std::fs::read(&temp_path)
        .context("Failed to read extracted frame")?;
    
    // 编码为 base64
    let base64_str = general_purpose::STANDARD.encode(&buffer);
    
    // 删除临时文件
    std::fs::remove_file(&temp_path).ok();
    
    // 返回 data URL
    Ok(format!("data:image/jpeg;base64,{}", base64_str))
}

/// 裁剪视频
pub fn trim_video(input_path: &str, start: f64, duration: f64, output_path: &str, ffmpeg_cmd: &str) -> Result<()> {
    let status = Command::new(ffmpeg_cmd)
        .args([
            "-i", input_path,
            "-ss", &start.to_string(),
            "-t", &duration.to_string(),
            "-c", "copy",
            "-y",
            output_path,
        ])
        .status()
        .context("Failed to execute ffmpeg command")?;

    if !status.success() {
        anyhow::bail!("FFmpeg command failed");
    }

    Ok(())
}

/// 合并多个视频
pub fn merge_videos(input_paths: Vec<String>, output_path: &str, ffmpeg_cmd: &str) -> Result<()> {
    use std::fs::File;
    use std::io::Write;

    // 创建临时文件列表
    let list_path = std::env::temp_dir().join("ffmpeg_concat_list.txt");
    let mut file = File::create(&list_path)?;
    
    for path in input_paths {
        writeln!(file, "file '{}'", path)?;
    }
    
    drop(file);

    // 使用 concat demuxer 合并
    let status = Command::new(ffmpeg_cmd)
        .args([
            "-f", "concat",
            "-safe", "0",
            "-i", list_path.to_str().unwrap(),
            "-c", "copy",
            "-y",
            output_path,
        ])
        .status()
        .context("Failed to execute ffmpeg command")?;

    // 清理临时文件
    std::fs::remove_file(list_path).ok();

    if !status.success() {
        anyhow::bail!("FFmpeg merge command failed");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_fps() {
        assert_eq!(parse_fps("30/1"), 30.0);
        assert_eq!(parse_fps("24000/1001"), 23.976023976023978);
        assert_eq!(parse_fps("invalid"), 0.0);
    }
}

/// 批量提取视频帧
pub fn batch_extract_frames(
    path: &str,
    timestamps: Vec<f64>,
    output_dir: &str,
    ffmpeg_cmd: &str,
) -> Result<()> {
    use std::fs;
    use std::path::Path;

    // 创建输出目录
    fs::create_dir_all(output_dir)
        .context("Failed to create output directory")?;

    // 如果没有时间戳，直接返回
    if timestamps.is_empty() {
        return Ok(());
    }

    // 使用 FFmpeg 的 fps filter 一次性提取所有帧
    let fps = if timestamps.len() > 1 {
        let max_timestamp = timestamps.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        if max_timestamp > 0.0 {
            timestamps.len() as f64 / max_timestamp
        } else {
            1.0
        }
    } else {
        1.0
    };

    // 生成输出文件名模式（使用 %04d 确保文件名一致）
    let output_pattern = if output_dir.ends_with('/') || output_dir.ends_with('\\') {
        format!("{}frame_%04d.jpg", output_dir)
    } else {
        format!("{}/frame_%04d.jpg", output_dir)
    };

    let status = Command::new(ffmpeg_cmd)
        .args([
            "-i", path,
            "-vf", &format!("fps={},scale=640:-1", fps),
            "-q:v", "8",
            "-y",
            &output_pattern,
        ])
        .status()
        .context("Failed to execute ffmpeg command")?;

    if !status.success() {
        anyhow::bail!("FFmpeg batch extract command failed");
    }

    // 重命名文件为指定的时间戳格式
    let output_path = Path::new(output_dir);
    let mut frame_index = 0;

    if let Ok(entries) = fs::read_dir(output_path) {
        let mut files: Vec<_> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path()
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s == "jpg")
                    .unwrap_or(false)
            })
            .collect();

        // 按文件名排序
        files.sort_by_key(|e| e.path());

        for entry in files {
            let path = entry.path();
            if frame_index < timestamps.len() {
                let timestamp = timestamps[frame_index];
                let new_name = format!("frame_{:.1}.jpg", timestamp);
                let new_path = output_path.join(&new_name);

                // 如果新文件已存在，先删除
                let _ = fs::remove_file(&new_path);

                if let Err(e) = fs::rename(&path, &new_path) {
                    eprintln!("Warning: Failed to rename frame file: {}", e);
                }

                frame_index += 1;
            }
        }
    }

    Ok(())
}
