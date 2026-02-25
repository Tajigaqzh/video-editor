# Windows PowerShell 脚本：为 Windows 打包 FFmpeg 二进制文件

Write-Host "Bundling FFmpeg for Windows" -ForegroundColor Cyan

# 创建资源目录
$resourceDir = "src-tauri/resources/bin"
if (-not (Test-Path $resourceDir)) {
    New-Item -ItemType Directory -Path $resourceDir -Force | Out-Null
}

# 查找 FFmpeg
$ffmpegPath = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source
$ffprobePath = (Get-Command ffprobe -ErrorAction SilentlyContinue).Source

if ($ffmpegPath) {
    Copy-Item $ffmpegPath "$resourceDir/ffmpeg.exe" -Force
    Write-Host "✓ FFmpeg bundled from $ffmpegPath" -ForegroundColor Green
} else {
    Write-Host "✗ FFmpeg not found in PATH" -ForegroundColor Red
    Write-Host "Please ensure FFmpeg is installed and added to PATH" -ForegroundColor Yellow
    exit 1
}

if ($ffprobePath) {
    Copy-Item $ffprobePath "$resourceDir/ffprobe.exe" -Force
    Write-Host "✓ FFprobe bundled from $ffprobePath" -ForegroundColor Green
} else {
    Write-Host "⚠ FFprobe not found (optional)" -ForegroundColor Yellow
}

Write-Host "FFmpeg bundled successfully" -ForegroundColor Green
