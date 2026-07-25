const REPLACEMENT = '***masked***'

function isFinancialFigure(text: string, index: number, match: string): boolean {
  const start = Math.max(0, index - 30)
  const end = Math.min(text.length, index + match.length + 30)
  const surrounding = text.slice(start, end)
  return /(?:TL|USD|EUR|₺|\$|€|fiyat|ücret|tutar|gelir|gider|satış|bütçe|maaş|kira|borç|faiz|oran|%|rəqəm|amount|price|cost|revenue|income|expense)/i.test(surrounding)
}

function replaceAll(text: string, pattern: RegExp, predicate?: (index: number, match: string) => boolean): string {
  const results: Array<{ index: number; match: string }> = []
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (!predicate || predicate(m.index, m[0])) {
      results.push({ index: m.index, match: m[0] })
    }
  }
  for (let i = results.length - 1; i >= 0; i--) {
    const { index, match } = results[i]
    text = text.slice(0, index) + REPLACEMENT + text.slice(index + match.length)
  }
  return text
}

export function maskSensitiveData(text: string): string {
  let masked = text

  masked = masked.replace(/-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, REPLACEMENT)
  masked = masked.replace(/Authorization\s*:\s*Bearer\s+\S+/gi, 'Authorization: ***masked***')
  masked = masked.replace(/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REPLACEMENT)
  masked = masked.replace(/nvapi-[A-Za-z0-9_-]+/gi, REPLACEMENT)

  masked = replaceAll(masked, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    (idx, m) => !isFinancialFigure(masked, idx, m))

  masked = replaceAll(masked, /(\+90|0)?[-\s]?5\d{2}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}/g,
    (idx, m) => !isFinancialFigure(masked, idx, m))

  masked = replaceAll(masked, /\b[1-9]\d{10}\b/g,
    (idx, m) => !isFinancialFigure(masked, idx, m))

  masked = replaceAll(masked, /\bTR\d{2}\s?(\d{4}\s?){4}\d{2}\b/g,
    (idx, m) => !isFinancialFigure(masked, idx, m))

  masked = replaceAll(masked, /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    (idx, m) => !isFinancialFigure(masked, idx, m))

  masked = replaceAll(masked, /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[A-Za-z0-9_./-]+["']?/gi, () => true)
  masked = replaceAll(masked, /(?:Bearer|bearer)\s+[A-Za-z0-9._-]+/g, () => true)
  masked = replaceAll(masked, /(?:password|parola|sifre|şifre)\s*[:=]\s*["']?\S+["']?/gi, () => true)
  masked = replaceAll(masked, /(?:secret|sır|anahtar)\s*[:=]\s*["']?\S+["']?/gi, () => true)
  masked = replaceAll(masked, /\$\{?\w+(?:API_KEY|SECRET|PASSWORD|TOKEN|KEY)\}?/g, () => true)

  return masked
}

export function maskChatMessages<T extends { role: string; content: string }>(messages: T[]): T[] {
  return messages.map(msg => ({
    ...msg,
    content: maskSensitiveData(msg.content)
  }))
}
