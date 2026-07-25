import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

async function getModule() {
  return await import('../src/index')
}

describe('JWT_SECRET startup validation', () => {
  const ORIGINAL = process.env.JWT_SECRET
  const VALID_SECRET = 'test-secret-key-min-32-bytes-long!!'

  afterEach(() => {
    process.env.JWT_SECRET = ORIGINAL
  })

  it('throws when JWT_SECRET is missing', async () => {
    process.env.JWT_SECRET = ''
    const { validateJwtSecret } = await getModule()
    expect(() => validateJwtSecret()).toThrow('JWT_SECRET environment variable is required')
  })

  it('throws when JWT_SECRET is empty string', async () => {
    process.env.JWT_SECRET = ''
    const { validateJwtSecret } = await getModule()
    expect(() => validateJwtSecret()).toThrow('JWT_SECRET')
  })

  it('throws when JWT_SECRET is only whitespace', async () => {
    process.env.JWT_SECRET = '   '
    const { validateJwtSecret } = await getModule()
    expect(() => validateJwtSecret()).toThrow('JWT_SECRET must not be empty or whitespace-only')
  })

  it('throws when JWT_SECRET is shorter than 32 bytes', async () => {
    process.env.JWT_SECRET = 'short-key'
    const { validateJwtSecret } = await getModule()
    expect(() => validateJwtSecret()).toThrow('JWT_SECRET must be at least 32 bytes')
  })

  it('throws for a short insecure default value', async () => {
    process.env.JWT_SECRET = 'secret'
    const { validateJwtSecret } = await getModule()
    expect(() => validateJwtSecret()).toThrow()
  })

  it('throws when JWT_SECRET is a long known weak value', async () => {
    process.env.JWT_SECRET = '12345678901234567890123456789012'
    const { validateJwtSecret } = await getModule()
    expect(() => validateJwtSecret()).toThrow('JWT_SECRET contains an insecure default value')
  })

  it('passes when JWT_SECRET is valid (32+ bytes)', async () => {
    process.env.JWT_SECRET = VALID_SECRET
    const { validateJwtSecret } = await getModule()
    expect(() => validateJwtSecret()).not.toThrow()
  })

  it('passes with maximum length 72-byte secret', async () => {
    process.env.JWT_SECRET = 'a'.repeat(72)
    const { validateJwtSecret } = await getModule()
    expect(() => validateJwtSecret()).not.toThrow()
  })

  it('error message does not contain the secret value', async () => {
    process.env.JWT_SECRET = 'short'
    const { validateJwtSecret } = await getModule()
    try {
      validateJwtSecret()
    } catch (e: any) {
      expect(e.message).not.toContain('short')
      expect(e.message).not.toContain('JWT_SECRET=')
    }
  })

  it('build() fails when JWT_SECRET is missing', async () => {
    const orig = process.env.JWT_SECRET
    process.env.JWT_SECRET = ''
    await expect(async () => {
      const { default: build } = await import('../src/index')
      await build()
    }).rejects.toThrow('JWT_SECRET')
    process.env.JWT_SECRET = orig
  })

  it('existing test suite JWT_SECRET works', async () => {
    process.env.JWT_SECRET = VALID_SECRET
    const { validateJwtSecret } = await getModule()
    expect(() => validateJwtSecret()).not.toThrow()
  })
})

describe('.dockerignore', () => {
  const dockerignorePath = join(import.meta.dirname, '..', '.dockerignore')

  it('exists at repository root', () => {
    expect(existsSync(dockerignorePath)).toBe(true)
  })

  const content: string = (() => {
    try {
      return readFileSync(dockerignorePath, 'utf-8')
    } catch {
      return ''
    }
  })()

  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'))

  function assertPattern(pattern: string): void {
    it(`ignores "${pattern}"`, () => {
      expect(lines).toContain(pattern)
    })
  }

  assertPattern('.git')
  assertPattern('.env')
  assertPattern('.env.*')
  assertPattern('node_modules/')
  assertPattern('uploads/')
  assertPattern('*.db')
  assertPattern('*.db-journal')
  assertPattern('dist/')
  assertPattern('BACKUPS/')
  assertPattern('*.log')
  assertPattern('outputs/')
  assertPattern('reports/')

  function assertNotIgnored(pattern: string): void {
    it(`does not ignore "${pattern}"`, () => {
      expect(lines).not.toContain(pattern)
    })
  }

  assertNotIgnored('Dockerfile')
  assertNotIgnored('docker-compose.yml')
  assertNotIgnored('package.json')
  assertNotIgnored('package-lock.json')
  assertNotIgnored('prisma/')
  assertNotIgnored('src/')
  assertNotIgnored('tsconfig.json')
})
