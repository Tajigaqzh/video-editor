/**
 * WebSocket 客户端 - 用于接收视频帧流
 */

export interface FrameMessage {
  timestamp: number;
  frame_data: string; // base64-encoded JPEG data URL
}

export interface PlayCommand {
  path: string;
  start_time: number;
  end_time: number;
  fps: number;
}

export class VideoStreamClient {
  private ws: WebSocket | null = null;
  private onFrame: ((frame: FrameMessage) => void) | null = null;
  private onDone: (() => void) | null = null;
  private onError: ((error: string) => void) | null = null;

  /**
   * 连接到 WebSocket 服务器
   */
  async connect(url: string = 'ws://127.0.0.1:9001'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'done') {
              console.log('✅ Stream finished');
              this.onDone?.();
            } else if (data.timestamp !== undefined && data.frame_data) {
              // 这是一个帧消息
              this.onFrame?.(data);
            }
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.onError?.('WebSocket error');
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 发送播放命令
   */
  play(command: PlayCommand): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    this.ws.send(JSON.stringify(command));
    console.log('📤 Play command sent:', command);
  }

  /**
   * 设置帧回调
   */
  setOnFrame(callback: (frame: FrameMessage) => void): void {
    this.onFrame = callback;
  }

  /**
   * 设置完成回调
   */
  setOnDone(callback: () => void): void {
    this.onDone = callback;
  }

  /**
   * 设置错误回调
   */
  setOnError(callback: (error: string) => void): void {
    this.onError = callback;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// 全局实例
export const videoStreamClient = new VideoStreamClient();
