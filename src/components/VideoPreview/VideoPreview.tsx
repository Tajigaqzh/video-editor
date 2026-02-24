import React, { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, TextStyle, Sprite, Texture } from 'pixi.js';
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

    const videoLayer = videoLayerRef.current;
    
    // Clear previous frame
    videoLayer.removeChildren();

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
        
        // 生成缓存键
        const cacheKey = `${topVideoClip.id}_${clipTime.toFixed(2)}`;
        
        // 检查缓存
        const cachedFrameUrl = frameCache.current.get(cacheKey);
        
        if (cachedFrameUrl) {
          // 使用缓存的帧
          renderFrame(cachedFrameUrl, clipTime, topVideoClip.mediaId, videoLayer).catch(err => {
            console.error('Error rendering cached frame:', err);
          });
        } else {
          // 显示加载状态
          showLoadingState(topVideoClip.mediaId, videoLayer);
          
          // 异步提取帧
          extractVideoFrame(topVideoClip.filePath, clipTime)
            .then((frameUrl) => {
              // 缓存帧 URL
              frameCache.current.set(cacheKey, frameUrl);
              
              // 立即渲染提取的帧（如果播放头位置没有变化）
              const currentClipTime = playheadPosition - topVideoClip.startTime;
              if (Math.abs(currentClipTime - clipTime) < 0.1) {
                videoLayer.removeChildren();
                renderFrame(frameUrl, clipTime, topVideoClip.mediaId, videoLayer).catch(err => {
                  console.error('Error rendering extracted frame:', err);
                });
              }
            })
            .catch((error) => {
              console.error('Failed to extract frame:', error);
              showErrorState(topVideoClip.mediaId, videoLayer);
            });
        }
      }
    }
    // 如果没有活动片段，不显示任何内容（保持黑色背景）
  }, [playheadPosition, clips, tracks, isReady, canvasSize]);

  // 渲染视频帧
  const renderFrame = async (frameUrl: string, clipTime: number, mediaId: string, videoLayer: Container) => {
    try {
      console.log('🖼️ 渲染帧:', frameUrl);
      
      if (!frameUrl) {
        console.error('Frame URL is empty');
        return;
      }
      
      // 如果是 asset:// 协议，需要通过 fetch 转换为 blob URL
      let imageUrl = frameUrl;
      if (frameUrl.startsWith('asset://') || frameUrl.startsWith('http://asset.localhost')) {
        try {
          const response = await fetch(frameUrl);
          const blob = await response.blob();
          imageUrl = URL.createObjectURL(blob);
          console.log('✅ 转换为 blob URL:', imageUrl);
        } catch (error) {
          console.error('Failed to fetch asset:', error);
          return;
        }
      }
      
      const texture = Texture.from(imageUrl);
      
      if (!texture) {
        console.error('Failed to create texture from URL:', imageUrl);
        return;
      }
      
      const sprite = new Sprite(texture);
      
      // 添加到场景
      videoLayer.addChild(sprite);
      
      // 等待纹理加载完成后调整大小和位置
      const updateSpriteTransform = () => {
        try {
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
        } catch (error) {
          console.error('Error updating sprite transform:', error);
        }
      };
      
      // 监听纹理更新事件
      texture.on('update', updateSpriteTransform);
      
      // 如果纹理已经加载，立即更新
      if (texture.source && texture.source.width > 0) {
        updateSpriteTransform();
      }
      
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
      
      // 更新播放头位置
      setPlayheadPosition(playheadPosition + deltaTime);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, playheadPosition, setPlayheadPosition]);

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
