@echo off
REM Windows CMD 脚本：为 Windows 打包 FFmpeg 二进制文件

echo Bundling FFmpeg for Windows

REM 创建资源目录
if not exist "src-tauri\resources\bin" mkdir "src-tauri\resources\bin"

REM 查找 FFmpeg
where ffmpeg >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('where ffmpeg') do (
        copy "%%i" "src-tauri\resources\bin\ffmpeg.exe" >nul
        echo [OK] FFmpeg bundled from %%i
        goto :ffprobe
    )
) else (
    echo [ERROR] FFmpeg not found in PATH
    echo Please ensure FFmpeg is installed and added to PATH
    exit /b 1
)

:ffprobe
where ffprobe >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('where ffprobe') do (
        copy "%%i" "src-tauri\resources\bin\ffprobe.exe" >nul
        echo [OK] FFprobe bundled from %%i
        goto :done
    )
) else (
    echo [WARNING] FFprobe not found (optional)
)

:done
echo FFmpeg bundled successfully
exit /b 0
