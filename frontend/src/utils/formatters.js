import { FORMAT_LOCALE_KEY } from '@/i18n'

const SUPPORTED_FORMAT_LOCALES = new Set(['tr-TR', 'en-US', 'en-GB', 'de-DE'])

export function getFormatLocale() {
  if (typeof localStorage === 'undefined') return 'tr-TR'
  const stored = localStorage.getItem(FORMAT_LOCALE_KEY)
  return SUPPORTED_FORMAT_LOCALES.has(stored) ? stored : 'tr-TR'
}

export function formatCurrency(value, { locale = getFormatLocale(), currency = 'TRY', ...options } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency, ...options }).format(Number(value))
}

export function formatNumber(value, { locale = getFormatLocale(), ...options } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return new Intl.NumberFormat(locale, options).format(Number(value))
}

export function formatDate(value, { locale = getFormatLocale(), ...options } = {}) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, options).format(date)
}
