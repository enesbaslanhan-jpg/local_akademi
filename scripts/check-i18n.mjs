import { readFileSync, readdirSync } from 'node:fs'
import { resolve, relative, sep } from 'node:path'

const repoRoot = process.cwd()
const localeRoot = resolve(repoRoot, 'frontend/src/i18n/locales')
const sourceRoot = resolve(repoRoot, 'frontend/src')
const languages = ['tr', 'en']
const PLURAL_SUFFIXES = ['', '_zero', '_one', '_two', '_few', '_many', '_other']
const errors = []
const warnings = []

function flatten(value, prefix = '', output = {}) {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, output)
    else output[path] = child
  }
  return output
}

function placeholders(value) {
  return [...String(value).matchAll(/{{\s*([^},\s]+)[^}]*}}/g)].map(match => match[1]).sort()
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path)
    return /\.(?:jsx|js)$/.test(entry.name) && !/\.(?:test|spec)\.[jt]sx?$/.test(entry.name) ? [path] : []
  })
}

const files = readdirSync(resolve(localeRoot, 'tr')).filter(file => file.endsWith('.json')).sort()
const catalogs = {}
let keyCount = 0
for (const file of files) {
  const namespace = file.slice(0, -5)
  const perLanguage = Object.fromEntries(languages.map(language => {
    try { return [language, flatten(JSON.parse(readFileSync(resolve(localeRoot, language, file), 'utf8')))] }
    catch (error) { errors.push(`${language}/${file}: ${error.message}`); return [language, {}] }
  }))
  catalogs[namespace] = perLanguage.tr
  const keys = new Set([...Object.keys(perLanguage.tr), ...Object.keys(perLanguage.en)])
  keyCount += keys.size
  for (const key of keys) {
    for (const language of languages) {
      if (!(key in perLanguage[language])) errors.push(`${language}/${file}: missing key ${key}`)
      else if (typeof perLanguage[language][key] !== 'string' || !perLanguage[language][key].trim()) errors.push(`${language}/${file}: empty/non-string value ${key}`)
    }
    if (key in perLanguage.tr && key in perLanguage.en) {
      const trArgs = placeholders(perLanguage.tr[key])
      const enArgs = placeholders(perLanguage.en[key])
      if (trArgs.join('|') !== enArgs.join('|')) errors.push(`${file}:${key}: placeholder mismatch tr=[${trArgs}] en=[${enArgs}]`)
    }
  }
}
for (const file of readdirSync(resolve(localeRoot, 'en')).filter(file => file.endsWith('.json'))) if (!files.includes(file)) errors.push(`en/${file}: namespace is missing in tr`)

function namespacesIn(source) {
  const values = new Set()
  for (const match of source.matchAll(/useTranslation\(\s*(\[[^\]]*\]|['"][^'"]+['"])?/g)) {
    const argument = match[1]
    if (!argument) continue
    for (const namespace of argument.matchAll(/['"]([^'"]+)['"]/g)) values.add(namespace[1])
  }
  if (!values.size) values.add('common')
  return [...values]
}
function hasKey(namespace, key) {
  const catalog = catalogs[namespace]
  if (!catalog || !key) return false
  /* i18next JSON v4: kod bare anahtarı çağırır, çoğul ekini i18next
     `count`a göre seçer. Katalogda ekli biçim varsa anahtar VARDIR. */
  if (PLURAL_SUFFIXES.some(suffix => Object.prototype.hasOwnProperty.call(catalog, key + suffix))) return true
  /* Dinamik önek: alt ağaçta en az bir anahtar varsa geçerli. */
  return Object.keys(catalog).some(candidate => candidate.startsWith(`${key}.`))
}
function verifyKey(rawKey, namespaces, file) {
  const [explicitNamespace, key] = rawKey.includes(':') ? rawKey.split(/:(.*)/s) : [null, rawKey]
  const candidates = explicitNamespace ? [explicitNamespace] : namespaces
  const namespaceRoot = explicitNamespace && !key && Object.prototype.hasOwnProperty.call(catalogs, explicitNamespace)
  if (!namespaceRoot && !candidates.some(namespace => hasKey(namespace, key))) {
    const where = relative(repoRoot, file).split(sep).join('/')
    errors.push(`${where}: unresolved i18n key ${explicitNamespace ? rawKey : `${rawKey} (searched: ${candidates.join(', ')})`}`)
  }
}

for (const file of sourceFiles(sourceRoot)) {
  const source = readFileSync(file, 'utf8')
  const namespaces = namespacesIn(source)
  for (const match of source.matchAll(/\bt\(\s*(['"])([^'"\n]+)\1/g)) verifyKey(match[2], namespaces, file)
  for (const match of source.matchAll(/\bt\(\s*`([^`]+)`/g)) {
    const template = match[1]
    if (!template.includes('${')) verifyKey(template, namespaces, file)
    else {
      const prefix = template.split('${')[0].replace(/\.$/, '')
      if (prefix) verifyKey(prefix, namespaces, file)
      else warnings.push(`${relative(repoRoot, file)}: dynamic i18n key cannot be statically resolved`)
    }
  }
  for (const match of source.matchAll(/\bi18nKey\s*=\s*(?:\{\s*)?(['"])([^'"]+)\1/g)) verifyKey(match[2], namespaces, file)
  for (const match of source.matchAll(/\bt\(\s*([A-Za-z_$][\w$]*(?:\.[\w$]+)*)/g)) warnings.push(`${relative(repoRoot, file)}: dynamic i18n key ${match[1]}`)
}

if (errors.length) {
  console.error(`i18n check failed (${errors.length} issues):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log(`i18n check passed: ${files.length} namespaces, ${keyCount} aligned keys, placeholders valid, source keys resolved.`)
if (warnings.length) {
  console.warn(`i18n check warnings (${warnings.length} dynamic keys):`)
  for (const warning of warnings) console.warn(`- ${warning}`)
}
