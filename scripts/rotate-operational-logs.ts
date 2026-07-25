import {
  existsSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'fs'
import { join, resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const outputDirectory = join(root, 'outputs')
const apply = process.argv.includes('--apply')

function maxBytes(): number {
  const parsed = Number(process.env.LOG_ROTATION_MAX_BYTES)
  if (!Number.isFinite(parsed)) return 5 * 1024 * 1024
  return Math.max(1024 * 1024, Math.min(parsed, 100 * 1024 * 1024))
}

function keepCount(): number {
  const parsed = Number(process.env.LOG_ROTATION_KEEP_COUNT)
  if (!Number.isFinite(parsed)) return 10
  return Math.max(3, Math.min(Math.floor(parsed), 50))
}

if (!existsSync(outputDirectory)) {
  console.log(JSON.stringify({ ok: true, rotated: [], removed: [] }))
  process.exit(0)
}

const now = new Date().toISOString().replace(/[:.]/g, '-')
const oversized = readdirSync(outputDirectory)
  .filter(name => /^[A-Za-z0-9._-]+\.log$/.test(name))
  .filter(name => statSync(join(outputDirectory, name)).size > maxBytes())
const rotated: string[] = []
if (apply) {
  for (const name of oversized) {
    const source = join(outputDirectory, name)
    const destination = join(outputDirectory, `${name}.${now}`)
    if (
      source.startsWith(`${outputDirectory}\\`) &&
      destination.startsWith(`${outputDirectory}\\`)
    ) {
      renameSync(source, destination)
      rotated.push(destination.split('\\').at(-1)!)
    }
  }
}

const archived = readdirSync(outputDirectory)
  .filter(name =>
    /^[A-Za-z0-9._-]+\.log\.\d{4}-\d{2}-\d{2}T/.test(name)
  )
  .map(name => ({
    name,
    path: join(outputDirectory, name),
    modifiedAt: statSync(join(outputDirectory, name)).mtimeMs,
  }))
  .sort((left, right) => right.modifiedAt - left.modifiedAt)
const removable = archived.slice(keepCount())
const removed: string[] = []
if (apply) {
  for (const item of removable) {
    if (item.path.startsWith(`${outputDirectory}\\`)) {
      rmSync(item.path, { force: true })
      removed.push(item.name)
    }
  }
}
console.log(JSON.stringify({
  ok: true,
  mode: apply ? 'apply' : 'dry-run',
  oversized: oversized.length,
  rotated,
  removable: apply ? [] : removable.map(item => item.name),
  removed,
  maxBytes: maxBytes(),
  keepCount: keepCount(),
}))

