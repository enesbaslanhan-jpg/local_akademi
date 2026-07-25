import { describe, expect, it } from 'vitest'
import {
  LocalAiJobQueue,
  LocalAiQueueFullError,
} from '../src/services/local-ai-job-queue'

describe('local AI job queue', () => {
  it('runs jobs with bounded concurrency and no content snapshot', async () => {
    const queue = new LocalAiJobQueue(1, 3)
    let release!: () => void
    const first = queue.run('quiz', () =>
      new Promise<string>(resolve => {
        release = () => resolve('first')
      }),
    )
    const second = queue.run('official_summary', async () => 'second')
    expect(queue.snapshot()).toMatchObject({
      active: 1,
      pending: 1,
      contentStored: false,
    })
    release()
    await expect(first).resolves.toBe('first')
    await expect(second).resolves.toBe('second')
    expect(queue.snapshot().completed).toBe(2)
  })

  it('rejects overflow without running the job', async () => {
    const queue = new LocalAiJobQueue(1, 1)
    let release!: () => void
    const first = queue.run('quiz', () =>
      new Promise<void>(resolve => {
        release = resolve
      }),
    )
    const second = queue.run('quiz', async () => undefined)
    await expect(
      queue.run('quiz', async () => undefined),
    ).rejects.toBeInstanceOf(LocalAiQueueFullError)
    release()
    await first
    await second
  })
})

