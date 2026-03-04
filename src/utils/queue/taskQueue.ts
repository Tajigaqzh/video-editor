/**
 * 通用任务队列。
 * 提供并发控制、优先级调度、取消与失败重试能力。
 */
export type QueueTaskStatus = "pending" | "running" | "done" | "failed" | "canceled";

export interface QueueTask<T = unknown> {
  id: string;
  type: string;
  priority: number;
  status: QueueTaskStatus;
  payload?: T;
  error?: string;
  retries: number;
  maxRetries: number;
  progress: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface QueueTaskHandlers<T = unknown, R = unknown> {
  run: (task: QueueTask<T>, signal: AbortSignal) => Promise<R>;
  onDone?: (task: QueueTask<T>, result: R) => void;
  onError?: (task: QueueTask<T>, error: Error) => void;
}

export interface TaskQueueOptions {
  concurrency?: number;
}

export class TaskQueue {
  private tasks = new Map<string, QueueTask>();
  private queue: string[] = [];
  private running = new Map<string, AbortController>();
  private handlers = new Map<string, QueueTaskHandlers<any, any>>();
  private readonly concurrency: number;

  constructor(options: TaskQueueOptions = {}) {
    this.concurrency = Math.max(1, options.concurrency ?? 2);
  }

  registerTaskType<T, R>(type: string, handlers: QueueTaskHandlers<T, R>) {
    this.handlers.set(type, handlers);
  }

  enqueue<T = unknown>(input: {
    id: string;
    type: string;
    payload?: T;
    priority?: number;
    maxRetries?: number;
  }) {
    const task: QueueTask<T> = {
      id: input.id,
      type: input.type,
      payload: input.payload,
      priority: input.priority ?? 0,
      status: "pending",
      retries: 0,
      maxRetries: input.maxRetries ?? 0,
      progress: 0,
      createdAt: Date.now(),
    };

    this.tasks.set(task.id, task);
    this.queue.push(task.id);
    this.queue.sort(
      (a, b) => (this.tasks.get(b)?.priority ?? 0) - (this.tasks.get(a)?.priority ?? 0),
    );
    this.process();
    return task;
  }

  cancel(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const controller = this.running.get(taskId);
    if (controller) controller.abort();

    if (task.status === "pending") {
      this.queue = this.queue.filter((id) => id !== taskId);
      task.status = "canceled";
      task.finishedAt = Date.now();
    }
  }

  retry(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "failed") return;
    task.status = "pending";
    task.error = undefined;
    this.queue.push(taskId);
    this.process();
  }

  getTask(taskId: string) {
    return this.tasks.get(taskId);
  }

  getTasks() {
    return Array.from(this.tasks.values()).toSorted((a, b) => a.createdAt - b.createdAt);
  }

  setProgress(taskId: string, progress: number) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.progress = Math.max(0, Math.min(100, progress));
  }

  private process() {
    while (this.running.size < this.concurrency && this.queue.length > 0) {
      const taskId = this.queue.shift();
      if (!taskId) break;
      const task = this.tasks.get(taskId);
      if (!task || task.status !== "pending") continue;

      const handlers = this.handlers.get(task.type);
      if (!handlers) {
        task.status = "failed";
        task.error = `No handlers registered for task type: ${task.type}`;
        task.finishedAt = Date.now();
        continue;
      }

      const controller = new AbortController();
      this.running.set(taskId, controller);
      task.status = "running";
      task.progress = 0;
      task.startedAt = Date.now();

      handlers
        .run(task, controller.signal)
        .then((result) => {
          task.status = "done";
          task.progress = 100;
          task.finishedAt = Date.now();
          handlers.onDone?.(task, result);
        })
        .catch((err: unknown) => {
          const error = err instanceof Error ? err : new Error(String(err));
          task.error = error.message;

          // 重试任务重新入队，保持原有优先级排序行为由下一轮 process 决定。
          if (task.retries < task.maxRetries) {
            task.retries += 1;
            task.status = "pending";
            this.queue.push(task.id);
          } else {
            task.status = "failed";
            task.finishedAt = Date.now();
            handlers.onError?.(task, error);
          }
        })
        .finally(() => {
          this.running.delete(taskId);
          this.process();
        });
    }
  }
}
