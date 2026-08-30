import { describe, it, expect } from 'vitest'
import {
  hesaplaUyelikDurumu,
  BILLING_STARTS_AT,
  TRIAL_DAYS,
  TRIAL_WARNING_DAYS,
  FOUNDER_STAGES,
  nihaiFiyataGecisAyi,
  STANDARD_MONTHLY_PRICE,
  FOUNDER_DISCOUNT_RATE,
  YEARLY_FREE_MONTHS,
  fiyatYuvarla,
  kuruculUyeFiyati,
  kuruculIndirimYuzdesi,
  yillikTutar,
  yillikKazanc,
  yillikAylikKarsiligi,
} from '../src/config/billing.js'

/*
 * Üyelik durumu TÜRETİLİYOR, saklanmıyor. Bu testin koruduğu iki şey:
 *
 * 1. Ücretlendirme başlamadıysa hiç kimse sayaç/kilit görmemeli —
 *    "olmayan ücreti vaat etme" ilkesinin kod karşılığı.
 *
 * 2. Deneme başlangıcı `max(createdAt, BILLING_STARTS_AT)`. Yalnız
 *    `createdAt` kullanılsaydı, ücretlendirme açıldığı gün aylar önce
 *    kaydolmuş HER kullanıcı anında "süresi dolmuş" sayılıp salt
 *    okunur moda düşerdi. Asıl korunan şey budur.
 *
 * `ucretlendirmeBaslangici` fonksiyona parametre olarak geçiliyor;
 * modül mock'lamaya gerek yok (fonksiyon bilerek saf tutuldu).
 */

const GUN = 24 * 60 * 60 * 1000
const ACILIS = '2026-09-01T00:00:00.000Z'

describe('üyelik durumu türetimi', () => {
  it('ÜRETİMDEKİ HÂL: ücretlendirme başlamadı, hiçbir uyarı yok', () => {
    /* Bu, bugün gerçekten sevk edilen davranış. */
    expect(BILLING_STARTS_AT).toBeNull()

    const durum = hesaplaUyelikDurumu(new Date('2020-01-01'))
    expect(durum.state).toBe('billing_not_started')
    expect(durum.showBanner).toBe(false)
    expect(durum.trialDaysLeft).toBeNull()
    expect(durum.trialEndsAt).toBeNull()
    /* Rozet de yok: ücretlendirme başlamadan herkes "kurucu üye"
       olamaz, rozet o zaman hiçbir şey ayırt etmez. */
    expect(durum.founder).toBe(false)
  })

  it('ESKİ kullanıcı, ücretlendirme açılınca 30 günü BAŞTAN alır', () => {
    const birYilOnceKayit = new Date('2025-09-01T00:00:00.000Z')
    const acilisGunu = new Date('2026-09-01T12:00:00.000Z')

    const durum = hesaplaUyelikDurumu(birYilOnceKayit, acilisGunu, ACILIS)

    /* `createdAt` kullanılsaydı burası 'expired' olurdu. */
    expect(durum.state).toBe('trial')
    expect(durum.trialDaysLeft).toBe(TRIAL_DAYS)
  })

  it('ücretlendirmeden SONRA kaydolan kullanıcı kendi tarihinden sayar', () => {
    const yeniKayit = new Date('2026-10-01T00:00:00.000Z')
    const durum = hesaplaUyelikDurumu(yeniKayit, new Date('2026-10-11T00:00:00.000Z'), ACILIS)

    expect(durum.state).toBe('trial')
    expect(durum.trialDaysLeft).toBe(20)
  })

  it('şerit yalnız son 7 günde çıkar', () => {
    const kayit = new Date(ACILIS)

    const erken = hesaplaUyelikDurumu(kayit, new Date(kayit.getTime() + 10 * GUN), ACILIS)
    expect(erken.trialDaysLeft).toBeGreaterThan(TRIAL_WARNING_DAYS)
    expect(erken.showBanner).toBe(false)

    const gec = hesaplaUyelikDurumu(kayit, new Date(kayit.getTime() + 25 * GUN), ACILIS)
    expect(gec.trialDaysLeft).toBeLessThanOrEqual(TRIAL_WARNING_DAYS)
    expect(gec.showBanner).toBe(true)
  })

  it('deneme bitince salt okunur duruma geçer ve uyarı gösterir', () => {
    const kayit = new Date(ACILIS)
    const durum = hesaplaUyelikDurumu(kayit, new Date(kayit.getTime() + 31 * GUN), ACILIS)

    expect(durum.state).toBe('expired')
    expect(durum.showBanner).toBe(true)
    expect(durum.trialDaysLeft).toBe(0)
  })

  it('Kurucu Üye zaman çizgisi: ücretsiz → lansman → kurucu fiyatı', () => {
    /* Fiyatlar hem fiyat sayfasında, hem ödeme panelinde, hem de
       yasal metinde geçiyor; tek kaynaktan okunduğunun kanıtı.

       ⚠️ Son aşama SABİT SAYIYLA karşılaştırılmıyor. 299 yazsaydık
       standart fiyat değiştiğinde bu test, modeli koruduğunu sanarak
       eski sayıyı savunurdu. */
    expect(FOUNDER_STAGES.map(s => s.monthlyPrice)).toEqual([0, 149, kuruculUyeFiyati()])
  })

  it('son aşama SÜRESİZ — kurucu üyeliğin bitiş tarihi yok', () => {
    expect(FOUNDER_STAGES.at(-1)?.months).toBeNull()
  })
})

/*
 * FİYAT MODELİ — kurucu indirimi ORANSAL (ürün sahibi kararı,
 * 28.08.2026).
 *
 * 27.08.2026'da karar "299 TL sonsuza dek sabit"ti ve testi de öyle
 * yazılmıştı. Yeni karar farklı: fiyat dondurulmuyor, standart fiyata
 * BAĞLANIYOR. Kurucu üye zamdan muaf değil, zamdan daha az etkilenen.
 *
 * 🔴 Bu testlerin asıl işi, sonradan biri "299" sabitini koda geri
 * yazarsa DÜŞMEK. O an model sessizce eski taahhüde döner ve abonelik
 * sözleşmesindeki yüzde ifadesi yanlış beyan olur.
 */
describe('kurucu üye fiyat modeli', () => {
  it('kurucu fiyat standart fiyattan TÜRETİLİYOR, sabit değil', () => {
    expect(kuruculUyeFiyati()).toBe(
      fiyatYuvarla(STANDARD_MONTHLY_PRICE * (1 - FOUNDER_DISCOUNT_RATE))
    )
  })

  it('🦷 standart fiyat artınca kurucu fiyat da artar — ORAN korunur', () => {
    /* DİŞ KONTROLÜ. Fonksiyona BAŞKA bir taban veriliyor; gövdeye
       `return 299` yazılırsa bu satır düşer. İlk yazdığım sürüm
       beklenen değeri de aynı sabitlerden hesaplıyordu ve tam bu
       yüzden hiçbir şey korumuyordu. */
    expect(kuruculUyeFiyati(599)).toBe(359)
    expect(kuruculUyeFiyati(1000)).toBe(600)

    /* Oran her tabanda aynı: kurucu üye hep %40 altını öder. */
    expect(kuruculUyeFiyati(599) / 599).toBeCloseTo(1 - FOUNDER_DISCOUNT_RATE, 2)
    expect(kuruculUyeFiyati() / STANDARD_MONTHLY_PRICE).toBeCloseTo(1 - FOUNDER_DISCOUNT_RATE, 2)
  })

  it('indirim yüzdesi arayüzde gösterilebilir bir tam sayı', () => {
    expect(kuruculIndirimYuzdesi()).toBe(40)
  })

  it('yıllık tutar: 12 ay yerine 10 ay ödenir', () => {
    expect(yillikTutar()).toBe(kuruculUyeFiyati() * (12 - YEARLY_FREE_MONTHS))
    expect(yillikKazanc()).toBe(kuruculUyeFiyati() * YEARLY_FREE_MONTHS)
  })

  it('yıllığın aylık karşılığı aylık fiyattan DÜŞÜK — yoksa teşvik yok', () => {
    /* Yıllık seçenek aylıktan pahalıya gelirse fiyat sayfasındaki
       "2 ay hediye" ifadesi yanlış olur. */
    expect(yillikAylikKarsiligi()).toBeLessThan(kuruculUyeFiyati())
  })

  it('yuvarlama TEK yerden geçiyor', () => {
    /* Ekranda 299, tahsilatta 299,40 olmasın diye. */
    expect(Number.isInteger(kuruculUyeFiyati())).toBe(true)
    expect(Number.isInteger(yillikTutar())).toBe(true)
    expect(Number.isInteger(yillikAylikKarsiligi())).toBe(true)
  })

  it('"5. aydan itibaren" ifadesi TÜRETİLİYOR, elle yazılmıyor', () => {
    /* 1 ay ücretsiz + 3 ay lansman = 4 ay; nihai fiyat 5. ayda
       başlar. Aşama süreleri değişirse arayüzdeki sayı da kendiliğinden
       değişmeli — elle "5" yazılsaydı sessizce yalan olurdu. */
    expect(nihaiFiyataGecisAyi()).toBe(5)
  })
})
