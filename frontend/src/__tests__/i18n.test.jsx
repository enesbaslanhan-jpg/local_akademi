import { beforeEach, describe, expect, it } from 'vitest'
import i18n, { UI_LANGUAGE_KEY } from '@/i18n'
import { formatCurrency, formatDate, formatNumber } from '@/utils/formatters'

describe('TR/EN localization foundation', () => {
  beforeEach(async () => { localStorage.clear(); await i18n.changeLanguage('tr') })

  it('defaults and falls back to Turkish', () => {
    expect(i18n.t('common:nav.dashboard')).toBe('Ana Sayfa')
    expect(i18n.t('workspace:missing', { defaultValue: i18n.t('common:states.unknown') })).toBe('Bilinmiyor')
  })

  it('switches live and persists the interface language', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('common:nav.businessTracking')).toBe('Business Tracking')
    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem(UI_LANGUAGE_KEY)).toBe('en')
    await i18n.changeLanguage('tr')
    expect(i18n.t('common:nav.businessTracking')).toBe('İşletme Takibi')
  })

  it('keeps placeholders intact', async () => {
    await i18n.changeLanguage('en')
    expect(i18n.t('workspace:actions.lowStock', { count: 7 })).toBe('7 products have low stock')
  })

  it('formats locale and currency independently from UI language', () => {
    expect(formatNumber(1234.5, { locale: 'en-US' })).toContain('1,234.5')
    expect(formatCurrency(10, { locale: 'en-US', currency: 'EUR' })).toContain('€')
    expect(formatCurrency(10, { locale: 'tr-TR', currency: 'USD' })).toContain('$')
    expect(formatDate('2026-08-26T00:00:00.000Z', { locale: 'en-GB', timeZone: 'UTC' })).toContain('26')
  })
})
