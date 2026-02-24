import React, { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, TextStyle, Sprite, Texture, Assets } from 'pixi.js';
import { useTimelineStore } from '@/store/timelineStore';
import { extractVideoFrame } from '@/utils/ffmpeg';

interface VideoPreviewProps {
  width?: number;
  height?: number;
}

const VideoPreview: React.FC<VideoPreviewProps> = ({ 
  width: initialWidth = 1920, 
  height: initialHeight = 1080 
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const mainContainerRef = useRef<Container | null>(null);
  const videoLayerRef = useRef<Container | null>(null);
  const [isReady, setIsReady] = useState(false);
  const initializingRef = useRef(false);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const frameCache = useRef<Map<string, string>>(new Map()); // 缓存提取的帧
  const [isPlaying, setIsPlaying] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: initialWidth, height: initialHeight });
  const extractingRef = useRef<Set<string>>(new Set()); // 正在提取的帧
  const lastRenderTimeRef = useRef<number>(0); // 上次渲染时间
  
  const { playheadPosition, clips, tracks, setPlayheadPosition } = useTimelineStore();

  // 监听容器大小变化，自适应调整 canvas 尺寸
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        
        // 控制栏高度
        const controlBarHeight = 60;
        // 留出更多边距（上下左右各 40px）
        const padding = 80;
        const availableWidth = width - padding;
        const availableHeight = height - controlBarHeight - padding;
        
        // 保持 16:9 的宽高比
        const aspectRatio = 16 / 9;
        let newWidth = availableWidth;
        let newHeight = availableWidth / aspectRatio;
        
        if (newHeight > availableHeight) {
          newHeight = availableHeight;
          newWidth = availableHeight * aspectRatio;
        }
        
        setCanvasSize({
          width: Math.floor(newWidth),
          height: Math.floor(newHeight),
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 当 canvas 尺寸变化时，调整 PixiJS 应用大小
  useEffect(() => {
    if (appRef.current && isReady) {
      appRef.current.renderer.resize(canvasSize.width, canvasSize.height);
      
      // 重新绘制背景
      if (mainContainerRef.current) {
        mainContainerRef.current.removeChildren();
        
        // Background layer
        const bgGraphics = new Graphics();
        bgGraphics.rect(0, 0, canvasSize.width, canvasSize.height);
        bgGraphics.fill(0x1a1a1a);
        mainContainerRef.current.addChild(bgGraphics);
        
        // Video layer
        const videoLayer = new Container();
        mainContainerRef.current.addChild(videoLayer);
        videoLayerRef.current = videoLayer;
      }
    }
  }, [canvasSize, isReady]);

  // Initialize PixiJS Application
  useEffect(() => {
    // 防止重复初始化
    if (!canvasRef.current || appRef.current || initializingRef.current) return;
    
    initializingRef.current = true;

    const initPixi = async () => {
      try {
        // Create PixiJS Application
        const app = new Application();
        
        await app.init({
          width: canvasSize.width,
          height: canvasSize.height,
          backgroundColor: 0x000000,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        });

        // Add canvas to DOM
        if (canvasRef.current && !appRef.current) {
          // 清空容器，防止重复添加
          canvasRef.current.innerHTML = '';
          canvasRef.current.appendChild(app.canvas);
          
          appRef.current = app;

          // Create layer structure
          const mainContainer = new Container();
          app.stage.addChild(mainContainer);
          mainContainerRef.current = mainContainer;

          // Background layer
          const bgGraphics = new Graphics();
          bgGraphics.rect(0, 0, canvasSize.width, canvasSize.height);
          bgGraphics.fill(0x1a1a1a);
          mainContainer.addChild(bgGraphics);

          // Video layer - for rendering video clips
          const videoLayer = new Container();
          mainContainer.addChild(videoLayer);
          videoLayerRef.current = videoLayer;

          setIsReady(true);
        } else {
          // 如果 appRef 已经存在，销毁新创建的 app
          app.destroy(true);
        }
      } catch (error) {
        console.error('Error initializing PixiJS:', error);
      } finally {
        initializingRef.current = false;
      }
    };

    initPixi();

    // Cleanup
    return () => {
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
        mainContainerRef.current = null;
        videoLayerRef.current = null;
        setIsReady(false);
      }
      // 清理视频元素
      videoElementsRef.current.forEach(video => {
        video.pause();
        video.src = '';
        video.load();
      });
      videoElementsRef.current.clear();
      initializingRef.current = false;
    };
  }, []); // 移除依赖，只在组件挂载时初始化一次

  // Update preview based on playhead position
  useEffect(() => {
    if (!isReady || !appRef.current || !videoLayerRef.current) return;

    // 节流：限制渲染频率为 60fps (16.67ms)
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    if (timeSinceLastRender < 16.67) {
      return; // 跳过此次渲染
    }
    lastRenderTimeRef.current = now;

    const videoLayer = videoLayerRef.current;
    
    // Get active clips at current playhead position
    const activeClips = clips.filter(clip => {
      const clipEnd = clip.startTime + clip.duration;
      return playheadPosition >= clip.startTime && playheadPosition < clipEnd;
    });

    // Sort clips by track order (higher order = on top)
    const sortedClips = activeClips.sort((a, b) => {
      const trackA = tracks.find(t => t.id === a.trackId);
      const trackB = tracks.find(t => t.id === b.trackId);
      return (trackA?.order || 0) - (trackB?.order || 0);
    });

    // 只渲染最上层的视频片段
    const topVideoClip = sortedClips.reverse().find(clip => {
      const track = tracks.find(t => t.id === clip.trackId);
      return track?.type === 'video';
    });

    if (topVideoClip && topVideoClip.thumbnailUrl) {
      const track = tracks.find(t => t.id === topVideoClip.trackId);
      
      if (track?.type === 'video' && topVideoClip.filePath) {
        // 计算视频内的时间位置
        const clipTime = playheadPosition - topVideoClip.startTime;
        
        // 生成缓存键 - 降低精度到 0.1 秒，减少缓存数量
        const cacheKey = `${topVideoClip.id}_${clipTime.toFixed(1)}`;
        
        // 检查缓存
        const cachedFrameUrl = frameCache.current.get(cacheKey);
        
        if (cachedFrameUrl) {
          // 使用缓存的帧
          videoLayer.removeChildren();
          renderFrame(cachedFrameUrl, clipTime, topVideoClip.mediaId, videoLayer).catch(err => {
            console.error('Error rendering cached frame:', err);
          });
        } else {
          // 检查是否正在提取
          if (extractingRef.current.has(cacheKey)) {
            return; // 已在提取中，跳过
          }
          
          // 标记为正在提取
          extractingRef.current.add(cacheKey);
          
          // 不清空画面，保持之前的帧
          // 异步提取帧
          extractVideoFrame(topVideoClip.filePath, clipTime)
            .then((frameUrl) => {
              // 缓存帧 URL
              frameCache.current.set(cacheKey, frameUrl);
              extractingRef.current.delete(cacheKey);
              
              // 立即渲染提取的帧（如果播放头位置没有变化太多）
              const currentClipTime = playheadPosition - topVideoClip.startTime;
              if (Math.abs(currentClipTime - clipTime) < 0.2) {
                videoLayer.removeChildren();
                renderFrame(frameUrl, clipTime, topVideoClip.mediaId, videoLayer).catch(err => {
                  console.error('Error rendering extracted frame:', err);
                });
              }
            })
            .catch((error) => {
              console.error('Failed to extract frame:', error);
              extractingRef.current.delete(cacheKey);
            });
        }
        
        // 预加载：提前加载接下来的 3 帧（0.3 秒）
        if (isPlaying) {
          for (let i = 1; i <= 3; i++) {
            const futureTime = clipTime + (i * 0.1);
            const futureKey = `${topVideoClip.id}_${futureTime.toFixed(1)}`;
            
            // 如果未缓存且未在提取中，则预加载
            if (!frameCache.current.has(futureKey) && !extractingRef.current.has(futureKey)) {
              extractingRef.current.add(futureKey);
              
              extractVideoFrame(topVideoClip.filePath, futureTime)
                .then((frameUrl) => {
                  frameCache.current.set(futureKey, frameUrl);
                  extractingRef.current.delete(futureKey);
                })
                .catch((error) => {
                  console.error('Failed to preload frame:', error);
                  extractingRef.current.delete(futureKey);
                });
            }
          }
        }
      }
    } else {
      // 如果没有活动片段，清空画面
      videoLayer.removeChildren();
    }
  }, [playheadPosition, clips, tracks, isReady, canvasSize, isPlaying]);

  // 渲染视频帧
  const renderFrame = async (frameUrl: string, clipTime: number, mediaId: string, videoLayer: Container) => {
    try {
      console.log('🖼️ 渲染帧:', frameUrl.substring(0, 50) + '...');
      
      if (!frameUrl) {
        console.error('Frame URL is empty');
        return;
      }
      
      // 使用 Assets.load 加载纹理（PixiJS v8 推荐方式）
      const texture = await Assets.load(frameUrl);
      
      if (!texture) {
        console.error('Failed to load texture');
        return;
      }
      
      const sprite = new Sprite(texture);
      
      // 调整大小和位置
      if (texture.source && texture.source.width > 0 && texture.source.height > 0) {
        const textureWidth = texture.source.width;
        const textureHeight = texture.source.height;
        
        const scaleX = canvasSize.width / textureWidth;
        const scaleY = canvasSize.height / textureHeight;
        const scale = Math.min(scaleX, scaleY);
        
        sprite.scale.set(scale);
        sprite.x = (canvasSize.width - textureWidth * scale) / 2;
        sprite.y = (canvasSize.height - textureHeight * scale) / 2;
        
        console.log('✅ 帧渲染完成');
      }
      
      // 添加到场景
      videoLayer.addChild(sprite);
      
      // 添加片段信息文本
      const clipStyle = new TextStyle({
        fontFamily: 'Arial',
        fontSize: 16,
        fill: 0xffffff,
        stroke: { color: 0x000000, width: 3 },
      });

      const clipText = new Text({
        text: `${mediaId} | ${clipTime.toFixed(2)}s`,
        style: clipStyle,
      });
      
      clipText.x = 10;
      clipText.y = 10;
      videoLayer.addChild(clipText);
    } catch (error) {
      console.error('Error rendering frame:', error);
    }
  };

  // 显示加载状态
  const showLoadingState = (mediaId: string, videoLayer: Container) => {
    const loadingGraphics = new Graphics();
    loadingGraphics.rect(0, 0, canvasSize.width, canvasSize.height);
    loadingGraphics.fill(0x1976d2);
    videoLayer.addChild(loadingGraphics);
    
    const loadingStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 24,
      fill: 0xffffff,
      align: 'center',
    });

    const loadingText = new Text({
      text: `${mediaId}\n\n提取视频帧中...`,
      style: loadingStyle,
    });
    
    loadingText.anchor.set(0.5);
    loadingText.x = canvasSize.width / 2;
    loadingText.y = canvasSize.height / 2;
    videoLayer.addChild(loadingText);
  };

  // 显示错误状态
  const showErrorState = (mediaId: string, videoLayer: Container) => {
    const errorGraphics = new Graphics();
    errorGraphics.rect(0, 0, canvasSize.width, canvasSize.height);
    errorGraphics.fill(0x333333);
    videoLayer.addChild(errorGraphics);
    
    const errorStyle = new TextStyle({
      fontFamily: 'Arial',
      fontSize: 20,
      fill: 0xff5555,
      align: 'center',
    });

    const errorText = new Text({
      text: `无法加载视频\n${mediaId}`,
      style: errorStyle,
    });
    
    errorText.anchor.set(0.5);
    errorText.x = canvasSize.width / 2;
    errorText.y = canvasSize.height / 2;
    videoLayer.addChild(errorText);
  };

  // 播放控制
  const handleTogglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  const handlePreviousSecond = () => {
    setPlayheadPosition(Math.max(0, playheadPosition - 1));
  };

  const handleNextSecond = () => {
    setPlayheadPosition(playheadPosition + 1);
  };

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
      
      const newPosition = playheadPosition + deltaTime;
      
      // 检查是否到达最后一帧
      // 获取所有片段的最大结束时间
      const maxEndTime = clips.length > 0 
        ? Math.max(...clips.map(clip => clip.startTime + clip.duration))
        : 0;
      
      if (newPosition >= maxEndTime && maxEndTime > 0) {
        // 到达末尾，停止播放
        setPlayheadPosition(maxEndTime);
        setIsPlaying(false);
        return;
      }
      
      // 更新播放头位置
      setPlayheadPosition(newPosition);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, playheadPosition, setPlayheadPosition, clips]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 空格键：播放/暂停
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
      // 左箭头：上一秒
      else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousSecond();
      }
      // 右箭头：下一秒
      else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNextSecond();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playheadPosition]);

  return (
    <div 
      ref={containerRef}
      className="video-preview-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Canvas 容器 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          minHeight: 0, // 重要：防止 flex 子元素溢出
        }}
      >
        <div
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </div>
      
      {/* 控制栏 */}
      <div
        style={{
          width: '100%',
          height: '60px',
          flexShrink: 0,
          backgroundColor: '#1e1e1e',
          borderTop: '1px solid #2a2a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '0 20px',
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
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
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
            marginLeft: '20px',
            color: '#aaa',
            fontSize: '14px',
            fontFamily: 'monospace',
          }}
        >
          {formatTime(playheadPosition)}
        </div>
      </div>
    </div>
  );
};

// 格式化时间显示
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export default VideoPreview;
