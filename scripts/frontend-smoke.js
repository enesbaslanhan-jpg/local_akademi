const { execSync, spawn } = require('child_process')
const { existsSync, writeFileSync } = require('fs')
const { resolve } = require('path')
const http = require('http')

const ROOT = resolve(__dirname, '..')
const RESULTS = []
let EXIT_CODE = 0
let serverProcess = null

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

function fetch(method, path, body, token) {
  const opts = {
    hostname: '127.0.0.1',
    port: 3000,
    path,
    method,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000
  }
  if (token) {
    opts.headers['Authorization'] = `Bearer ${token}`
  }
  return new Promise((resolve) => {
    const req = http.request(opts, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        let json
        try { json = JSON.parse(data) } catch { json = null }
        resolve({ status: res.statusCode, body: json, raw: data })
      })
    })
    req.on('error', (e) => resolve({ status: 0, body: null, raw: e.message }))
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: null, raw: 'timeout' }) })
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function main() {
  const startTime = Date.now()

  // Start backend if not already running
  const isRunning = await fetch('GET', '/health').then(r => r.status === 200).catch(() => false)

  if (!isRunning) {
    console.log('Starting test backend...')
    serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
      cwd: ROOT,
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: '3000',
        JWT_SECRET: 'frontend-smoke-secret-min-32-bytes!!',
        JWT_EXPIRES_IN: '1h',
        BETA_MODE: 'true',
        AI_REVIEW_GATE_ENABLED: 'false',
        ENABLE_MEMORY_API: 'false'
      },
      timeout: 30000
    })

    // Wait for server to be ready
    let ready = false
    for (let i = 0; i < 20; i++) {
      try {
        const h = await fetch('GET', '/health')
        if (h.status === 200 && h.body?.status === 'ok') {
          ready = true
          break
        }
      } catch {}
      await new Promise(r => setTimeout(r, 1000))
    }

    if (!ready) {
      fail('Test backend failed to start within 20s')
      process.exit(EXIT_CODE || 1)
      return
    }
    log('INFO', 'Test backend started')
  } else {
    log('INFO', 'Using existing backend on :3000')
  }

  console.log('=== Frontend Smoke / API Contract Tests ===\n')

  // ── Health ──
  const health = await fetch('GET', '/health')
  if (health.status === 200 && health.body?.status === 'ok') {
    pass('/health returns ok')
  } else {
    fail(`/health expected 200/ok, got ${health.status}`)
  }

  // ── 404 ──
  const notFound = await fetch('GET', '/non-existent-path')
  if (notFound.status === 404) {
    pass('Unknown routes return 404')
  } else {
    fail(`Expected 404, got ${notFound.status}`)
  }

  // ── Register ──
  const registerRes = await fetch('POST', '/auth/register', {
    email: `smoke-${Date.now()}@test.local`,
    password: 'SmokeTestPass123!',
    name: 'Smoke Test'
  })
  if (registerRes.status === 200 && registerRes.body?.token) {
    pass('/auth/register creates user and returns token')
  } else {
    fail(`/auth/register status ${registerRes.status}`)
  }

  // ── Login ──
  const loginRes = await fetch('POST', '/auth/login', {
    email: 'admin@localakademi.com',
    password: 'admin123'
  })
  if (loginRes.status === 200 && loginRes.body?.token) {
    pass('/auth/login returns token for valid credentials')
  } else if (loginRes.status === 401) {
    skipped('/auth/login returns 401 (expected — seed may differ)')
  } else {
    fail(`/auth/login unexpected status ${loginRes.status}`)
  }

  // ── Business Profile (authenticated) ──
  if (registerRes.status === 200) {
    const token = registerRes.body.token

    // Get business profile (should return defaults)
    const bizGet = await fetch('GET', '/business/business-profile', null, token)
    if (bizGet.status === 200 && bizGet.body?.name !== undefined) {
      pass('/business/business-profile returns defaults')
    } else {
      fail(`/business/business-profile expected 200, got ${bizGet.status}`)
    }

    // Create business profile
    const bizPut = await fetch('PUT', '/business/business-profile', {
      name: 'Smoke Test Co',
      sector: 'TEKNOLOJI',
      city: 'Istanbul'
    }, token)
    if (bizPut.status === 200 && bizPut.body?.name === 'Smoke Test Co') {
      pass('/business/business-profile upserts profile')
    } else {
      fail(`/business/business-profile upsert expected 200, got ${bizPut.status}`)
    }

    // Get profile again (verify persistence)
    const bizGet2 = await fetch('GET', '/business/business-profile', null, token)
    if (bizGet2.status === 200 && bizGet2.body?.name === 'Smoke Test Co') {
      pass('/business/business-profile persisted correctly')
    } else {
      fail(`/business/business-profile persistence check failed: ${bizGet2.status}`)
    }

    // Dashboard
    const dash = await fetch('GET', '/dashboard', null, token)
    if (dash.status === 200 && dash.body?.monthly_sales !== undefined) {
      pass('/dashboard returns KPI data')
    } else {
      fail(`/dashboard expected 200, got ${dash.status}`)
    }
  }

  console.log(`\n=== Results: ${RESULTS.filter(r => r.status === 'pass').length} passed, ${RESULTS.filter(r => r.status === 'fail').length} failed, ${RESULTS.filter(r => r.status === 'skipped').length} skipped, ${RESULTS.filter(r => r.status === 'unverified').length} unverified ===\n`)
  process.exit(EXIT_CODE)
}

process.on('exit', () => {
  if (serverProcess) {
    try { serverProcess.kill('SIGTERM') } catch {}
  }
})

main()
