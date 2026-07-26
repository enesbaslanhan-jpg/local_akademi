const { execSync, spawn } = require('child_process')
const { existsSync, readFileSync, writeFileSync } = require('fs')
const { join, resolve } = require('path')

const ROOT = resolve(__dirname, '..')
const RESULTS = []
let EXIT_CODE = 0
const REPORT_PATH = join(ROOT, 'release-gate-report.json')

function log(icon, msg) {
  console.log(`${icon} ${msg}`)
}

function pass(msg) {
  log('PASS', msg)
  RESULTS.push({ status: 'pass', message: msg })
}

function fail(msg) {
  log('FAIL', msg)
  RESULTS.push({ status: 'fail', message: msg })
  EXIT_CODE = 1
}

function skipped(msg) {
  log('SKIP', msg)
  RESULTS.push({ status: 'skipped', message: msg })
}

function unverified(msg) {
  log('UNVERIFIED', msg)
  RESULTS.push({ status: 'unverified', message: msg })
}

function run(cmd, label) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'pipe', timeout: 120000, encoding: 'utf8' })
    pass(label)
    return true
  } catch (e) {
    const stderr = e.stderr || ''
    const stdout = e.stdout || ''
    const firstErrLine = (stderr || stdout).split('\n').slice(0, 3).join(' | ').trim()
    fail(`${label}: ${firstErrLine || e.message}`)
    return false
  }
}

async function main() {
  const startTime = Date.now()

  console.log('=== verify:release — Closed Pilot Release Gate ===\n')

  // ── Gate 1: npm install ──
  if (process.env.SKIP_NPM_INSTALL === 'true') {
    skipped('npm install (SKIP_NPM_INSTALL=true)')
  } else {
    run('npm install --prefer-offline --no-audit --no-fund', 'npm install')
  }

  // ── Gate 2: Unit tests ──
  run('node_modules\\.bin\\vitest.cmd run --reporter=verbose', 'Unit tests (vitest)')

  // ── Gate 3: TypeScript check ──
  run('npx tsc --noEmit 2>&1', 'TypeScript (backend) check')

  // ── Gate 4: Frontend build ──
  run('npm run build 2>&1', 'Frontend build (npm run build)')

  // ── Gate 5: Frontend dist/index.html existence ──
  if (existsSync(join(ROOT, 'frontend', 'dist', 'index.html'))) {
    pass('Frontend dist/index.html exists')
  } else {
    fail('Frontend dist/index.html not found')
  }

  // ── Gate 6: Prisma schema validation ──
  run('npx prisma validate 2>&1', 'Prisma schema validation')

  // ── Gate 7: Migration files check ──
  try {
    const migrationsDir = join(ROOT, 'prisma', 'migrations')
    if (existsSync(migrationsDir)) {
      const dirs = require('fs').readdirSync(migrationsDir).filter(d => /^\d/.test(d) || d.startsWith('migration'))
      if (dirs.length > 0) {
        pass(`Migration files detected (${dirs.length} directories under prisma/migrations)`)
      } else {
        fail('prisma/migrations is empty')
      }
    } else {
      fail('prisma/migrations directory not found')
    }
  } catch (e) {
    fail(`Migration check: ${e.message}`)
  }

  // ── Gate 8: docker compose config ──
  try {
    const dockerCompose = join(ROOT, 'docker-compose.yml')
    if (existsSync(dockerCompose)) {
      execSync('docker compose config', { cwd: ROOT, stdio: 'pipe', timeout: 30000 })
      pass('docker compose config valid')
    } else {
      skipped('docker-compose.yml not found')
    }
  } catch (e) {
    fail(`docker compose config: ${e.message.split('\n')[0]}`)
  }

  // ── Gate 9: Dockerfile + Docker image build/container healthcheck ──
  const dockerfile = join(ROOT, 'Dockerfile')
  if (existsSync(dockerfile)) {
    const content = readFileSync(dockerfile, 'utf8')
    const checks = []
    if (content.includes('FROM')) checks.push('FROM instruction')
    if (content.includes('EXPOSE') || content.includes('PORT')) checks.push('EXPOSE/PORT')
    pass(`Dockerfile static: ${checks.join(', ')}`)

    let dockerAvailable = false
    try {
      execSync('docker info', { stdio: 'pipe', timeout: 10000 })
      dockerAvailable = true
    } catch (_) {}

    if (dockerAvailable) {
      const tag = `localakademi-e2e-${Date.now()}`
      console.log(`\n--- Docker image build (tag: ${tag}) ---`)
      try {
        execSync(`docker build -t ${tag} .`, { cwd: ROOT, stdio: 'pipe', timeout: 600000 })
        pass(`Docker image built (${tag})`)

        // Check image for .env
        try {
          const imageCheck = execSync(`docker run --rm ${tag} sh -c "test -f /app/.env && echo FOUND || echo NOT_FOUND"`, { encoding: 'utf8', timeout: 10000 }).trim()
          if (imageCheck.includes('NOT_FOUND')) {
            pass('Docker image does not contain .env file')
          } else {
            fail('Docker image contains .env file — secrets exposure risk')
          }
        } catch (_) {
          unverified('Could not verify .env absence in image')
        }

        const containerName = `localakademi-test-${Date.now()}`
        console.log(`\n--- Starting container ${containerName} ---`)
        execSync([
          'docker', 'run', '--rm', '-d',
          '--name', containerName,
          '-e', 'DATABASE_URL=postgresql://localakademi:localakademi@host.docker.internal:5432/localakademi_ci?schema=public',
          '-e', 'JWT_SECRET=e2e-docker-secret-key-min-32-bytes-long!!',
          '-e', 'JWT_EXPIRES_IN=1h',
          '-e', 'NODE_ENV=production',
          '-e', 'BETA_MODE=true',
          '-e', 'AI_REVIEW_GATE_ENABLED=false',
          '-e', 'ENABLE_MEMORY_API=false',
          '-v', `${join(ROOT, 'prisma')}:/app/prisma`,
          '-p', '0:3000',
          tag
        ].join(' '), { stdio: 'pipe', timeout: 30000 })

        // Poll for health
        let assignedPort = null
        for (let i = 0; i < 10; i++) {
          try {
            const inspectJson = execSync(
              `docker inspect ${containerName}`,
              { encoding: 'utf8', timeout: 5000 }
            ).trim()
            const data = JSON.parse(inspectJson)
            if (Array.isArray(data) && data[0]?.NetworkSettings?.Ports?.['3000/tcp']?.[0]?.HostPort) {
              assignedPort = parseInt(data[0].NetworkSettings.Ports['3000/tcp'][0].HostPort, 10)
              if (!isNaN(assignedPort)) break
            }
          } catch (_) {}
          await sleep(1000)
        }

        if (!assignedPort) {
          unverified('Docker container port detection failed')
          try { execSync(`docker kill ${containerName} 2>nul`, { stdio: 'pipe' }) } catch {}
          try { execSync(`docker rm -f ${containerName} 2>nul`, { stdio: 'pipe' }) } catch {}
        } else {
          // Health check polling
          let healthOk = false
          for (let i = 0; i < 20; i++) {
            try {
              const hc = execSync(
                `curl -sf http://127.0.0.1:${assignedPort}/health`,
                { encoding: 'utf8', timeout: 5000 }
              )
              if (hc.includes('"status"') || hc.includes('ok')) {
                healthOk = true
                break
              }
            } catch (_) {}
            await sleep(1500)
          }

          if (healthOk) {
            pass(`Docker container /health returns 200 (port ${assignedPort})`)
          } else {
            fail('Docker container /health did not return 200 within 30s')
          }

          // Non-root check
          try {
            const whoami = execSync(`docker exec ${containerName} whoami`, { encoding: 'utf8', timeout: 5000 }).trim()
            if (whoami === 'node' || whoami === 'nobody') {
              pass(`Docker container runs as ${whoami} (non-root)`)
            } else {
              unverified(`Docker container runs as ${whoami} (expected node or nobody)`)
            }
          } catch (_) {
            unverified('Could not verify container user')
          }

          // Volume writable
          try {
            execSync(`docker exec ${containerName} touch /app/uploads/test-write.tmp`, { encoding: 'utf8', timeout: 5000 })
            execSync(`docker exec ${containerName} rm /app/uploads/test-write.tmp`, { encoding: 'utf8', timeout: 5000 })
            pass('Docker /app/uploads writable')
          } catch (_) {
            fail('Docker /app/uploads not writable')
          }

          // SIGTERM graceful shutdown
          const sigtermOk = await trySigtermShutdown(containerName)
          if (sigtermOk === true) {
            pass('Docker container stopped gracefully on SIGTERM')
          } else if (sigtermOk === 'unverified') {
            unverified('Docker container did not respond to SIGTERM — server lacks SIGTERM handler (code change needed)')
          } else {
            fail('Docker container did not stop on SIGTERM')
          }

          // Ensure container is removed
          try { execSync(`docker rm -f ${containerName} 2>nul`, { stdio: 'pipe' }) } catch {}
        }

        // Cleanup image
        try { execSync(`docker rmi ${tag} 2>nul`, { stdio: 'pipe' }) } catch {}
      } catch (e) {
        fail(`Docker build: ${e.message.split('\n')[0]}`)
      }
    } else {
      unverified('Docker daemon not available — image build & container healthcheck skipped')
    }
  } else {
    skipped('Dockerfile not found')
  }

  // ── Gate 10: Config files (.gitignore, .env.example) ──
  try {
    const gitignore = join(ROOT, '.gitignore')
    const envExample = join(ROOT, '.env.example')
    if (existsSync(gitignore)) {
      const gi = readFileSync(gitignore, 'utf8')
      if (gi.includes('.env') && gi.includes('node_modules')) {
        pass('.gitignore has .env and node_modules entries')
      } else {
        fail('.gitignore missing essential entries (.env, node_modules)')
      }
    } else {
      fail('.gitignore not found')
    }
    if (existsSync(envExample)) {
      pass('.env.example exists')
    } else {
      fail('.env.example not found')
    }
  } catch (e) {
    fail(`Config check: ${e.message}`)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const passed = RESULTS.filter(r => r.status === 'pass').length
  const failed = RESULTS.filter(r => r.status === 'fail').length
  const skippedCount = RESULTS.filter(r => r.status === 'skipped').length
  const unverifiedCount = RESULTS.filter(r => r.status === 'unverified').length

  let verdict
  if (failed > 0) {
    verdict = 'BLOCKED'
  } else if (unverifiedCount > 0) {
    verdict = 'PARTIAL'
  } else {
    verdict = 'RELEASE_READY'
  }

  console.log(`\n=== Summary: ${passed} passed, ${failed} failed, ${skippedCount} skipped, ${unverifiedCount} unverified (${elapsed}s) ===`)

  const report = {
    timestamp: new Date().toISOString(),
    duration: `${elapsed}s`,
    summary: { passed, failed, skipped: skippedCount, unverified: unverifiedCount, total: RESULTS.length },
    gates: RESULTS,
    exitCode: EXIT_CODE,
    verdict
  }

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  console.log(`\nReport saved to ${REPORT_PATH}`)

  if (verdict !== 'RELEASE_READY') {
    if (verdict === 'BLOCKED') {
      console.log('\nSome gates failed. Fix above issues before releasing.')
    } else {
      console.log(`\nVerdict: ${verdict} — unverified gates exist. Manual verification required.`)
    }
    process.exit(EXIT_CODE || 1)
  } else {
    console.log('\nAll gates passed. Ready for release.')
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function trySigtermShutdown(containerName) {
  // Send SIGTERM — server doesn't handle SIGTERM, so this may not work
  try {
    execSync(`docker kill -s TERM ${containerName}`, { timeout: 5000 })
  } catch (_) {
    return 'unverified' // already gone
  }

  // Wait a few seconds for graceful shutdown
  await sleep(5000)

  // Check if container stopped
  try {
    const json = execSync(`docker inspect ${containerName}`, { encoding: 'utf8', timeout: 3000 }).trim()
    const data = JSON.parse(json)
    const status = Array.isArray(data) && data[0]?.State?.Status
    if (status === 'exited' || status === 'removed') {
      return true
    }
    // Container still running — force kill
    execSync(`docker kill ${containerName} 2>nul`, { stdio: 'pipe', timeout: 5000 })
    return 'unverified'
  } catch {
    return true
  }
}

main()
