import { describe, it, expect } from 'vitest'
import * as arkaUc from '../src/config/billing.js'
// @ts-expect-error — ön yüz JS modülü, tip bildirimi yok; bilerek.
import * as onYuz from '../frontend/src/config/billing.js'

/*
 * Fiyat ve deneme süresi İKİ dosyada yazılı:
 *   src/config/billing.ts            (arka uç — otorite)
 *   frontend/src/config/billing.js   (ön yüz aynası)
 *
 * Ayrı derleme hedefleri oldukları için biri diğerini import edemiyor.
 * Bu testin tek işi ikisinin AYRIŞMADIĞINI kanıtlamak.
 *
 * Neden önemli: aynı rakamlar hem fiyat sayfasında, hem Ayarlar'da,
 * hem de mesafeli satış / abonelik sözleşmelerinde geçiyor. Ön yüzde
 * 149, arka uçta 199 yazsaydı kullanıcıya gösterilen fiyat ile tahsil
 * edilen tutar farklı olurdu — bu yalnız hata değil, tüketici
 * mevzuatı açısından yanlış beyandır.
 */

describe('billing yapılandırması: ön yüz ↔ arka uç', () => {
  it('para birimi aynı', () => {
    expect(onYuz.BILLING_CURRENCY).toBe(arkaUc.BILLING_CURRENCY)
  })

  it('ücretlendirme başlangıcı aynı', () => {
    /* İkisinden biri açılıp diğeri unutulursa arayüz sayaç gösterirken
       sunucu hâlâ "başlamadı" der — ya da tersi. */
    expect(onYuz.BILLING_STARTS_AT).toBe(arkaUc.BILLING_STARTS_AT)
  })

  it('deneme süresi ve uyarı eşiği aynı', () => {
    expect(onYuz.TRIAL_DAYS).toBe(arkaUc.TRIAL_DAYS)
    expect(onYuz.TRIAL_WARNING_DAYS).toBe(arkaUc.TRIAL_WARNING_DAYS)
  })

  it('aşama kodları, fiyatları ve süreleri birebir aynı', () => {
    const sadelestir = (s: { code: string; monthlyPrice: number; months: number | null }) =>
      ({ code: s.code, monthlyPrice: s.monthlyPrice, months: s.months })

    expect(onYuz.FOUNDER_STAGES.map(sadelestir)).toEqual(arkaUc.FOUNDER_STAGES.map(sadelestir))
  })

  it('fiyat modelinin üç dayanağı iki tarafta da aynı', () => {
    /* Kurucu indirimi ORANSAL: bu üç sayı ayrışırsa ön yüz bir
       yüzde, arka uç başka bir yüzde uygular ve kullanıcıya
       taahhüt edilen indirim ile tahsil edilen tutar tutmaz. */
    expect(onYuz.STANDARD_MONTHLY_PRICE).toBe(arkaUc.STANDARD_MONTHLY_PRICE)
    expect(onYuz.FOUNDER_DISCOUNT_RATE).toBe(arkaUc.FOUNDER_DISCOUNT_RATE)
    expect(onYuz.YEARLY_FREE_MONTHS).toBe(arkaUc.YEARLY_FREE_MONTHS)
  })

  it('türetilen tutarlar ve geçiş ayı aynı', () => {
    /* Ödeme paneli "bugün ödenecek" ve "N. aydan itibaren" değerlerini
       bu fonksiyonlardan üretiyor; iki taraf ayrışırsa panelde
       gösterilen tutar sunucunun tahsil edeceğinden farklı olur. */
    expect(onYuz.ilkUcretliTutar()).toBe(arkaUc.ilkUcretliTutar())
    expect(onYuz.kuruculUyeFiyati()).toBe(arkaUc.kuruculUyeFiyati())
    expect(onYuz.kuruculIndirimYuzdesi()).toBe(arkaUc.kuruculIndirimYuzdesi())
    expect(onYuz.nihaiFiyataGecisAyi()).toBe(arkaUc.nihaiFiyataGecisAyi())
  })

  it('yıllık seçeneğin tutarları aynı', () => {
    /* Yıllık peşin tutarı ön yüzde 2.990, arka uçta 3.588 olsaydı
       kullanıcı gördüğünden farklı bir tutarla karşılaşırdı. */
    expect(onYuz.yillikTutar()).toBe(arkaUc.yillikTutar())
    expect(onYuz.yillikAylikKarsiligi()).toBe(arkaUc.yillikAylikKarsiligi())
    expect(onYuz.yillikKazanc()).toBe(arkaUc.yillikKazanc())
  })
})
