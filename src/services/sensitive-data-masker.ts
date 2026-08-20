const REPLACEMENT = '***masked***'

/*
 * Giden AI isteklerinden hassas veriyi temizler.
 *
 * ÖNCEKİ SÜRÜMÜN HATASI: e-posta, telefon, TCKN, IBAN ve kart numarası
 * `isFinancialFigure()` sezgisiyle korunuyordu — eşleşmenin ±30 karakteri
 * içinde `tutar|maaş|gelir|TL|₺|oran…` geçiyorsa maskeleme İPTAL ediliyordu.
 * Bu bir finans mentorunda kural, istisna değil: "maaş" yanındaki TCKN ve
 * "tutar" yanındaki IBAN sağlayıcıya açık gidiyordu.
 *
 * ÇÖZÜM: bağlam tahmini yerine kimliğin KENDİSİNİ doğrulamak.
 *   - E-posta, telefon, IBAN, kart: biçimleri zaten kendine özgü, koşulsuz maskelenir.
 *   - TCKN: 11 haneli her sayı değil, TCKN sağlama algoritmasını GEÇEN sayı
 *     maskelenir. Böylece 11 haneli bir tutar yanlışlıkla maskelenmez.
 *   - VKN: sağlama algoritması uygulanmıyor (yanlış pozitif riski yüksek);
 *     bunun yerine yakınında "VKN / vergi no / vergi kimlik" etiketi arıyoruz.
 */

/* Kimlik numarası etiketleri. Sağlama algoritması tutmasa bile (kullanıcı
   yanlış yazmış olabilir) etiketli bir sayı hassas kabul edilir. */
const TCKN_LABELS = /(?:t\.?c\.?\s*kimlik|tckn|tc\s*no|kimlik\s*(?:no|numaras[ıi])|identity\s*number)/i
const TAX_ID_LABELS = /(?:vkn|vergi\s*(?:kimlik\s*)?(?:no|numaras[ıi])|tax\s*id)/i

/** TCKN sağlama: 11 hane, ilk hane 0 değil, 10. ve 11. hane kontrol basamağı. */
export function isValidTckn(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return false
  if (digits[0] === '0') return false

  const d = [...digits].map(Number)
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8]
  const evenSum = d[1] + d[3] + d[5] + d[7]

  const tenth = (oddSum * 7 - evenSum) % 10
  if (tenth !== d[9]) return false

  const firstTenSum = d.slice(0, 10).reduce((sum, n) => sum + n, 0)
  return firstTenSum % 10 === d[10]
}

/** Eşleşmenin yakınında verilen etiket deseni geçiyor mu. */
function hasNearbyLabel(text: string, index: number, match: string, label: RegExp): boolean {
  const start = Math.max(0, index - 25)
  const end = Math.min(text.length, index + match.length + 25)
  return label.test(text.slice(start, end))
}

function replaceAll(
  text: string,
  pattern: RegExp,
  predicate?: (index: number, match: string) => boolean
): string {
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

  /* Kimlik bilgileri / anahtarlar — her zaman. */
  masked = masked.replace(/-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g, REPLACEMENT)
  masked = masked.replace(/Authorization\s*:\s*Bearer\s+\S+/gi, 'Authorization: ***masked***')
  masked = masked.replace(/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REPLACEMENT)
  masked = masked.replace(/nvapi-[A-Za-z0-9_-]+/gi, REPLACEMENT)

  /* Biçimi kendine özgü olan kişisel veriler — KOŞULSUZ maskelenir.
     Bunlar bir finansal rakamla karıştırılamaz. */
  masked = replaceAll(masked, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g)
  masked = replaceAll(masked, /(\+90|0)?[-\s]?5\d{2}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}/g)
  masked = replaceAll(masked, /\bTR\d{2}\s?(\d{4}\s?){4}\d{2}\b/g)
  masked = replaceAll(masked, /\b(?:\d{4}[-\s]?){3}\d{4}\b/g)

  /* TCKN: sağlama algoritmasını GEÇEN ya da yakınında kimlik etiketi OLAN
     11 haneli sayılar. Sağlama gerçek numarayı yakalar; etiket kontrolü
     kullanıcının yanlış yazdığı numarayı da yakalar. Etiketsiz ve sağlaması
     tutmayan 11 haneli bir sayı (ör. büyük bir tutar) maskelenmez. */
  masked = replaceAll(masked, /\b[1-9]\d{10}\b/g,
    (idx, m) => isValidTckn(m) || hasNearbyLabel(masked, idx, m, TCKN_LABELS))

  /* VKN: 10 hane çok sık bir tutar uzunluğu; yalnız etiketliyse maskelenir. */
  masked = replaceAll(masked, /\b\d{10}\b/g,
    (idx, m) => hasNearbyLabel(masked, idx, m, TAX_ID_LABELS))

  /* Anahtar/parola atamaları. */
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
