/*
 * İSTANBUL SAATİ — tek yerde.
 *
 * 🔴 NEDEN VAR (15.09.2026): "bugün" üç ayrı yerde üç ayrı biçimde
 * hesaplanıyordu — pazaryeri operasyonu sunucunun yerel gecesi
 * (UTC sunucuda 03:00 İstanbul), sipariş özeti UTC günü, aylık finans
 * +03:00. Aynı işletme Ana Sayfa'da 0, Genel Bakış'ta 2 gösterdi.
 * Kullanıcı Türkiye'de; gün, hafta ve ay onun takvimine göre olmalı.
 *
 * ⚠️ Türkiye 2016'dan beri yaz saati uygulamıyor; sabit +03:00 bu
 * yüzden doğru. Kural değişirse burası tek değişecek yer.
 *
 * Hafta PAZARTESİ başlar (Türkiye'de iş haftası; ISO 8601).
 */
export const ISTANBUL_TZ = 'Europe/Istanbul'
export const IST_OFFSET_MS = 3 * 3600_000

export type DonemAnahtari = 'today' | 'week' | 'month'

/** İstanbul takvimindeki yıl/ay/gün (UTC hesabıyla, saat dilimi kaydırılarak). */
function istParcalar(d: Date) {
  const k = new Date(d.getTime() + IST_OFFSET_MS)
  return { yil: k.getUTCFullYear(), ay: k.getUTCMonth(), gun: k.getUTCDate(), haftaGunu: k.getUTCDay() }
}

/** İstanbul'da o günün 00:00'ı (UTC anı olarak). */
export function startOfDayIst(d: Date): Date {
  const { yil, ay, gun } = istParcalar(d)
  return new Date(Date.UTC(yil, ay, gun) - IST_OFFSET_MS)
}

/** İstanbul'da o haftanın Pazartesi 00:00'ı. */
export function startOfWeekIst(d: Date): Date {
  const { yil, ay, gun, haftaGunu } = istParcalar(d)
  const pazartesiyeFark = (haftaGunu + 6) % 7 // Paz=0 → 6, Pzt=1 → 0
  return new Date(Date.UTC(yil, ay, gun - pazartesiyeFark) - IST_OFFSET_MS)
}

/** İstanbul'da o ayın 1'i 00:00. */
export function startOfMonthIst(d: Date): Date {
  const { yil, ay } = istParcalar(d)
  return new Date(Date.UTC(yil, ay, 1) - IST_OFFSET_MS)
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400_000)
}

/** İstanbul'daki ay başına `n` ay ekler (gün 1, 00:00). */
export function addMonthsIst(ayBasi: Date, n: number): Date {
  const { yil, ay } = istParcalar(ayBasi)
  return new Date(Date.UTC(yil, ay + n, 1) - IST_OFFSET_MS)
}

/** `YYYY-MM-DD` — İstanbul takvim günü. Rapor satırları ve anahtarlar için. */
export function istDayKey(d: Date): string {
  const { yil, ay, gun } = istParcalar(d)
  return `${yil}-${String(ay + 1).padStart(2, '0')}-${String(gun).padStart(2, '0')}`
}

export type DonemAraligi = { key: DonemAnahtari | 'custom'; from: Date; to: Date; timezone: typeof ISTANBUL_TZ }

/**
 * Dönem aralığı: [from, to) — `to` dahil DEĞİL, bir sonraki dönemin başı.
 * Bugün = İstanbul günü; hafta = Pzt 00:00 → gelecek Pzt 00:00; ay = 1'i → gelecek 1'i.
 */
export function periodRange(key: DonemAnahtari, now = new Date()): DonemAraligi {
  switch (key) {
    case 'today': {
      const from = startOfDayIst(now)
      return { key, from, to: addDays(from, 1), timezone: ISTANBUL_TZ }
    }
    case 'week': {
      const from = startOfWeekIst(now)
      return { key, from, to: addDays(from, 7), timezone: ISTANBUL_TZ }
    }
    case 'month': {
      const from = startOfMonthIst(now)
      return { key, from, to: addMonthsIst(from, 1), timezone: ISTANBUL_TZ }
    }
  }
}

/** `YYYY-MM-DD` çiftinden İstanbul aralığı; `toKey` günü DAHİL. */
export function customRange(fromKey: string, toKey: string): DonemAraligi {
  const from = new Date(`${fromKey}T00:00:00+03:00`)
  const to = addDays(new Date(`${toKey}T00:00:00+03:00`), 1)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new Error('Geçersiz tarih')
  return { key: 'custom', from, to, timezone: ISTANBUL_TZ }
}
