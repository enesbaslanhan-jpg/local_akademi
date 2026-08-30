import { describe, expect, it } from 'vitest'
import { contentLanguage, localized } from '../src/lib/content-language.js'
import { COURSE_EN_BY_SLUG } from '../src/content/i18n/course-en.js'
import { DECISION_CHECK_EN_BY_CODE, localizeDecisionCheck, localizeDecisionSnapshot } from '../src/content/i18n/decision-check-en.js'
import { STRUCTURED_TOOL_CONFIGS } from '../src/services/decision-tool-catalog.js'
import { FORMULA_EN_BY_ID, localizeFormula, localizeFormulaResult } from '../src/content/i18n/formula-en.js'
import { FINANCIAL_MODEL_EN_CODES, localizeFinancialModel, localizeFinancialModelVersions } from '../src/content/i18n/financial-model-en.js'
import { localizeSystemTaskTitle } from '../src/content/i18n/task-en.js'
import { FINANCIAL_MODEL_REGISTRY } from '../src/services/financial-models/registry.js'

describe('published content localization', () => {
  it('keeps the source language unless English is explicitly requested', () => {
    expect(contentLanguage({ headers: {} } as any)).toBe('tr')
    expect(contentLanguage({ headers: { 'accept-language': 'tr-TR,tr;q=0.9' } } as any)).toBe('tr')
    expect(contentLanguage({ headers: { 'accept-language': 'en-US,en;q=0.9' } } as any)).toBe('en')
    expect(localized('Türkçe', 'English', 'tr')).toBe('Türkçe')
    expect(localized('Türkçe', 'English', 'en')).toBe('English')
    expect(localized('Türkçe', undefined, 'en')).toBe('Türkçe')
  })

  it('has English catalog metadata for exactly the 38 published courses', () => {
    const items = Object.values(COURSE_EN_BY_SLUG)
    expect(items).toHaveLength(38)
    expect(items.every(item => item.title.trim() && item.description?.trim())).toBe(true)
  })

  it('ships English bodies only for explicitly translated published lessons', () => {
    const translated = Object.entries(COURSE_EN_BY_SLUG).filter(([, item]) => item.lessonContent)
    expect(translated).toHaveLength(2)
    expect(translated.map(([slug]) => slug)).toEqual([
      'gercek-birim-maliyet-hesaplama-pusulasi',
      'karli-fiyat-mimarisi-ve-marj-yonetimi',
    ])
    for (const [, item] of translated) expect(item.lessonContent).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/)
  })

  it('localizes exactly the 13 published decision-check catalog entries', () => {
    expect(Object.keys(DECISION_CHECK_EN_BY_CODE)).toHaveLength(13)
    const source = { code: 'DC-PROFIT-001', title: 'Ürünüm Gerçekten Kârlı mı?', description: 'Türkçe', category: 'Finans' }
    expect(localizeDecisionCheck(source, 'tr')).toBe(source)
    expect(localizeDecisionCheck(source, 'en')).toMatchObject({
      title: 'Is my product truly profitable?',
      category: 'Finance',
    })
  })

  it('preserves structured decision input validation while localizing every visible field', () => {
    for (const source of STRUCTURED_TOOL_CONFIGS) {
      const translated = DECISION_CHECK_EN_BY_CODE[source.code]?.definition as any
      expect(translated?.questions).toHaveLength(source.questions.length)
      for (const [index, question] of source.questions.entries()) {
        expect(translated.questions[index]).toMatchObject({
          code: question.code,
          type: question.type,
          min: question.min,
          max: question.max,
          step: question.step,
          required: question.required,
          allowUnknown: question.allowUnknown,
        })
      }
      expect(JSON.stringify(translated)).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/)
    }

    const sourceSnapshot = {
      decisionCheckCode: 'DC-DISCOUNT-002',
      calculationOutput: {
        decisionLabel: 'SINIRDA', decisionTone: 'warning', summary: 'Türkçe özet',
        metrics: [{ key: 'discountedPrice', label: 'İndirimli fiyat', value: 100, format: 'money' }],
        scenarios: [{ label: 'Mevcut senaryo', value: 100, format: 'money', detail: 'Türkçe', tone: 'warning' }],
        formulas: ['Türkçe formül'], riskWarnings: ['Türkçe risk'], safeNextSteps: ['Türkçe adım'], mentorSummary: ['Türkçe'],
      },
    }
    expect(localizeDecisionSnapshot(sourceSnapshot, 'tr')).toBe(sourceSnapshot)
    expect(JSON.stringify(localizeDecisionSnapshot(sourceSnapshot, 'en'))).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/)
  })

  it('contains complete English views for all live simple formulas', () => {
    expect(Object.keys(FORMULA_EN_BY_ID)).toHaveLength(19)
    const source = { id: 'ltv', name: 'Müşteri Yaşam Boyu Değeri', warning: 'Türkçe uyarı', inputs: [{ name: 'musteri_omru', label: 'Müşteri İlişki Süresi', unit: 'yıl' }] }
    const english = localizeFormula(source, 'en')
    expect(english.name).toBe('Customer Lifetime Value (LTV)')
    expect(english.inputs[0]).toMatchObject({ label: 'Customer relationship duration', unit: 'years' })
    expect(localizeFormulaResult({ durum: 'Kritik nakit riski' }, 'en')).toEqual({ durum: 'Critical cash risk' })
    expect(localizeFormula(source, 'tr')).toBe(source)
  })

  it('localizes all 24 active financial models without Turkish UI labels', () => {
    expect(FINANCIAL_MODEL_EN_CODES).toHaveLength(24)
    expect(FINANCIAL_MODEL_REGISTRY).toHaveLength(24)
    for (const source of FINANCIAL_MODEL_REGISTRY) {
      const model = localizeFinancialModel(source, 'en')
      const visible = [model.name, model.purpose, model.description, model.formula, ...model.inputs.flatMap(item => [item.label, item.description, item.unit]), ...model.outputs.flatMap(item => [item.label, item.description, item.unit]), ...model.interpretationRules, ...model.warningRules, ...model.limitations].join(' ')
      expect(visible, source.code).not.toMatch(/[çğıöşüÇĞİÖŞÜ]/)
      expect(localizeFinancialModel(source, 'tr')).toBe(source)
    }
  })

  it('localizes persisted model release notes without mutating Turkish content', () => {
    const versions = [{ id: 'v1', changeSummary: 'Phase 6 ilk deterministik sürüm.' }]
    expect(localizeFinancialModelVersions(versions, 'en')[0].changeSummary).toBe('Phase 6 initial deterministic release.')
    expect(localizeFinancialModelVersions(versions, 'tr')).toBe(versions)
  })

  it('localizes only canonical system task titles', () => {
    expect(localizeSystemTaskTitle('Pazar Yeri Komisyonu: gerçek işletme kaydını oluştur', 'en')).toBe('Marketplace Commission: Create a real business record')
    expect(localizeSystemTaskTitle('Bilinmeyen Konu: işletme karar dosyası', 'en')).toBe('Create a business decision file')
    expect(localizeSystemTaskTitle('Kullanıcının özel görevi', 'en')).toBe('Kullanıcının özel görevi')
    expect(localizeSystemTaskTitle(null, 'en')).toBe('Complete the task')
  })
})
