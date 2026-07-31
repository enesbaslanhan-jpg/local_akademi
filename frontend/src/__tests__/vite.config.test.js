import { describe, it, expect } from 'vitest'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configPath = join(__dirname, '../../vite.config.js')

describe('vite.config.js financial model proxy', () => {
  const content = fs.readFileSync(configPath, 'utf8')

  it('contains /financial-models proxy rule', () => {
    expect(content).toContain("'/financial-models': backendProxy")
  })

  it('contains /financial-cases proxy rule', () => {
    expect(content).toContain("'/financial-cases': backendProxy")
  })

  it('routes use backendProxy pointing to localhost:3000', () => {
    expect(content).toMatch(/backendProxy\s*=\s*\{[^}]*target:\s*['"]http:\/\/localhost:3000['"]/s)
  })

  it('does not rewrite financial model paths', () => {
    // No rewrite rule should appear for these routes
    expect(content).not.toMatch(/\'\/financial-models\':\s*\{[\s\S]*?rewrite:/)
    expect(content).not.toMatch(/\'\/financial-cases\':\s*\{[\s\S]*?rewrite:/)
  })
})
