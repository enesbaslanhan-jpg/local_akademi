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

describe('prisma CLI in dependencies (OPS-DKR-002)', () => {
  const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8'))

  it('prisma is in dependencies (not devDependencies)', () => {
    expect(pkg.dependencies).toHaveProperty('prisma')
    expect(pkg.devDependencies).not.toHaveProperty('prisma')
  })
})

describe('Dockerfile structure (OPS-DKR-002, OPS-FNT-001)', () => {
  const dockerfilePath = join(import.meta.dirname, '..', 'Dockerfile')
  const content = readFileSync(dockerfilePath, 'utf-8')

  it('has exactly 3 build stages', () => {
    const stages = content.match(/^FROM /gm)
    expect(stages).toHaveLength(3)
  })

  it('has a backend-build stage', () => {
    expect(content).toMatch(/AS backend-build/)
  })

  it('has a frontend-build stage', () => {
    expect(content).toMatch(/AS frontend-build/)
  })

  it('runtime stage uses npm ci --production', () => {
    expect(content).toMatch(/npm ci --production/)
  })

  it('copies frontend dist to dist/public', () => {
    expect(content).toMatch(/COPY.*from=frontend-build.*dist.*dist\/public/m)
  })

  it('copies backend dist', () => {
    expect(content).toMatch(/COPY.*from=backend-build.*dist.*\.\/dist/m)
  })

  it('copies prisma client runtime from backend-build', () => {
    expect(content).toMatch(/COPY.*from=backend-build.*@prisma\/client/m)
  })

  it('still runs prisma generate on build stage', () => {
    expect(content).toMatch(/prisma generate/)
  })
})

describe('SPA fallback (OPS-FNT-002)', () => {
  it('setNotFoundHandler is registered in build function', async () => {
    process.env.JWT_SECRET = 'test-secret-key-min-32-bytes-long!!'
    const mod = await import('../src/index')
    const code = mod.default.toString()
    expect(code).toContain('setNotFoundHandler')
    expect(code).toContain('sendFile')
  })
})

describe('Frontend build integrity', () => {
  const frontendDist = join(import.meta.dirname, '..', 'frontend', 'dist')

  it('index.html exists in frontend dist', () => {
    expect(existsSync(join(frontendDist, 'index.html'))).toBe(true)
  })

  it('references hashed JS assets', () => {
    const html = readFileSync(join(frontendDist, 'index.html'), 'utf-8')
    const jsMatch = html.match(/src="\/assets\/[\w-]+\.js"/g)
    expect(jsMatch).not.toBeNull()
    expect(jsMatch!.length).toBeGreaterThanOrEqual(1)
  })

  it('references hashed CSS assets', () => {
    const html = readFileSync(join(frontendDist, 'index.html'), 'utf-8')
    const cssMatch = html.match(/href="\/assets\/[\w-]+\.css"/g)
    expect(cssMatch).not.toBeNull()
    expect(cssMatch!.length).toBeGreaterThanOrEqual(1)
  })

  it('frontend package.json has build script', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'frontend', 'package.json'), 'utf-8'))
    expect(pkg.scripts).toHaveProperty('build')
  })
})

describe('PostgreSQL development infrastructure (FAZ 6B)', () => {
  const composePath = join(import.meta.dirname, '..', 'docker-compose.yml')
  const compose = readFileSync(composePath, 'utf-8')
  const envExample = readFileSync(join(import.meta.dirname, '..', '.env.example'), 'utf-8')

  it('docker-compose.yml has a postgres service', () => {
    expect(compose).toContain('postgres:')
  })

  it('postgres service uses a pinned pg16 image', () => {
    expect(compose).toContain('pgvector/pgvector:pg16')
  })

  it('postgres service has a named volume', () => {
    expect(compose).toContain('postgres-data:')
  })

  it('postgres service has a healthcheck', () => {
    expect(compose).toContain('healthcheck:')
    expect(compose).toContain('pg_isready')
  })

  it('healthcheck has reasonable defaults', () => {
    expect(compose).toContain('interval: 5s')
    expect(compose).toContain('timeout: 5s')
    expect(compose).toContain('retries: 10')
    expect(compose).toContain('start_period: 10s')
  })

  it('postgres port is bound to loopback only', () => {
    expect(compose).toContain('127.0.0.1:5432:5432')
  })

  it('DB credentials come from environment and are MANDATORY', () => {
    /*
     * Eskiden `${DB_PASSWORD:-localakademi}` idi: değişken tanımlanmazsa
     * üretim parolası sessizce "localakademi" oluyordu. Artık `:?` ile
     * zorunlu — tanımsızsa Compose hiç başlamıyor.
     */
    expect(compose).toContain('POSTGRES_PASSWORD=${DB_PASSWORD:?')
    expect(compose).not.toContain('DB_PASSWORD:-')
    expect(compose).toContain('POSTGRES_USER=localakademi')
    expect(compose).toContain('POSTGRES_DB=localakademi')
  })

  it('uygulama veritabanına EN AZ YETKİLİ rolle bağlanır', () => {
    /* Çalışma zamanı bağlantısı bootstrap superuser'ı kullanmamalı. */
    expect(compose).toMatch(/DATABASE_URL=postgresql:\/\/localakademi_app:/)
    /* Göç adımı sahip rolüyle ayrı yürür — bkz. docker-entrypoint.sh. */
    expect(compose).toMatch(/MIGRATE_DATABASE_URL=postgresql:\/\/localakademi:/)
  })

  it('no literal secrets hardcoded in compose', () => {
    const lines = compose.split('\n').filter(l => l.includes('POSTGRES_PASSWORD='))
    for (const line of lines) {
      expect(line).not.toMatch(/POSTGRES_PASSWORD=[^$]/)
    }
  })

  it('postgres service is not behind a profile (default on)', () => {
    expect(compose).not.toMatch(/profiles:\s*\n\s+- with-pgvector/)
  })

  it('.env.example contains PostgreSQL connection examples', () => {
    expect(envExample).toContain('postgresql://')
    expect(envExample).toContain('hostname differs')
  })

  it('.env.example distinguishes host vs container hostname', () => {
    expect(envExample).toContain('Container backend')
    expect(envExample).toContain('Host backend')
  })

  it('.env.example still documents SQLite as Option A', () => {
    expect(envExample).toContain('Option A')
    expect(envExample).toContain('SQLite')
    expect(envExample).toContain('file:./dev.db')
  })

  it('package.json has db management scripts', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8'))
    expect(pkg.scripts).toHaveProperty('db:up')
    expect(pkg.scripts).toHaveProperty('db:down')
    expect(pkg.scripts).toHaveProperty('db:status')
    expect(pkg.scripts).toHaveProperty('db:logs')
  })

  it('SQLite database files are preserved (not deleted)', () => {
    expect(existsSync(join(import.meta.dirname, '..', 'prisma', 'dev.db'))).toBe(true)
    expect(existsSync(join(import.meta.dirname, '..', 'prisma', 'test.db'))).toBe(true)
  })
})
