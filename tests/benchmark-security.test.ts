import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const FIXTURE_PATH = path.resolve(__dirname, '..', 'tests', 'fixtures', 'mentor-baseline-prompts.json')
const REPORT_PATH = path.resolve(__dirname, '..', 'reports', 'phase7', 'mentor-baseline-results.json')

describe('Mentor benchmark fixtures', () => {
  it('fixture dosyası en az 30 güvenli soru içerir', () => {
    const prompts = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'))
    expect(Array.isArray(prompts)).toBe(true)
    expect(prompts.length).toBeGreaterThanOrEqual(30)
    for (const p of prompts) {
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('category')
      expect(p).toHaveProperty('text')
      expect(typeof p.text).toBe('string')
      expect(p.text.length).toBeGreaterThan(0)
    }
  })

  it('fixture dosyası secret içermez', () => {
    const content = fs.readFileSync(FIXTURE_PATH, 'utf8')
    expect(content).not.toContain('sk-')
    expect(content).not.toContain('API_KEY')
    expect(content).not.toContain('password')
  })
})

describe('Mentor benchmark report', () => {
  it('rapor dosyası varsa prompt metni ve secret içermez', () => {
    if (!fs.existsSync(REPORT_PATH)) return
    const content = fs.readFileSync(REPORT_PATH, 'utf8')
    expect(content).not.toContain('sk-')
    expect(content).not.toContain('API_KEY')
    expect(content).not.toContain('Authorization')
    expect(content).not.toContain('Bearer ')
  })
})
