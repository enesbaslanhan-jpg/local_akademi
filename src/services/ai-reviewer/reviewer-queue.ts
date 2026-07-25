interface QueueJob {
  run: () => Promise<void>
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

export function getReviewerQueueConfig(
  env: NodeJS.ProcessEnv = process.env,
) {
  return {
    concurrency: boundedInteger(
      env.AI_REVIEWER_QUEUE_CONCURRENCY,
      1,
      1,
      4,
    ),
    maxPending: boundedInteger(
      env.AI_REVIEWER_QUEUE_MAX_PENDING,
      20,
      0,
      200,
    ),
  }
}

export class AiReviewerQueue {
  private active = 0
  private pending: QueueJob[] = []
  private accepted = 0
  private completed = 0
  private rejected = 0

  enqueue(run: () => Promise<void>): boolean {
    const config = getReviewerQueueConfig()
    if (
      this.active >= config.concurrency &&
      this.pending.length >= config.maxPending
    ) {
      this.rejected++
      return false
    }

    this.accepted++
    if (this.active < config.concurrency) {
      this.start({ run })
    } else {
      this.pending.push({ run })
    }
    return true
  }

  execute<T>(
    run: () => Promise<T>,
  ): Promise<
    | { accepted: true; result: T }
    | { accepted: false }
  > {
    return new Promise(resolve => {
      const accepted = this.enqueue(async () => {
        const result = await run()
        resolve({ accepted: true, result })
      })
      if (!accepted) resolve({ accepted: false })
    })
  }

  snapshot() {
    const config = getReviewerQueueConfig()
    return {
      active: this.active,
      pending: this.pending.length,
      concurrency: config.concurrency,
      maxPending: config.maxPending,
      accepted: this.accepted,
      completed: this.completed,
      rejected: this.rejected,
    }
  }

  resetForTests(): void {
    this.active = 0
    this.pending = []
    this.accepted = 0
    this.completed = 0
    this.rejected = 0
  }

  private start(job: QueueJob): void {
    this.active++
    void job.run()
      .catch(() => undefined)
      .finally(() => {
        this.active--
        this.completed++
        this.drain()
      })
  }

  private drain(): void {
    const config = getReviewerQueueConfig()
    while (
      this.active < config.concurrency &&
      this.pending.length > 0
    ) {
      const next = this.pending.shift()
      if (next) this.start(next)
    }
  }
}

export const aiReviewerQueue = new AiReviewerQueue()
