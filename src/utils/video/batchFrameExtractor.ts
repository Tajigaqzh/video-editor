/**
 * 批量抽帧服务。
 * 当素材进入时间线后，按固定时间间隔触发后端批量抽帧并写入缓存元数据。
 */
import { invoke } from "@tauri-apps/api/core";
import { frameCache, FrameMetadata } from "./frameCache";
import { getVideoInfo } from "./ffmpeg";

/**
 * 批量抽帧服务
 *
 * 当素材添加到时间轴时，自动批量抽帧并缓存
 */

export interface BatchExtractOptions {
  clipId: string;
  filePath: string;
  duration: number;
  frameInterval?: number; // 帧间隔（秒），默认 0.1 秒
  onProgress?: (current: number, total: number) => void;
  startTime?: number; // 开始时间（秒），用于增量抽帧
  endTime?: number; // 结束时间（秒），用于增量抽帧
}

class BatchFrameExtractor {
  private extractingTasks = new Map<string, Promise<void>>();

  /**
   * 开始批量抽帧
   */
  async startBatchExtract(options: BatchExtractOptions): Promise<void> {
    const { clipId, filePath, duration, frameInterval = 0.1, startTime = 0, endTime } = options;

    // 如果已经在提取，返回现有的 Promise
    if (this.extractingTasks.has(clipId)) {
      return this.extractingTasks.get(clipId);
    }

    const actualEndTime = endTime || duration;
    const task = this.performBatchExtract(
      clipId,
      filePath,
      duration,
      frameInterval,
      startTime,
      actualEndTime,
    );
    this.extractingTasks.set(clipId, task);

    try {
      await task;
    } finally {
      this.extractingTasks.delete(clipId);
    }
  }

  /**
   * 执行批量抽帧
   */
  private async performBatchExtract(
    clipId: string,
    filePath: string,
    duration: number,
    frameInterval: number,
    startTime: number = 0,
    endTime?: number,
  ): Promise<void> {
    try {
      const actualEndTime = endTime || duration;
      console.log(`🎬 开始批量抽帧: ${clipId} (${startTime}s - ${actualEndTime}s)`);
      const startTimeMs = performance.now();

      // 获取视频信息
      const videoInfo = await getVideoInfo(filePath);
      console.log("📹 视频信息:", videoInfo);

      // 计算需要抽取的帧数并生成时间戳列表。
      // 这里保持与 frameCache 的 0.1s 命名精度一致。
      const frameCount = Math.ceil((actualEndTime - startTime) / frameInterval);
      const timestamps: number[] = [];

      for (let i = 0; i < frameCount; i++) {
        timestamps.push(startTime + i * frameInterval);
      }

      console.log(`📊 需要抽取 ${frameCount} 帧，间隔 ${frameInterval}s`);

      // 调用 Rust 命令批量抽帧
      await invoke("batch_extract_frames", {
        path: filePath,
        timestamps,
        outputDir: await this.getOutputDir(clipId),
      });

      // 保存元数据
      const metadata: FrameMetadata = {
        clipId,
        filePath,
        duration,
        fps: videoInfo.fps,
        frameInterval,
        frames: timestamps.map((ts) => ({
          timestamp: ts,
          filename: `frame_${ts.toFixed(1)}.jpg`,
        })),
        createdAt: Date.now(),
      };

      frameCache.saveMetadata(clipId, metadata);

      const durationMs = performance.now() - startTimeMs;
      console.log(`✅ 批量抽帧完成: ${frameCount} 帧，耗时 ${(durationMs / 1000).toFixed(1)}s`);
    } catch (error) {
      console.error("❌ 批量抽帧失败:", error);
      throw error;
    }
  }

  /**
   * 获取输出目录
   */
  private async getOutputDir(clipId: string): Promise<string> {
    // 使用系统临时目录
    const tempDir = await import("@tauri-apps/api/path").then((m) => m.tempDir());
    return `${tempDir}video-editor-cache/${clipId}`;
  }

  /**
   * 取消抽帧任务
   */
  async cancelExtract(clipId: string): Promise<void> {
    // 注意：当前实现无法真正取消，因为 Rust 命令已经在执行
    // 后续可以添加 Rust 端的取消支持
    this.extractingTasks.delete(clipId);
    console.log("⏹️ 已取消抽帧任务:", clipId);
  }

  /**
   * 检查是否正在抽帧
   */
  isExtracting(clipId: string): boolean {
    return this.extractingTasks.has(clipId);
  }
}

export const batchFrameExtractor = new BatchFrameExtractor();
