/**
 * 帧缓存管理服务（使用内存 + IndexedDB）
 * 
 * 缓存结构：
 * 内存缓存：快速访问
 * IndexedDB：持久化存储
 */

export interface FrameMetadata {
  clipId: string;
  filePath: string;
  duration: number;
  fps: number;
  frameInterval: number; // 帧间隔（秒）
  frames: {
    timestamp: number;
    filename: string;
  }[];
  createdAt: number;
}

class FrameCacheManager {
  private memoryCache = new Map<string, string>(); // clipId_timestamp -> frameUrl
  private metadata = new Map<string, FrameMetadata>();
  private dbName = 'video-editor-cache';
  private storeName = 'frames';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    try {
      // 初始化 IndexedDB
      const request = indexedDB.open(this.dbName, 1);
      
      request.onerror = () => {
        console.error('❌ IndexedDB 初始化失败');
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB 初始化完成');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
    } catch (error) {
      console.error('❌ 缓存管理器初始化失败:', error);
    }
  }

  /**
   * 保存帧到缓存
   */
  async saveFrame(clipId: string, timestamp: number, frameUrl: string): Promise<void> {
    const key = `${clipId}_${timestamp.toFixed(1)}`;
    
    // 保存到内存缓存
    this.memoryCache.set(key, frameUrl);
    
    // 保存到 IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.put({ id: key, frameUrl, timestamp: Date.now() });
      } catch (error) {
        console.error('❌ 保存帧到 IndexedDB 失败:', error);
      }
    }
  }

  /**
   * 获取帧 URL
   */
  async getFrameUrl(clipId: string, timestamp: number): Promise<string | null> {
    const key = `${clipId}_${timestamp.toFixed(1)}`;
    
    // 优先从内存缓存读取
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key) || null;
    }
    
    // 从 IndexedDB 读取
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const transaction = this.db!.transaction([this.storeName], 'readonly');
          const store = transaction.objectStore(this.storeName);
          const request = store.get(key);
          
          request.onsuccess = () => {
            const result = request.result;
            if (result) {
              this.memoryCache.set(key, result.frameUrl);
              resolve(result.frameUrl);
            } else {
              resolve(null);
            }
          };
          
          request.onerror = () => {
            resolve(null);
          };
        } catch (error) {
          console.error('❌ 从 IndexedDB 读取失败:', error);
          resolve(null);
        }
      });
    }
    
    return null;
  }

  /**
   * 检查帧是否存在
   */
  async hasFrame(clipId: string, timestamp: number): Promise<boolean> {
    const url = await this.getFrameUrl(clipId, timestamp);
    return url !== null;
  }

  /**
   * 保存元数据
   */
  saveMetadata(clipId: string, metadata: FrameMetadata): void {
    this.metadata.set(clipId, metadata);
  }

  /**
   * 获取元数据
   */
  getMetadata(clipId: string): FrameMetadata | null {
    return this.metadata.get(clipId) || null;
  }

  /**
   * 清除 clip 的所有缓存
   */
  async clearClipCache(clipId: string): Promise<void> {
    // 清除内存缓存
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(clipId)) {
        this.memoryCache.delete(key);
      }
    }
    
    // 清除 IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
          const results = request.result;
          for (const item of results) {
            if (item.id.startsWith(clipId)) {
              store.delete(item.id);
            }
          }
        };
      } catch (error) {
        console.error('❌ 清除 IndexedDB 缓存失败:', error);
      }
    }
    
    console.log('✅ 缓存已清除:', clipId);
  }
}

export const frameCache = new FrameCacheManager();
