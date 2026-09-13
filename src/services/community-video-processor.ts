import type { PrismaClient } from '@prisma/client'
import { spawn } from 'child_process'
import { stat, unlink } from 'fs/promises'
import { join } from 'path'

export const TOPLULUK_VIDEO_SINIRI = 200 * 1024 * 1024
export const TOPLULUK_DIGER_MEDYA_SINIRI = 20 * 1024 * 1024
export const TOPLULUK_VIDEO_SURE_SINIRI = 3 * 60

type Logger = {
  info: (obj: unknown, message?: string) => void
  error: (obj: unknown, message?: string) => void
}

function komutCalistir(program: string, args: string[], timeoutMs = 5 * 60_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    const zamanAsimi = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`${program} zaman asimina ugradi`))
    }, timeoutMs)

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', data => { stdout += data })
    child.stderr.on('data', data => { stderr += data })
    child.once('error', error => {
      clearTimeout(zamanAsimi)
      reject(error)
    })
    child.once('close', code => {
      clearTimeout(zamanAsimi)
      if (code === 0) resolve(stdout)
      else reject(new Error(`${program} ${code} koduyla kapandi: ${stderr.slice(-1200)}`))
    })
  })
}

export async function videoSuresiniOku(path: string): Promise<number> {
  const stdout = await komutCalistir('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    path,
  ], 30_000)
  const duration = Number.parseFloat(stdout.trim())
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Video suresi okunamadi')
  return duration
}

/**
 * Topluluk videolarini tek tek isler. Kuyruk bilerek eszamanli degildir:
 * uretim sunucusu iki CPU ve ayni anda iki ffmpeg tum API'yi yavaslatir.
 */
export class CommunityVideoProcessor {
  private readonly queue: string[] = []
  private readonly queued = new Set<string>()
  private running = false

  constructor(
    private readonly prisma: PrismaClient,
    private readonly mediaDirectory: string,
    private readonly logger: Logger,
  ) {}

  enqueue(mediaId: string) {
    if (this.queued.has(mediaId)) return
    this.queued.add(mediaId)
    this.queue.push(mediaId)
    void this.drain()
  }

  async recoverPending() {
    const pending = await this.prisma.communityMedia.findMany({
      where: { kind: 'video', status: 'processing' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    pending.forEach(media => this.enqueue(media.id))
  }

  private async drain() {
    if (this.running) return
    this.running = true
    try {
      while (this.queue.length > 0) {
        const mediaId = this.queue.shift()!
        try {
          await this.process(mediaId)
        } catch (error) {
          this.logger.error({ error, mediaId }, 'Community video processing failed')
        } finally {
          this.queued.delete(mediaId)
        }
      }
    } finally {
      this.running = false
    }
  }

  private async process(mediaId: string) {
    const media = await this.prisma.communityMedia.findUnique({ where: { id: mediaId } })
    if (!media || media.kind !== 'video' || media.status !== 'processing') return

    const rawPath = join(this.mediaDirectory, media.storedName)
    const readyName = `${media.id}.ready.mp4`
    const posterName = `${media.id}.poster.jpg`
    const readyPath = join(this.mediaDirectory, readyName)
    const posterPath = join(this.mediaDirectory, posterName)

    try {
      const duration = await videoSuresiniOku(rawPath)
      if (duration > TOPLULUK_VIDEO_SURE_SINIRI + 0.25) {
        throw new Error(`Video en fazla ${TOPLULUK_VIDEO_SURE_SINIRI} saniye olabilir`)
      }

      await komutCalistir('ffmpeg', [
        '-nostdin', '-y', '-i', rawPath,
        '-map_metadata', '-1',
        '-vf', "scale=w='min(1280,iw)':h=-2",
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '128k',
        readyPath,
      ])
      await komutCalistir('ffmpeg', [
        '-nostdin', '-y', '-ss', String(Math.min(1, Math.max(0, duration / 3))),
        '-i', readyPath, '-frames:v', '1', '-vf', "scale=w='min(1280,iw)':h=-2",
        '-q:v', '3', posterPath,
      ], 60_000)

      const readyInfo = await stat(readyPath)
      await this.prisma.communityMedia.update({
        where: { id: media.id },
        data: {
          storedName: readyName,
          posterStoredName: posterName,
          durationSec: Math.max(1, Math.round(duration)),
          mimeType: 'video/mp4',
          sizeBytes: readyInfo.size,
          status: 'ready',
        },
      })
      await unlink(rawPath).catch(() => {})
      this.logger.info({ mediaId, durationSec: Math.round(duration) }, 'Community video ready')
    } catch (error) {
      await Promise.all([
        unlink(rawPath).catch(() => {}),
        unlink(readyPath).catch(() => {}),
        unlink(posterPath).catch(() => {}),
      ])
      await this.prisma.communityMedia.updateMany({
        where: { id: media.id, status: 'processing' },
        data: { status: 'failed' },
      })
      throw error
    }
  }
}
