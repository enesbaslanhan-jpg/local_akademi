import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  atomicWriteJson,
  buildErrorRecord,
  buildResultRecord,
  buildSummary,
  collectCompletedIds,
  hasFlag,
  mergeResults,
  parsePositiveIntArg,
  readExistingResults,
  safeObservationLabel,
  withTimeout,
} from '../scripts/benchmark-mentor'

const promptFixture = (id: string, category = 'general'): { id: string; category: string; text: string } => ({
  id,
  category,
  text: `Question text for ${id}`,
})

describe('benchmark-mentor resilience helpers', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'benchmark-test-'))
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('parsePositiveIntArg', () => {
    it('pozitif tam sayı argümanını döndürür', () => {
      process.argv = ['node', 'script', '--max-prompts=5']
      expect(parsePositiveIntArg('--max-prompts=')).toBe(5)
    })

    it('eksik argüman için null döndürür', () => {
      process.argv = ['node', 'script']
      expect(parsePositiveIntArg('--max-prompts=')).toBeNull()
    })

    it('geçersiz değerleri reddeder', () => {
      process.argv = ['node', 'script', '--max-prompts=abc', '--max-prompts=-1', '--max-prompts=3.5']
      expect(parsePositiveIntArg('--max-prompts=')).toBeNull()
    })
  })

  describe('hasFlag', () => {
    it('desteklenen tüm flag biçimlerini tanır', () => {
      process.argv = ['node', 'script', '--resume', '--skip-stream=true', 'skip-memory']
      expect(hasFlag('resume')).toBe(true)
      expect(hasFlag('skip-stream')).toBe(true)
      expect(hasFlag('skip-memory')).toBe(true)
      expect(hasFlag('category')).toBe(false)
    })
  })

  describe('safeObservationLabel', () => {
    it('iş modeli kelimelerini sınıflandırır', () => {
      expect(safeObservationLabel('Gelir modeli nasıl oluşturulur?')).toBe('business_model')
    })

    it('sistem/model kelimelerini sınıflandırır', () => {
      expect(safeObservationLabel('Ollama mı kullanıyorsun?')).toBe('system_or_model')
    })

    it('diğer soruları general olarak işaretler', () => {
      expect(safeObservationLabel('Merhaba nasılsın?')).toBe('general')
    })
  })

  describe('buildResultRecord', () => {
    it('telemetry kaydı yoksa hata kaydı üretir', () => {
      const result = buildResultRecord(promptFixture('A1'), null)
      expect(result.promptId).toBe('A1')
      expect(result.error).toBe('NO_TELEMETRY_RECORD')
    })

    it('prompt metnini rapora eklemez', () => {
      const result = buildResultRecord(promptFixture('A1'), null)
      expect(JSON.stringify(result)).not.toContain('Question text')
    })
  })

  describe('buildErrorRecord', () => {
    it('hata mesajını kaydeder ve prompt metnini eklemez', () => {
      const result = buildErrorRecord(promptFixture('A1'), new Error('timeout'), false)
      expect(result.promptId).toBe('A1')
      expect(result.error).toBe('timeout')
      expect(JSON.stringify(result)).not.toContain('Question text')
    })
  })

  describe('atomicWriteJson', () => {
    it('atomik olarak dosya yazar ve okunabilir', () => {
      const filePath = path.join(tempDir, 'output.json')
      atomicWriteJson(filePath, { ok: true })
      expect(fs.existsSync(filePath)).toBe(true)
      expect(JSON.parse(fs.readFileSync(filePath, 'utf8'))).toEqual({ ok: true })
    })

    it('dizin yoksa oluşturur', () => {
      const filePath = path.join(tempDir, 'nested', 'dir', 'output.json')
      atomicWriteJson(filePath, { ok: true })
      expect(fs.existsSync(filePath)).toBe(true)
    })

    it('geçici dosya kalıntısı bırakmaz', () => {
      const filePath = path.join(tempDir, 'output.json')
      atomicWriteJson(filePath, { ok: true })
      const files = fs.readdirSync(tempDir)
      expect(files).toEqual(['output.json'])
    })
  })

  describe('readExistingResults', () => {
    it('varolan raporu okur', () => {
      const filePath = path.join(tempDir, 'output.json')
      atomicWriteJson(filePath, buildSummary([{ promptId: 'A1' }], 30, 5, 'OK'))
      expect(readExistingResults(filePath)).toEqual([{ promptId: 'A1' }])
    })

    it('dosya yoksa boş dizi döndürür', () => {
      expect(readExistingResults(path.join(tempDir, 'missing.json'))).toEqual([])
    })

    it('bozuk JSON dosyasında boş dizi döndürür', () => {
      const filePath = path.join(tempDir, 'bad.json')
      fs.writeFileSync(filePath, 'not json')
      expect(readExistingResults(filePath)).toEqual([])
    })
  })

  describe('collectCompletedIds', () => {
    it('tamamlanmış prompt idlerini toplar', () => {
      const ids = collectCompletedIds([{ promptId: 'A1' }, { promptId: 'A2' }, { noId: true }])
      expect(ids).toEqual(new Set(['A1', 'A2']))
    })
  })

  describe('mergeResults', () => {
    it('aynı promptId için yeni sonuç eskiyinin üzerine yazar', () => {
      const merged = mergeResults(
        [{ promptId: 'A1', value: 1 }],
        [{ promptId: 'A1', value: 2 }, { promptId: 'A2', value: 3 }],
      )
      expect(merged).toHaveLength(2)
      expect(merged.find(r => r.promptId === 'A1')).toEqual({ promptId: 'A1', value: 2 })
    })

    it('farklı promptIdleri korur', () => {
      const merged = mergeResults(
        [{ promptId: 'A1', value: 1 }],
        [{ promptId: 'A2', value: 2 }],
      )
      expect(merged).toHaveLength(2)
    })
  })

  describe('buildSummary', () => {
    it('mevcut JSON sözleşmesini korur', () => {
      const summary = buildSummary([{ promptId: 'A1' }], 30, 5, 'OK')
      expect(summary.status).toBe('OK')
      expect(summary.fixtureCount).toBe(30)
      expect(summary.runCount).toBe(5)
      expect(summary.sampleCount).toBe(1)
      expect(summary.results).toEqual([{ promptId: 'A1' }])
      expect(summary.environment).toHaveProperty('provider')
      expect(summary.environment).toHaveProperty('model')
      expect(summary.environment).toHaveProperty('ollamaApiUrl')
      expect(summary).toHaveProperty('timestamp')
    })
  })

  describe('withTimeout', () => {
    it('zamanında tamamlanan promise döndürür', async () => {
      const result = await withTimeout(Promise.resolve(42), 1000, 'test')
      expect(result).toBe(42)
    })

    it('timeout durumunda PROMPT_TIMEOUT hatası fırlatır', async () => {
      await expect(
        withTimeout(new Promise(r => setTimeout(r, 5000)), 10, 'p1'),
      ).rejects.toThrow('PROMPT_TIMEOUT:p1')
    })
  })
})

describe('benchmark-mentor security', () => {
  it('error record secret veya tam prompt metni içermez', () => {
    const result = buildErrorRecord(
      { id: 'X1', category: 'security', text: 'My password is 12345 and API_KEY=sk-abc' },
      new Error('fail'),
      false,
    )
    const json = JSON.stringify(result)
    expect(json).not.toContain('12345')
    expect(json).not.toContain('sk-abc')
    expect(json).not.toContain('API_KEY')
  })
})
