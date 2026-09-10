import { describe, it, expect } from 'vitest'
import { cariBakiye, listeBakiyesi } from '../src/services/cari-hesap.js'

/*
 * CARİ HESAP.
 *
 * 🔴 "Ahmet'e ne kadar borcum var?" sorusunun cevabı üründe hiçbir yerde
 * yoktu. Bir esnafın defterinde ilk baktığı sayı budur.
 */

const k = (
  direction: string,
  amount: number | null,
  status = 'open',
  currency = 'TRY'
) => ({ direction, amount, status, currency })

describe('cari bakiye', () => {
  it('alacaktan borcu düşüyor', () => {
    const [b] = cariBakiye([k('receivable', 5000), k('payable', 2000)])
    expect(b.alacak).toBe(5000)
    expect(b.borc).toBe(2000)
    expect(b.bakiye).toBe(3000)
  })

  it('borç fazlaysa bakiye eksiye düşüyor', () => {
    const [b] = cariBakiye([k('receivable', 1000), k('payable', 4000)])
    expect(b.bakiye).toBe(-3000)
  })

  /* Tamamlanan ödeme artık borç değildir. */
  it('kapanan kayıtlar bakiyeye girmiyor', () => {
    const bakiyeler = cariBakiye([
      k('payable', 1000, 'completed'),
      k('payable', 500, 'cancelled'),
      k('payable', 300, 'open')
    ])
    expect(bakiyeler[0].borc).toBe(300)
  })

  it('ertelenen ve işlemdeki kayıtlar bakiyede kalıyor', () => {
    /* Ertelemek ödemek değildir. */
    const [b] = cariBakiye([k('payable', 100, 'deferred'), k('payable', 50, 'in_progress')])
    expect(b.borc).toBe(150)
  })

  /* Görev ve sevkiyat kaydının borç/alacak anlamı yok. */
  it('yönü belirsiz kayıtlar hesaba girmiyor', () => {
    const bakiyeler = cariBakiye([k('neutral', 9999), k('receivable', 100)])
    expect(bakiyeler[0].alacak).toBe(100)
    expect(bakiyeler[0].borc).toBe(0)
  })

  /*
   * ⚠️ Tutarsız kayıt SIFIR SAYILMIYOR, atlanıyor. İkisi aynı şey değil.
   */
  it('tutarı olmayan kayıt atlanıyor', () => {
    const bakiyeler = cariBakiye([k('payable', null), k('payable', 250)])
    expect(bakiyeler[0].borc).toBe(250)
  })

  /*
   * 🔴 EN KRİTİK KURAL: farklı para birimleri TOPLANMIYOR.
   *
   * Kur bilgisi sistemde yok; 5.000 TL ile 200 USD'yi tek sayıda
   * toplamak uydurma bir rakam üretirdi.
   */
  it('para birimlerini karıştırmıyor', () => {
    const bakiyeler = cariBakiye([
      k('payable', 5000, 'open', 'TRY'),
      k('receivable', 200, 'open', 'USD')
    ])
    expect(bakiyeler).toHaveLength(2)
    const tl = bakiyeler.find(b => b.currency === 'TRY')!
    const usd = bakiyeler.find(b => b.currency === 'USD')!
    expect(tl.bakiye).toBe(-5000)
    expect(usd.bakiye).toBe(200)
  })

  it('para birimi küçük harfle gelse de aynı kovaya giriyor', () => {
    const bakiyeler = cariBakiye([k('payable', 100, 'open', 'try'), k('payable', 50, 'open', 'TRY')])
    expect(bakiyeler).toHaveLength(1)
    expect(bakiyeler[0].borc).toBe(150)
  })

  it('hiç kayıt yoksa boş liste', () => {
    expect(cariBakiye([])).toEqual([])
  })
})

describe('liste bakiyesi', () => {
  it('işletmenin para birimini öne alıyor', () => {
    const bakiyeler = cariBakiye([
      k('receivable', 100, 'open', 'USD'),
      k('payable', 50, 'open', 'TRY')
    ])
    const { birincil } = listeBakiyesi(bakiyeler, 'TRY')
    expect(birincil!.currency).toBe('TRY')
  })

  /*
   * Tek sayı gösterip başka para biriminde de hesap olduğunu gizlemek,
   * kullanıcıya eksik bilgi vermek olurdu.
   */
  it('diğer para birimlerinin varlığını bildiriyor', () => {
    const bakiyeler = cariBakiye([
      k('payable', 50, 'open', 'TRY'),
      k('receivable', 100, 'open', 'USD'),
      k('receivable', 90, 'open', 'EUR')
    ])
    const { digerParaBirimleri } = listeBakiyesi(bakiyeler, 'TRY')
    expect(digerParaBirimleri).toBe(2)
  })

  it('işletmenin para biriminde hesap yoksa en büyüğü gösteriyor', () => {
    const bakiyeler = cariBakiye([k('receivable', 100, 'open', 'USD')])
    const { birincil } = listeBakiyesi(bakiyeler, 'TRY')
    expect(birincil!.currency).toBe('USD')
  })

  it('hesap yoksa birincil null', () => {
    expect(listeBakiyesi([], 'TRY').birincil).toBeNull()
  })
})
