import { createWriteStream } from 'fs'
import { readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiver = require('archiver')

export async function createZip(sourceDir: string, destPath: string, excludeId?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(destPath)
    // @ts-ignore
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve())
    archive.on('error', (err: Error) => reject(err))

    archive.pipe(output)

    if (existsSync(sourceDir)) {
      const files = readdirSync(sourceDir)
      for (const file of files) {
        const filePath = join(sourceDir, file)
        const stat = statSync(filePath)

        if (stat.isFile() && !file.includes(excludeId || '')) {
          archive.file(filePath, { name: file })
        }
      }
    }

    archive.append(JSON.stringify({
      version: '1.0.0',
      created_at: new Date().toISOString(),
      type: 'backup'
    }, null, 2), { name: 'backup_manifest.json' })

    archive.finalize()
  })
}