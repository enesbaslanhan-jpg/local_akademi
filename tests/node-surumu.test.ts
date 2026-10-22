import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const kok = join(__dirname, '..')
const dockerfile = readFileSync(join(kok, 'Dockerfile'), 'utf8')
const releaseWorkflow = readFileSync(join(kok, '.github/workflows/release.yml'), 'utf8')

describe('Node.js calisma surumu', () => {
  it('Docker imajinin tum Node tabanlari en az 22. ana surumde', () => {
    const nodeTabanlari = [...dockerfile.matchAll(/^FROM\s+node:(\d+)(?:\.[\w.-]+)?/gm)]

    expect(nodeTabanlari.length).toBeGreaterThan(0)
    for (const [, anaSurum] of nodeTabanlari) {
      expect(Number(anaSurum)).toBeGreaterThanOrEqual(22)
    }
  })

  it('Release Gate ayni Node ana surumunu kullaniyor', () => {
    const dockerAnaSurumu = dockerfile.match(/^FROM\s+node:(\d+)/m)?.[1]
    const ciAnaSurumu = releaseWorkflow.match(/^\s+NODE_VERSION:\s*['"]?(\d+)/m)?.[1]

    expect(dockerAnaSurumu).toBeDefined()
    expect(ciAnaSurumu).toBe(dockerAnaSurumu)
  })
})
