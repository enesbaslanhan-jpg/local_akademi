import { getFormatLocale } from './formatters'

// Older result snapshots retain raw decimal amounts. Format their display only;
// never rewrite the saved evidence or alter calculation inputs.
export function formatDecisionText(text, locale = getFormatLocale()) {
  if (typeof text !== 'string') return ''
  return text.replace(/(?<![\d.,])(-?\d+(?:\.\d+)?)\s+₺/g, (match, amount) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(Number(amount)))
}
