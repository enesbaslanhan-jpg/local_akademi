import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { copyFile, mkdtemp, readFile, rm, stat } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import type { PrismaClient } from '@prisma/client'
import { spawnSync } from 'child_process'
import { CommunityVideoProcessor, videoSuresiniOku } from '../src/services/community-video-processor'

/*
 * ffmpeg yoksa bu dosya ATLANIR, basarisiz sayilmaz. Uretim imaji (Dockerfile)
 * ve GitHub ubuntu kosucusu ffmpeg tasiyor; gelistirici Windows makinesinde
 * yok ve orada testin duzeltilecek bir sey soylemiyor -- yalniz aracin
 * kurulu olmadigini soyluyor (13.09.2026).
 */
const ffmpegVar = spawnSync('ffmpeg', ['-version']).status === 0

describe.skipIf(!ffmpegVar)('topluluk video isleme hatti', () => {
  let directory = ''
  const media: any = {
    id: 'video-e2e',
    kind: 'video',
    status: 'processing',
    storedName: 'video-e2e.raw.mp4',
  }

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'localkarar-video-'))
    await copyFile(
      join(process.cwd(), 'tests', 'community-video-fixture.mp4'),
      join(directory, media.storedName),
    )
  })

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true })
  })

  it('gercek MP4 dosyasini 720p H.264/AAC ciktiya ve JPEG kapaga donusturur', async () => {
    const fakePrisma = {
      communityMedia: {
        findUnique: vi.fn(async () => ({ ...media })),
        findMany: vi.fn(async () => []),
        update: vi.fn(async ({ data }: any) => Object.assign(media, data)),
        updateMany: vi.fn(async ({ data }: any) => Object.assign(media, data)),
      },
    } as unknown as PrismaClient
    const logger = { info: vi.fn(), error: vi.fn() }
    const processor = new CommunityVideoProcessor(fakePrisma, directory, logger)

    processor.enqueue(media.id)
    await vi.waitFor(() => expect(media.status).toBe('ready'), { timeout: 60_000, interval: 100 })

    expect(media.mimeType).toBe('video/mp4')
    expect(media.durationSec).toBeGreaterThanOrEqual(1)
    expect(media.posterStoredName).toBe('video-e2e.poster.jpg')
    expect((await stat(join(directory, media.storedName))).size).toBeGreaterThan(0)
    const poster = await readFile(join(directory, media.posterStoredName))
    expect(poster.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))).toBe(true)
    await expect(stat(join(directory, 'video-e2e.raw.mp4'))).rejects.toThrow()
    expect(await videoSuresiniOku(join(directory, media.storedName))).toBeLessThan(2)
    expect(logger.error).not.toHaveBeenCalled()
  }, 70_000)
})
