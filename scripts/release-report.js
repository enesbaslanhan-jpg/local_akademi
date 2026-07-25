const { execSync } = require('child_process')
const { existsSync, readFileSync, writeFileSync } = require('fs')
const { join, resolve } = require('path')

const ROOT = resolve(__dirname, '..')
const OUTPUT_PATH = join(ROOT, 'release-report.json')

function run(label, cmd) {
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 60000, stdio: 'pipe' })
    return { status: 'pass', label, detail: out.trim().split('\n').slice(0, 5).join('; ') }
  } catch (e) {
    return { status: 'fail', label, detail: (e.stderr || e.stdout || e.message || '').split('\n')[0].trim().substring(0, 200) }
  }
}

function countLines(dir, exts) {
  try {
    const entries = require('fs').readdirSync(dir, { withFileTypes: true })
    let total = 0
    let files = 0
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.')) {
        const sub = countLines(join(dir, e.name), exts)
        total += sub.lines
        files += sub.files
      } else if (e.isFile() && exts.some(ext => e.name.endsWith(ext))) {
        const content = readFileSync(join(dir, e.name), 'utf8')
        const lineCount = content.split('\n').length
        total += lineCount
        files++
      }
    }
    return { lines: total, files }
  } catch {
    return { lines: 0, files: 0 }
  }
}

async function main() {
  const sections = []

  sections.push({ section: 'Metadata', checks: [
    { key: 'timestamp', value: new Date().toISOString() },
    { key: 'node_version', value: process.version },
    { key: 'platform', value: process.platform },
    { key: 'cwd', value: ROOT },
    { key: 'env.NODE_ENV', value: process.env.NODE_ENV || '(not set)' },
    { key: 'env.BETA_MODE', value: process.env.BETA_MODE || '(not set)' }
  ]})

  const pkg = existsSync(join(ROOT, 'package.json')) ? JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) : {}
  sections.push({ section: 'Package', checks: [
    { key: 'name', value: pkg.name || 'unknown' },
    { key: 'version', value: pkg.version || 'unknown' },
    { key: 'scripts', value: Object.keys(pkg.scripts || {}).join(', ') },
    { key: 'dependencies', value: Object.keys(pkg.dependencies || {}).length.toString() },
    { key: 'devDependencies', value: Object.keys(pkg.devDependencies || {}).length.toString() }
  ]})

  sections.push({ section: 'Build Status', checks: [
    run('TypeScript (tsc --noEmit)', 'npx tsc --noEmit 2>&1'),
    run('Prisma validate', 'npx prisma validate 2>&1'),
    run('Prisma generate', 'npx prisma generate 2>&1'),
    run('Unit tests', 'npx vitest run --reporter=json 2>&1')
  ]})

  sections.push({ section: 'Frontend', checks: [
    run('Frontend build', 'npm run build 2>&1'),
    { key: 'dist/index.html', value: existsSync(join(ROOT, 'frontend', 'dist', 'index.html')) ? 'exists' : 'missing' }
  ]})

  const dockerComposeExists = existsSync(join(ROOT, 'docker-compose.yml'))
  let dockerAvailable = false
  try {
    execSync('docker info', { stdio: 'pipe', timeout: 5000 })
    dockerAvailable = true
  } catch (_) {}

  sections.push({ section: 'Docker', checks: [
    { key: 'docker-compose.yml', value: dockerComposeExists ? 'exists' : 'missing' },
    { key: 'Dockerfile', value: existsSync(join(ROOT, 'Dockerfile')) ? 'exists' : 'missing' },
    { key: 'docker-daemon', value: dockerAvailable ? 'available' : 'unavailable' },
    ...(dockerAvailable
      ? [run('docker compose config', 'docker compose config 2>&1')]
      : [{ key: 'docker-compose-config', value: 'UNVERIFIED (no daemon)', status: 'unverified' }])
  ]})

  sections.push({ section: 'Migrations', checks: [
    { key: 'migrations_dir', value: existsSync(join(ROOT, 'prisma', 'migrations')) ? 'exists' : 'missing' },
    ...(process.env.DATABASE_URL
      ? [run('Migration status', 'npx prisma migrate status 2>&1')]
      : [{ key: 'Migration status', value: 'SKIPPED (no DATABASE_URL)', status: 'skipped' }])
  ]})

  // File count stats
  const srcStats = countLines(join(ROOT, 'src'), ['.ts', '.js'])
  const testStats = countLines(join(ROOT, 'tests'), ['.ts', '.js'])
  const scriptStats = countLines(join(ROOT, 'scripts'), ['.ts', '.js'])
  const totalFiles = srcStats.files + testStats.files + scriptStats.files
  const totalLines = srcStats.lines + testStats.lines + scriptStats.lines

  sections.push({ section: 'Codebase Stats', checks: [
    { key: 'src_files', value: srcStats.files.toString() },
    { key: 'src_lines', value: srcStats.lines.toString() },
    { key: 'test_files', value: testStats.files.toString() },
    { key: 'test_lines', value: testStats.lines.toString() },
    { key: 'script_files', value: scriptStats.files.toString() },
    { key: 'script_lines', value: scriptStats.lines.toString() },
    { key: 'total_files', value: totalFiles.toString() },
    { key: 'total_lines', value: totalLines.toString() }
  ]})

  sections.push({ section: 'Config Audit', checks: [
    { key: '.env.example', value: existsSync(join(ROOT, '.env.example')) ? 'exists' : 'missing' },
    { key: '.gitignore', value: existsSync(join(ROOT, '.gitignore')) ? 'exists' : 'missing' },
    { key: '.env present', value: existsSync(join(ROOT, '.env')) ? 'WARN: present' : 'not present (good)' }
  ]})

  // Determine overall verdict
  let allFailed = 0
  let allUnverified = 0
  let allPassed = 0
  let totalChecks = 0
  for (const s of sections) {
    for (const c of s.checks) {
      totalChecks++
      if (c.status === 'fail') allFailed++
      else if (c.status === 'unverified') allUnverified++
      else allPassed++
    }
  }

  // Cross-check with verify:release verdict
  const gateReportPath = join(ROOT, 'release-gate-report.json')
  let gateVerdict = null
  if (existsSync(gateReportPath)) {
    try {
      const gateReport = JSON.parse(readFileSync(gateReportPath, 'utf8'))
      gateVerdict = gateReport.verdict
      if (gateReport.summary.unverified > 0) allUnverified++
    } catch {}
  }

  let overall
  if (allFailed > 0 || gateVerdict === 'BLOCKED') {
    overall = 'BLOCKED'
  } else if (allUnverified > 0 || gateVerdict === 'PARTIAL') {
    overall = 'PARTIAL'
  } else {
    overall = 'RELEASE_READY'
  }

  const report = {
    reportType: 'release',
    timestamp: new Date().toISOString(),
    overall,
    sections,
    summary: {
      totalChecks,
      passed: allPassed,
      failed: allFailed,
      unverified: allUnverified
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2))
  console.log(`Report saved to ${OUTPUT_PATH}`)
  console.log(`Overall: ${report.overall}`)
  console.log(`Passed: ${report.summary.passed}/${report.summary.totalChecks}`)

  if (report.summary.failed > 0) {
    process.exit(1)
  }
}

main()
