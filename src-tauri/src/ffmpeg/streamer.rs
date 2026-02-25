use std::process::{Command, Stdio};
use std::io::Read;
use anyhow::{Context, Result};

/// 视频流解码器 - 用于实时解码视频帧
pub struct VideoStreamer {
    ffmpeg_cmd: String,
}

impl VideoStreamer {
    pub fn new(ffmpeg_cmd: String) -> Self {
        Self { ffmpeg_cmd }
    }

    /// 流式解码视频，返回 JPEG 帧数据
    /// 
    /// # Arguments
    /// * `path` - 视频文件路径
    /// * `timestamp` - 要解码的时间戳（秒）
    /// 
    /// # Returns
    /// JPEG 帧的原始字节数据
    pub fn decode_frame(&self, path: &str, timestamp: f64) -> Result<Vec<u8>> {
        let mut child = Command::new(&self.ffmpeg_cmd)
            .args([
                "-ss", &timestamp.to_string(),
                "-i", path,
                "-vframes", "1",
                "-vf", "scale=1280:-1",
                "-q:v", "5",
                "-f", "image2",
                "-c:v", "mjpeg",
                "pipe:1",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .context("Failed to spawn ffmpeg process")?;

        let mut stdout = child.stdout.take().context("Failed to get stdout")?;
        let mut buffer = Vec::new();
        stdout.read_to_end(&mut buffer)
            .context("Failed to read ffmpeg output")?;

        child.wait().context("Failed to wait for ffmpeg")?;

        if buffer.is_empty() {
            anyhow::bail!("No frame data received from ffmpeg");
        }

        Ok(buffer)
    }

    /// 流式解码视频帧到临时文件
    #[allow(dead_code)]
    pub fn decode_frame_to_file(&self, path: &str, timestamp: f64) -> Result<String> {
        // 创建临时文件
        let temp_dir = std::env::temp_dir();
        let filename = format!(
            "video_frame_{}_{}.jpg",
            std::path::Path::new(path)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown"),
            timestamp.to_string().replace('.', "_")
        );
        let temp_file = temp_dir.join(&filename);
        let temp_path = temp_file.to_str().context("Invalid temp path")?;

        // 使用 FFmpeg 直接输出到文件
        let status = Command::new(&self.ffmpeg_cmd)
            .args([
                "-ss", &timestamp.to_string(),
                "-i", path,
                "-vframes", "1",
                "-vf", "scale=1280:-1",
                "-q:v", "5",
                "-y",
                temp_path,
            ])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .context("Failed to execute ffmpeg command")?;

        if !status.success() {
            anyhow::bail!("FFmpeg decode command failed");
        }

        Ok(temp_file.to_string_lossy().to_string())
    }

    /// 获取视频的总帧数
    #[allow(dead_code)]
    pub fn get_frame_count(&self, path: &str, _fps: f64) -> Result<u32> {
        let output = Command::new(&self.ffmpeg_cmd)
            .args([
                "-v", "error",
                "-select_streams", "v:0",
                "-count_packets",
                "-show_entries", "stream=nb_read_packets",
                "-of", "csv=p=0",
                path,
            ])
            .output()
            .context("Failed to execute ffprobe")?;

        if !output.status.success() {
            anyhow::bail!("Failed to get frame count");
        }

        let output_str = String::from_utf8_lossy(&output.stdout);
        let frame_count: u32 = output_str.trim().parse().unwrap_or(0);

        Ok(frame_count)
    }
}
