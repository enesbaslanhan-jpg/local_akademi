import { describe, expect, it } from 'vitest'
import privacyTr from '@/content/legal/privacy'
import privacyEn from '@/content/legal/privacy.en'
import termsTr from '@/content/legal/terms'
import termsEn from '@/content/legal/terms.en'
import cookiesTr from '@/content/legal/cookies'
import cookiesEn from '@/content/legal/cookies.en'

describe('legal content language catalogs', () => {
  /*
   * Bölüm sayıları BİLEREK sabit: bir bölümün kazara düşmesi ya da
   * yalnız bir dile eklenmesi burada yakalanıyor.
   *
   * 29.08.2026: privacy 12 → 13 (7.1 ödeme verisi ve ödeme kuruluşu),
   * terms 17 → 18 (12. üyelik, ücretlendirme ve iptal). İkisi de
   * PayTR başvurusu kapsamında ve TR/EN AYNI turda güncellendi —
   * sayıların birlikte artması bunun kanıtı.
   */
  it.each([
    ['privacy', privacyTr, privacyEn, 13],
    ['terms', termsTr, termsEn, 18],
    ['cookies', cookiesTr, cookiesEn, 7],
  ])('%s keeps separate, complete TR and EN documents', (_name, tr, en, sectionCount) => {
    expect(tr.bolumler).toHaveLength(sectionCount)
    expect(en.bolumler).toHaveLength(sectionCount)
    expect(en.giris).not.toBe(tr.giris)
    expect(en.bolumler.map(section => section.id)).toEqual(tr.bolumler.map(section => section.id))
    expect(en.bolumler.every(section => section.baslik && /[A-Za-z]/.test(section.baslik))).toBe(true)
  })
})
