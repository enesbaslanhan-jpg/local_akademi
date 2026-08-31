import { describe, expect, it } from 'vitest'
import { hesaplaUyelikDurumu, TRIAL_DAYS, TRIAL_WARNING_DAYS } from '../src/config/billing.js'

/*
 * ÖDEME ÜYELİĞİ AÇAR.
 *
 * 🔴 ÖLÇÜLEN ARIZA (31.08.2026). `hesaplaUyelikDurumu` yalnız
 * `user.createdAt`e bakıyordu ve `Subscription` tablosunu HİÇ
 * okumuyordu. PayTR callback'i `status`u ACTIVE yapıyor ama o satırı
 * okuyan kimse yoktu.
 *
 * Sonucu: ücretlendirme açılsaydı kullanıcı öder, para geçer, 30 gün
 * dolunca yine `expired` olur ve salt okunur moda düşerdi. Yani
 * parasını aldığımız kullanıcıyı uygulamadan kilitlerdik.
 *
 * Fonksiyonun kendi yorumu bunu zaten söylüyordu — "tablo gelince
 * burada `active` de dönecek". Tablo geldi, fonksiyon güncellenmedi.
 *
 * ⚠️ `BILLING_STARTS_AT` bugün `null` olduğu için bütün senaryolar
 * ücretlendirme başlangıcını PARAMETRE olarak veriyor. Fonksiyonun
 * saf olması buna izin veriyor; config'i mock'lamaya gerek yok.
 */

const GUN = 24 * 60 * 60 * 1000
const BASLANGIC = '2026-01-01T00:00:00.000Z'
const gunSonra = (n: number) => new Date(new Date(BASLANGIC).getTime() + n * GUN)

/** Denemesi çoktan bitmiş bir kullanıcı. */
const KAYIT = new Date(BASLANGIC)
const DENEME_BITTI = gunSonra(TRIAL_DAYS + 5)

describe('ödeme kaydı üyelik durumunu belirler', () => {
  it('🦷 ÖDEYEN kullanıcı deneme bitse de AKTİF — salt okunura düşmez', () => {
    const durum = hesaplaUyelikDurumu(KAYIT, DENEME_BITTI, BASLANGIC, {
      status: 'ACTIVE',
      currentPeriodEnd: gunSonra(TRIAL_DAYS + 30),
    })

    expect(durum.state, 'ödeyen kullanıcı expired olamaz').toBe('active')
    expect(durum.founder).toBe(true)
    expect(durum.showBanner, 'ödeyene uyarı şeridi gösterilmez').toBe(false)
  })

  it('sonraki tahsilat günü ödeme kaydından geliyor', () => {
    const donemSonu = gunSonra(60)
    const durum = hesaplaUyelikDurumu(KAYIT, DENEME_BITTI, BASLANGIC, {
      status: 'ACTIVE',
      currentPeriodEnd: donemSonu,
    })

    expect(durum.currentPeriodEnd).toBe(donemSonu.toISOString())
  })

  it('🦷 ÖDEME OLMADAN deneme bitince yine expired', () => {
    /* Bu testin düşmesi, yukarıdaki geçişin "her şeye active de"
       diyerek sahte biçimde sağlandığı anlamına gelirdi. */
    const durum = hesaplaUyelikDurumu(KAYIT, DENEME_BITTI, BASLANGIC, null)

    expect(durum.state).toBe('expired')
    expect(durum.showBanner, 'süresi dolana şerit gösterilmeli').toBe(true)
  })

  it('🦷 DÖNEMİ GEÇMİŞ abonelik aktif SAYILMAZ', () => {
    /* İptal edilmiş ya da yenilenmemiş bir abonelik satırı, ödeme
       yapılmaya devam ediliyormuş gibi okunmamalı. */
    const durum = hesaplaUyelikDurumu(KAYIT, DENEME_BITTI, BASLANGIC, {
      status: 'ACTIVE',
      currentPeriodEnd: gunSonra(TRIAL_DAYS + 1), // şimdiden ÖNCE
    })

    expect(durum.state).toBe('expired')
  })

  it('ACTIVE olmayan durumlar üyeliği açmaz', () => {
    for (const status of ['TRIALING', 'PAST_DUE', 'CANCELED', 'EXPIRED']) {
      const durum = hesaplaUyelikDurumu(KAYIT, DENEME_BITTI, BASLANGIC, {
        status,
        currentPeriodEnd: gunSonra(90),
      })
      expect(durum.state, `${status} aktif üyelik sayılmamalı`).toBe('expired')
    }
  })

  it('dönem sonu boş bir ACTIVE satırı üyeliği açmaz', () => {
    /* Veri eksikse lehte varsaymıyoruz: tarihi olmayan bir abonelik,
       ne zaman biteceği bilinmeyen bir abonelik demek. */
    const durum = hesaplaUyelikDurumu(KAYIT, DENEME_BITTI, BASLANGIC, {
      status: 'ACTIVE',
      currentPeriodEnd: null,
    })

    expect(durum.state).toBe('expired')
  })

  it('ödenmiş üyelik, ücretlendirme anahtarı KAPALIYKEN bile aktif', () => {
    /*
     * Yönetici test ödemesi tam olarak bu durumda yapılıyor:
     * `BILLING_STARTS_AT` null ama gerçek bir abonelik satırı var.
     * Parasını aldığımız kullanıcıyı "ücretsiz kullanım"da göstermek,
     * ekranda tahsilatı inkâr etmek olurdu.
     */
    const durum = hesaplaUyelikDurumu(KAYIT, DENEME_BITTI, null, {
      status: 'ACTIVE',
      currentPeriodEnd: gunSonra(90),
    })

    expect(durum.state).toBe('active')
  })
})

describe('şerit kararı sunucuda veriliyor', () => {
  it('deneme eşiğe girmeden şerit YOK', () => {
    const durum = hesaplaUyelikDurumu(KAYIT, gunSonra(1), BASLANGIC)

    expect(durum.state).toBe('trial')
    expect(durum.showBanner, 'daha karar vermesi gerekmeyen kullanıcı rahatsız edilmez').toBe(false)
  })

  it('son günlerde şerit VAR ve kalan gün sayısı taşınıyor', () => {
    /* Eşiğin içine güvenle giren bir gün seç: uyarı penceresinin
       ortası. Sınırın tam üstünde durmak, yuvarlama yönü değişince
       düşen kırılgan bir test olurdu. */
    const durum = hesaplaUyelikDurumu(KAYIT, gunSonra(TRIAL_DAYS - Math.floor(TRIAL_WARNING_DAYS / 2)), BASLANGIC)

    expect(durum.state).toBe('trial')
    expect(durum.showBanner).toBe(true)
    expect(durum.trialDaysLeft).toBeGreaterThan(0)
    expect(durum.trialDaysLeft).toBeLessThanOrEqual(TRIAL_WARNING_DAYS)
  })
})
