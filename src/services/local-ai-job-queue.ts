type JobKind = 'quiz' | 'official_summary'

type PendingJob<T> = {
  id: string
  kind: JobKind
  task: () => Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
  queuedAt: number
}

export class LocalAiQueueFullError extends Error {
  constructor() {
    super('LOCAL_AI_QUEUE_FULL')
    this.name = 'LocalAiQueueFullError'
  }
}

export class LocalAiJobQueue {
  private pending: Array<PendingJob<unknown>> = []
  private active = 0
  private completed = 0
  private failed = 0
  private sequence = 0

  constructor(
    private concurrency = 1,
    private maxPending = 5,
  ) {
    this.concurrency = Math.max(1, Math.min(concurrency, 4))
    this.maxPending = Math.max(1, Math.min(maxPending, 50))
  }

  run<T>(kind: JobKind, task: () => Promise<T>): Promise<T> {
    if (this.pending.length >= this.maxPending) {
      return Promise.reject(new LocalAiQueueFullError())
    }
    return new Promise<T>((resolve, reject) => {
      this.pending.push({
        id: `local-ai-${Date.now()}-${++this.sequence}`,
        kind,
        task,
        resolve,
        reject,
        queuedAt: Date.now(),
      } as PendingJob<unknown>)
      this.drain()
    })
  }

  snapshot() {
    return {
      active: this.active,
      pending: this.pending.length,
      concurrency: this.concurrency,
      maxPending: this.maxPending,
      completed: this.completed,
      failed: this.failed,
      jobs: this.pending.map(job => ({
        id: job.id,
        kind: job.kind,
        queuedMs: Date.now() - job.queuedAt,
      })),
      contentStored: false,
    }
  }

  private drain(): void {
    while (this.active < this.concurrency && this.pending.length > 0) {
      const job = this.pending.shift()!
      this.active++
      void job.task()
        .then(value => {
          this.completed++
          job.resolve(value)
        })
        .catch(error => {
          this.failed++
          job.reject(error)
        })
        .finally(() => {
          this.active--
          this.drain()
        })
    }
  }
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(min, Math.min(Math.floor(parsed), max))
}

export const localAiGenerationQueue = new LocalAiJobQueue(
  boundedInteger(process.env.LOCAL_AI_QUEUE_CONCURRENCY, 1, 1, 4),
  boundedInteger(process.env.LOCAL_AI_QUEUE_MAX_PENDING, 5, 1, 50),
)

