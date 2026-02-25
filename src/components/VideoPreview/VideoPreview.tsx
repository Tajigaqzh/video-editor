import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Application, Container, Sprite, Assets } from 'pixi.js';
import { invoke } from '@tauri-apps/api/core';
import { useTimelineStore } from '@/store/timelineStore';

interface VideoPreviewProps {
  width?: number;
  height?: number;
}

const VideoPreview: React.FC<VideoPreviewProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const videoLayerRef = useRef<Container | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 1280, height: 720 });
  const [frameCache, setFrameCache] = useState<Map<string, string>>(new Map());
  
  // 先从 store 获取数据
  const { project, playheadPosition, setPlayheadPosition } = useTimelineStore();
  
  // 然后创建 refs
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const isDecodingRef = useRef(false);
  const playheadPositionRef = useRef(playheadPosition);
  const frameCacheRef = useRef<Map<string, string>>(frameCache);

  // 同步 playheadPosition ref
  useEffect(() => {
    playheadPositionRef.current = playheadPosition;
  }, [playheadPosition]);

  // 同步 frameCache ref
  useEffect(() => {
    frameCacheRef.current = frameCache;
  }, [frameCache]);

  // 获取当前活跃的视频片段
  const activeVideoClip = project.tracks
    .find(track => track.type === 'video')
    ?.clips.find(clip => {
      const clipEnd = clip.startTime + clip.duration;
      return playheadPosition >= clip.startTime && playheadPosition < clipEnd;
    });

  // 初始化 PixiJS
  useEffect(() => {
    if (!canvasRef.current || appRef.current) return;

    const initPixi = async () => {
      try {
        const app = new Application();
        await app.init({
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundColor: 0x000000,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        if (canvasRef.current) {
          canvasRef.current.innerHTML = '';
          canvasRef.current.appendChild(app.canvas);
          appRef.current = app;

          const videoLayer = new Container();
          app.stage.addChild(videoLayer);
          videoLayerRef.current = videoLayer;

          setIsReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize PixiJS:', error);
      }
    };

    initPixi();

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        videoLayerRef.current = null;
      }
    };
  }, []);

  // 监听容器大小变化（带防抖）
  useEffect(() => {
    if (!containerRef.current) return;

    let resizeTimeout: NodeJS.Timeout | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      // 清除之前的防抖计时器
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      // 防抖：等待 100ms 后再处理
      resizeTimeout = setTimeout(() => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          
          const controlBarHeight = 60;
          const padding = 80;
          const availableWidth = width - padding;
          const availableHeight = height - controlBarHeight - padding;
          
          const aspectRatio = 16 / 9;
          let newWidth = availableWidth;
          let newHeight = availableWidth / aspectRatio;
          
          if (newHeight > availableHeight) {
            newHeight = availableHeight;
            newWidth = availableHeight * aspectRatio;
          }
          
          const newSize = {
            width: Math.floor(newWidth),
            height: Math.floor(newHeight),
          };
          
          setCanvasSize(newSize);

          // 调整 PixiJS 渲染器大小
          if (appRef.current) {
            appRef.current.renderer.resize(newSize.width, newSize.height);
          }
        }
      }, 100);
    });

    resizeObserver.observe(containerRef.current);
    
    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeObserver.disconnect();
    };
  }, []);

  // 流式解码并渲染帧
  const renderFrame = useCallback(async (timestamp: number) => {
    if (!activeVideoClip || !videoLayerRef.current || isDecodingRef.current) return;

    isDecodingRef.current = true;

    try {
      // 从 Media 对象中获取文件路径
      const media = project.media.find(m => m.id === activeVideoClip.mediaId);
      if (!media) {
        console.warn('Media not found in project.media:', activeVideoClip.mediaId);
        return;
      }

      const cacheKey = `${timestamp.toFixed(2)}`;
      let frameDataUrl = frameCacheRef.current.get(cacheKey);

      // 如果缓存中没有，则从后端解码
      if (!frameDataUrl) {
        const filePath = media.originalPath || media.path;
        frameDataUrl = await invoke<string>('stream_decode_frame', {
          path: filePath,
          timestamp,
        });
        
        // 缓存新帧
        setFrameCache(prev => new Map(prev).set(cacheKey, frameDataUrl));
      }

      // 加载纹理
      const texture = await Assets.load(frameDataUrl);
      
      // 清空旧帧
      videoLayerRef.current.removeChildren();

      // 创建精灵
      const sprite = new Sprite(texture);
      
      // 计算缩放和位置
      if (texture.source && texture.source.width > 0 && texture.source.height > 0) {
        const textureWidth = texture.source.width;
        const textureHeight = texture.source.height;
        
        const scaleX = canvasSize.width / textureWidth;
        const scaleY = canvasSize.height / textureHeight;
        const scale = Math.min(scaleX, scaleY);
        
        sprite.scale.set(scale);
        sprite.x = (canvasSize.width - textureWidth * scale) / 2;
        sprite.y = (canvasSize.height - textureHeight * scale) / 2;
      }

      videoLayerRef.current.addChild(sprite);
    } catch (error) {
      console.error('Failed to render frame:', error);
    } finally {
      isDecodingRef.current = false;
    }
  }, [activeVideoClip, project.media, canvasSize]);

  // 播放循环
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // 转换为秒
      lastTime = currentTime;

      const newTime = playheadPositionRef.current + deltaTime;

      // 获取所有视频轨道的素材
      const videoClips = project.tracks
        .filter(track => track.type === 'video')
        .flatMap(track => track.clips);

      if (videoClips.length === 0) {
        setIsPlaying(false);
        return;
      }

      // 找到最后一个素材的结束时间
      const maxEndTime = Math.max(...videoClips.map(c => c.startTime + c.duration));

      // 如果播放到了所有素材的末尾，停止播放
      if (newTime >= maxEndTime) {
        setIsPlaying(false);
        setPlayheadPosition(maxEndTime);
        return;
      }

      // 继续播放（无论是否在素材内）
      setPlayheadPosition(newTime);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, project, setPlayheadPosition]);

  // 同步播放头位置到画布
  useEffect(() => {
    if (!isReady) return;

    if (!activeVideoClip) {
      // 没有活跃素材，清空画布显示空白
      if (videoLayerRef.current) {
        videoLayerRef.current.removeChildren();
      }
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const clipTime = playheadPosition - activeVideoClip.startTime;
    setCurrentTime(clipTime);
    setDuration(activeVideoClip.duration);

    // 节流：限制渲染频率
    const now = performance.now();
    if (now - lastFrameTimeRef.current > 33) { // ~30fps
      lastFrameTimeRef.current = now;
      renderFrame(clipTime);
    }
  }, [playheadPosition, activeVideoClip, isReady]);

  // 播放/暂停
  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  // 流式抽帧 - 在播放时后台抽取后续帧
  useEffect(() => {
    if (!isPlaying || !activeVideoClip) return;

    const media = project.media.find(m => m.id === activeVideoClip.mediaId);
    if (!media) return;

    // 每隔 100ms 抽取一次后续帧
    const extractInterval = setInterval(async () => {
      const nextFrameTime = playheadPositionRef.current - activeVideoClip.startTime + 0.5; // 提前 0.5 秒抽取
      
      // 检查是否已经缓存过这个时间的帧
      const cacheKey = `${nextFrameTime.toFixed(2)}`;
      if (frameCacheRef.current.has(cacheKey)) {
        return;
      }

      try {
        const frameDataUrl = await invoke<string>('stream_decode_frame', {
          path: media.originalPath || media.path,
          timestamp: nextFrameTime,
        });
        
        // 缓存新抽取的帧
        setFrameCache(prev => new Map(prev).set(cacheKey, frameDataUrl));
        console.log('✅ Frame extracted at', nextFrameTime.toFixed(2), 's');
      } catch (err) {
        console.warn('Frame extraction failed at', nextFrameTime.toFixed(2), 's:', err);
      }
    }, 100); // 每 100ms 检查一次

    return () => clearInterval(extractInterval);
  }, [isPlaying, activeVideoClip, project.media]);

  // 上一秒
  const handlePreviousSecond = () => {
    if (activeVideoClip) {
      setPlayheadPosition(Math.max(activeVideoClip.startTime, playheadPosition - 1));
    }
  };

  // 下一秒
  const handleNextSecond = () => {
    if (activeVideoClip) {
      const maxTime = activeVideoClip.startTime + activeVideoClip.duration;
      setPlayheadPosition(Math.min(maxTime, playheadPosition + 1));
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousSecond();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextSecond();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, activeVideoClip, playheadPosition]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex flex-col"
      style={{ backgroundColor: '#141414' }}
    >
      {/* Canvas 显示区域 */}
      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#000' }}
      >
        <div
          ref={canvasRef}
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
          }}
        />
      </div>

      {/* 控制栏 */}
      <div
        style={{
          height: '60px',
          backgroundColor: '#1a1a1a',
          borderTop: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: '20px',
          paddingRight: '20px',
          gap: '20px',
        }}
      >
        {/* 上一秒按钮 */}
        <button
          onClick={handlePreviousSecond}
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#333',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'}
          title="上一秒 (←)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        {/* 播放/暂停按钮 */}
        <button
          onClick={handleTogglePlay}
          style={{
            width: '48px',
            height: '48px',
            backgroundColor: '#1976d2',
            border: 'none',
            borderRadius: '50%',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1565c0'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1976d2'}
          title={isPlaying ? '暂停 (Space)' : '播放 (Space)'}
        >
          {!isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          )}
        </button>

        {/* 下一秒按钮 */}
        <button
          onClick={handleNextSecond}
          style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#333',
            border: 'none',
            borderRadius: '4px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'}
          title="下一秒 (→)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>

        {/* 时间显示 */}
        <div
          style={{
            color: '#aaa',
            fontSize: '14px',
            fontFamily: 'monospace',
            minWidth: '100px',
          }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export default VideoPreview;
