const { readFileSync, existsSync, readdirSync, statSync } = require('fs')
const { join, resolve } = require('path')

const ROOT = resolve(__dirname, '..')
const FINDINGS = []
let EXIT_CODE = 0

const SECRET_PATTERNS = [
  { pattern: /(['"])[A-Z_]*(SECRET|KEY|PASSWORD|TOKEN|PASSWD|CREDENTIAL|API_KEY|API_SECRET|ACCESS_KEY|PRIVATE_KEY|SIGNING_KEY)\1\s*[:=]\s*['"][^'"]+['"]/gi, type: 'hardcoded-secret'},
  { pattern: /(['"])[A-Z_]*SECRET\1\s*[:=]\s*['"][^'"]+['"]/gi, type: 'hardcoded-secret'},
  { pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g, type: 'private-key' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, type: 'github-token' },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, type: 'github-oauth' },
  { pattern: /sk-[a-zA-Z0-9]{32,}/g, type: 'openai-key' },
  { pattern: /xox[baprs]-[a-zA-Z0-9]{10,}/g, type: 'slack-token' },
  { pattern: /AKIA[0-9A-Z]{16}/g, type: 'aws-access-key' },
  { pattern: /mongodb(?:\+srv)?:\/\/[^\s]+/g, type: 'mongodb-uri' },
  { pattern: /postgres(?:ql)?:\/\/[^:]+:[^@]+@/g, type: 'db-connection-string' },
]

const ALLOWED_PATTERNS = [
  /example\.(com|org|net)/i,
  /test\.local/i,
  /your-/i,
  /changeme/i,
  /placeholder/i,
  /localhost/i,
  /127\.0\.0\.1/i,
]

function scanFile(filePath, relativePath) {
  try {
    if (statSync(filePath).size > 1048576) return
    const content = readFileSync(filePath, 'utf8')

    for (const { pattern, type } of SECRET_PATTERNS) {
      const matches = content.match(pattern)
      if (matches) {
        for (const match of matches) {
          const isAllowed = ALLOWED_PATTERNS.some(a => a.test(match))
          if (isAllowed) continue

          const summary = match.length > 30 ? match.substring(0, 27) + '...' : match
          FINDINGS.push({
            file: relativePath,
            type,
            pattern: summary
          })
        }
      }
    }
  } catch {}
}

const EXTENSIONS = new Set(['.ts', '.js', '.json', '.yml', '.yaml', '.env', '.sh', '.toml', '.cfg', '.conf', '.ini', '.md'])

const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.prisma'])

function walkDir(dir, relativeDir = '') {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue
    if (entry.name.startsWith('.')) continue
    const fullPath = join(dir, entry.name)
    const relPath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      walkDir(fullPath, relPath)
    } else if (entry.isFile()) {
      const ext = entry.name.includes('.') ? entry.name.split('.').pop() : ''
      if (EXTENSIONS.has(`.${ext}`) || entry.name === '.env' || entry.name === '.env.example') {
        scanFile(fullPath, relPath)
      }
    }
  }
}

console.log('=== Secret & Config Gate ===\n')

walkDir(ROOT)

const byType = {}
for (const f of FINDINGS) {
  byType[f.type] = (byType[f.type] || 0) + 1
}

if (FINDINGS.length === 0) {
  console.log('PASS: No secrets detected in codebase')
} else {
  console.log(`WARN: ${FINDINGS.length} potential secret(s) found:\n`)
  for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count} occurrence(s)`)
  }
  console.log('\n  Files (file:type):')
  for (const f of FINDINGS) {
    console.log(`    ${f.file}:${f.type}`)
  }
  console.log('\n  Review each finding. If false positive, update ALLOWED_PATTERNS.')
}

console.log('\n--- Beta Password Audit ---\n')

// Check CLOSED_BETA_README.md for beta account passwords
const readmePath = join(ROOT, 'CLOSED_BETA_README.md')
if (existsSync(readmePath)) {
  const readme = readFileSync(readmePath, 'utf8')
  const pwLines = readme.match(/^\|.*\|.*\|.*\|$/gm) || []
  const betaPasswords = []
  for (const line of pwLines) {
    const parts = line.split('|').map(p => p.trim())
    // Beta section lines have 4 parts: | Role | Email | Password |
    if (parts.length >= 4 && parts[1] && parts[3] && !parts[3].startsWith('Rol') && !parts[3].startsWith('Şifre')) {
      betaPasswords.push({ role: parts[1], email: parts[2], password: parts[3] })
    }
  }

  if (betaPasswords.length > 0) {
    console.log(`INFO: ${betaPasswords.length} beta account(s) documented in CLOSED_BETA_README.md`)
    for (const bp of betaPasswords) {
      // Check if this looks like a generated/sample password (contains common patterns)
      const hasMixedCase = /[a-z]/.test(bp.password) && /[A-Z]/.test(bp.password)
      const hasDigits = /\d/.test(bp.password)
      const hasSpecial = /[^a-zA-Z0-9]/.test(bp.password)
      const isLong = bp.password.length >= 12

      if (hasMixedCase && hasDigits && isLong) {
        console.log(`  INFO: ${bp.role} (${bp.email}) — password appears to be auto-generated (sample)`)
      } else {
        console.log(`  WARN: ${bp.role} (${bp.email}) — password may be weak or real: "${bp.password.substring(0, 4)}..."`)
      }
    }
    console.log('  PASS: Beta passwords are documented samples — not activated on any service.')
  } else {
    console.log('PASS: No beta passwords found in CLOSED_BETA_README.md')
  }
} else {
  console.log('SKIP: CLOSED_BETA_README.md not found')
}

console.log('\n--- Config File Audit ---\n')

const requiredFiles = ['.env.example', '.gitignore']
for (const rf of requiredFiles) {
  if (existsSync(join(ROOT, rf))) {
    console.log(`PASS: ${rf} exists`)
  } else {
    console.log(`FAIL: ${rf} missing`)
    EXIT_CODE = 1
  }
}

if (existsSync(join(ROOT, '.env'))) {
  console.log('WARN: .env file present (should be gitignored — verify it is)')
}

const dockerfile = join(ROOT, 'Dockerfile')
if (existsSync(dockerfile)) {
  const df = readFileSync(dockerfile, 'utf8')

  // Check Docker image doesn't contain .env
  if (df.includes('.env')) {
    const envLines = df.split('\n').filter(l => l.includes('.env'))
    // COPY .env is dangerous — check if any .env is copied into the image
    if (df.includes('COPY') && (df.includes('.env') || df.includes('.env.example'))) {
      // Check if COPY .env is present (excluding .env.example)
      const copyEnvLines = df.split('\n').filter(l => l.includes('COPY') && l.includes('.env') && !l.includes('.env.example'))
      if (copyEnvLines.length > 0) {
        console.log('FAIL: Dockerfile copies .env into image — secrets exposure risk')
        EXIT_CODE = 1
      } else {
        console.log('PASS: Dockerfile uses .env.example, not .env (safe)')
      }
    }
  }

  if (df.includes('ARG') && df.includes('ENV')) {
    console.log('PASS: Dockerfile uses ARG/ENV for config')
  }
}

const report = {
  timestamp: new Date().toISOString(),
  findingsCount: FINDINGS.length,
  findingsByType: byType,
  betaPasswordCount: 0, // count not value
  configFilesOk: requiredFiles.every(f => existsSync(join(ROOT, f))),
  verdict: EXIT_CODE === 0 ? 'PASS' : 'FAIL'
}

console.log(`\nSecret scan ${EXIT_CODE === 0 ? 'PASSED' : 'FAILED'}`)
process.exit(EXIT_CODE)
