import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'fs'
import { execFileSync } from 'child_process'
import { dirname, extname, join, relative, resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const reportPath = join(root, 'outputs', 'security-acceptance.json')
const findings: Array<{ file: string; type: string }> = []
const scannedExtensions = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md',
  '.yml', '.yaml', '.toml', '.ini', '.conf',
])
const excludedDirectories = new Set([
  'node_modules', '.git', 'dist', 'coverage', 'BACKUPS',
  'outputs', '.prisma',
])
const highConfidencePatterns = [
  { type: 'nvidia_api_key', pattern: /nvapi-[A-Za-z0-9_-]{32,}/g },
  { type: 'openai_api_key', pattern: /sk-[A-Za-z0-9_-]{32,}/g },
  { type: 'github_token', pattern: /gh[op]_[A-Za-z0-9]{30,}/g },
  { type: 'slack_token', pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/g },
  { type: 'aws_access_key', pattern: /AKIA[0-9A-Z]{16}/g },
  {
    type: 'private_key',
    pattern:
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\r\n]{64,}\s+-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
]

function walk(directory: string): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (excludedDirectories.has(entry.name)) continue
    const fullPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.')) walk(fullPath)
      continue
    }
    if (!entry.isFile()) continue
    if (entry.name === '.env') continue
    if (!scannedExtensions.has(extname(entry.name))) continue
    if (statSync(fullPath).size > 2 * 1024 * 1024) continue
    const content = readFileSync(fullPath, 'utf8')
    for (const candidate of highConfidencePatterns) {
      candidate.pattern.lastIndex = 0
      if (candidate.pattern.test(content)) {
        findings.push({
          file: relative(root, fullPath).replaceAll('\\', '/'),
          type: candidate.type,
        })
      }
    }
  }
}

function parseEnvSafely(): Record<string, string> {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return {}
  const result: Record<string, string> = {}
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator < 1) continue
    result[trimmed.slice(0, separator)] = trimmed.slice(separator + 1)
  }
  return result
}

function inspectLatestArchive() {
  const parent = dirname(root)
  const archives = readdirSync(parent)
    .filter(name => /^LocalAkademi_.*\.zip$/i.test(name))
    .map(name => ({
      name,
      path: join(parent, name),
      modifiedAt: statSync(join(parent, name)).mtimeMs,
    }))
    .sort((left, right) => right.modifiedAt - left.modifiedAt)
  const latest = archives[0]
  if (!latest) {
    return {
      found: false,
      envExcluded: false,
      nodeModulesExcluded: false,
    }
  }
  const entries = execFileSync('tar.exe', ['-tf', latest.path], {
    encoding: 'utf8',
    timeout: 30000,
  }).split(/\r?\n/)
  return {
    found: true,
    name: latest.name,
    envExcluded: !entries.some(entry => /\/\.env$/.test(entry)),
    nodeModulesExcluded: !entries.some(entry =>
      /\/node_modules\//.test(entry),
    ),
  }
}

walk(root)
const localEnv = parseEnvSafely()
const gitignore = existsSync(join(root, '.gitignore'))
  ? readFileSync(join(root, '.gitignore'), 'utf8')
  : ''
const archive = inspectLatestArchive()
const externalActions: string[] = []
if (
  localEnv.NVIDIA_API_KEY &&
  !localEnv.NVIDIA_API_KEY_ROTATED_AT
) {
  externalActions.push(
    'NVIDIA API anahtarını sağlayıcı panelinde döndür ve NVIDIA_API_KEY_ROTATED_AT ekle',
  )
}

const automatedGates = {
  highConfidenceSecretsOutsideEnv: findings.length === 0,
  envIgnored: gitignore.split(/\r?\n/).includes('.env'),
  databasesIgnored: gitignore.includes('*.db'),
  backupsIgnored: gitignore.split(/\r?\n/).includes('BACKUPS/'),
  archiveFound: archive.found,
  archiveEnvExcluded: archive.envExcluded,
  archiveNodeModulesExcluded: archive.nodeModulesExcluded,
  jwtSecretConfigured:
    (localEnv.JWT_SECRET?.length || 0) >= 32 &&
    !/changeme|default|example/i.test(localEnv.JWT_SECRET || ''),
}
const automatedPass = Object.values(automatedGates).every(Boolean)
const report = {
  generatedAt: new Date().toISOString(),
  automatedPass,
  productionReady:
    automatedPass && externalActions.length === 0,
  automatedGates,
  findings,
  archive,
  externalActions,
  secretsPrinted: false,
}
writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
if (!automatedPass) process.exitCode = 1
