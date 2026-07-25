import { PrismaClient } from '@prisma/client'
import { execSync, spawn, ChildProcess } from 'child_process'
import { join } from 'path'

const p = new PrismaClient()
const BASE = 'http://localhost:3000'
let serverProcess: ChildProcess | null = null
let adminToken = ''

function fetch(method: string, path: string, body?: any, token?: string) {
  const url = `${BASE}${path}`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const cmd = `curl -s -X ${method} "${url}" -H "${Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('" -H "')}" ${body ? `-d '${JSON.stringify(body).replace(/'/g, "'\\''")}'` : ''}`
  return execSync(cmd, { encoding: 'utf-8', shell: 'powershell.exe', timeout: 10000 })
}

async function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const serverPath = join(__dirname, '..', 'src', 'index.ts')
    serverProcess = spawn('npx', ['tsx', serverPath], {
      cwd: join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    })
    let started = false
    const timeout = setTimeout(() => {
      if (!started) reject(new Error('Server start timeout'))
    }, 15000)
    serverProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      if (text.includes('listening') || text.includes('localhost:3000')) {
        started = true
        clearTimeout(timeout)
        // Small delay for stability
        setTimeout(resolve, 500)
      }
    })
    serverProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      if (text.includes('listening') || text.includes('localhost:3000')) {
        if (!started) {
          started = true
          clearTimeout(timeout)
          setTimeout(resolve, 500)
        }
      }
    })
    serverProcess.on('error', (err) => { clearTimeout(timeout); reject(err) })
  })
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
    serverProcess = null
  }
}

async function main() {
  let passed = 0
  let failed = 0
  function assert(condition: boolean, label: string) {
    if (condition) { passed++; console.log(`  ✅ ${label}`) }
    else { failed++; console.log(`  ❌ ${label}`) }
  }

  console.log('=== IMPORT ENDPOINT TESTS ===\n')

  // 1. Start server
  console.log('Starting server...')
  try {
    await startServer()
    console.log('Server started OK\n')
  } catch (e) {
    console.error('Failed to start server:', e)
    process.exit(1)
  }

  try {
    // 2. Login as admin
    const loginResp = JSON.parse(fetch('POST', '/auth/login', { email: 'admin@localakademi.com', password: 'admin123' }))
    adminToken = loginResp.token
    assert(!!adminToken, 'Admin login successful, got token')

    // 3. Test: validation error - no title
    const badImport = [{ noTitle: true }]
    const badResp = JSON.parse(fetch('POST', '/api/v2/admin/knowledge-objects/import/preview', badImport, adminToken))
    assert(badResp.valid === false, 'Validation catches missing title')

    // 4. Test: validation error - invalid format
    const invalidFormat = JSON.parse(fetch('POST', '/api/v2/admin/knowledge-objects/import/preview', { wrong: 'format' }, adminToken))
    assert(invalidFormat.valid === false, 'Invalid format returns error')

    // 5. Test: duplicate code (already in DB)
    const dupImport = { knowledgeObjects: [{ code: 'DIG-MATURITY-001', title: 'Dup', type: 'concept', status: 'draft', isDemo: false }] }
    const dupResp = JSON.parse(fetch('POST', '/api/v2/admin/knowledge-objects/import/preview', dupImport, adminToken))
    assert(dupResp.valid === false && dupResp.errors.some((e: any) => e.errorCode === 'DUPLICATE_CODE'), 'Duplicate code detection works')

    // 6. Test: slug already exists
    const slugDup = { knowledgeObjects: [{ code: 'SLUG-TEST-001', slug: 'dijital-olgunluk-degerlendirme', title: 'Slug Dup', type: 'concept', status: 'draft', isDemo: false }] }
    const slugResp = JSON.parse(fetch('POST', '/api/v2/admin/knowledge-objects/import/preview', slugDup, adminToken))
    assert(slugResp.valid === false && slugResp.errors.some((e: any) => e.errorCode === 'DUPLICATE_SLUG'), 'Duplicate slug detection works')

    // 7. Test: status=published blocked
    const pubImport = { knowledgeObjects: [{ code: 'PUB-TEST-001', title: 'Pub Test', type: 'concept', status: 'published', isDemo: false }] }
    const pubResp = JSON.parse(fetch('POST', '/api/v2/admin/knowledge-objects/import/preview', pubImport, adminToken))
    assert(pubResp.valid === false && pubResp.errors.some((e: any) => e.errorCode === 'IMPORT_CANNOT_PUBLISH'), 'published status blocked')

    // 8. Test: valid import preview for a fresh KO
    const validImport = { knowledgeObjects: [{ code: 'ENDPOINT-TEST-001', slug: 'endpoint-test-001', title: 'Endpoint Test KO', type: 'concept', content: 'Test content', status: 'draft', isDemo: false, verificationStatus: 'source_verified', reviewGate: 'standard', version: 1, categorySlug: 'dijitallesme-teknoloji', sources: [], publishedAt: null }] }
    const prevResp = JSON.parse(fetch('POST', '/api/v2/admin/knowledge-objects/import/preview', validImport, adminToken))
    assert(prevResp.valid === true, 'Valid preview returns valid=true')
    assert(prevResp.summary.wouldCreate === 1, 'wouldCreate = 1')

    // 9. Test: commit the valid import
    const commitResp = JSON.parse(fetch('POST', '/api/v2/admin/knowledge-objects/import/commit', validImport, adminToken))
    assert(commitResp.valid === true, 'Commit returns valid=true')
    assert(commitResp.summary.created === 1, 'Created = 1')
    assert(!!commitResp.importJobId, 'ImportJob ID returned')

    // 10. Verify ImportJob record
    const job = await p.importJob.findUnique({ where: { id: commitResp.importJobId } })
    assert(!!job, 'ImportJob exists in DB')
    assert(job!.status === 'completed', 'ImportJob status = completed')
    assert(job!.totalRows === 1, 'ImportJob totalRows = 1')
    const errCount = await p.importJobError.count({ where: { importJobId: job!.id } })
    assert(errCount === 0, 'ImportJob errorCount = 0')

    // 11. Verify KO created via endpoint
    const testKo = await p.knowledgeObject.findUnique({ where: { code: 'ENDPOINT-TEST-001' } })
    assert(!!testKo, 'KO created in DB via endpoint')
    assert(testKo!.status === 'draft', 'KO status = draft')
    assert(testKo!.isDemo === false, 'KO isDemo = false')
    assert(testKo!.verificationStatus === 'source_verified', 'KO verificationStatus = source_verified')

    // 12. Test: duplicate commit blocked
    const dupCommit = JSON.parse(fetch('POST', '/api/v2/admin/knowledge-objects/import/commit', validImport, adminToken))
    assert(dupCommit.valid === false, 'Duplicate commit blocked')

    // 13. Test: auth required
    const noAuth = JSON.parse(fetch('POST', '/api/v2/admin/knowledge-objects/import/preview', validImport, ''))
    assert(noAuth.error || noAuth.statusCode === 401 || noAuth.message, 'Auth required for import')

    console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`)

    // Cleanup: remove test KO
    if (testKo) {
      await p.knowledgeObjectSource.deleteMany({ where: { koId: testKo.id } })
      await p.knowledgeObjectVersion.deleteMany({ where: { koId: testKo.id } })
      await p.knowledgeObject.delete({ where: { id: testKo.id } })
      console.log('Cleaned up test KO: ENDPOINT-TEST-001')
    }
  } finally {
    stopServer()
    await p.$disconnect()
  }
}

main().catch(e => { console.error('FATAL:', e); stopServer(); process.exit(1) })
