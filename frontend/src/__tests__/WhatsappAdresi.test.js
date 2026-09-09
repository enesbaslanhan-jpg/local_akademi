import { describe, it, expect } from 'vitest'
import { SATICI, whatsappAdresi } from '@/config/seller'

/*
 * Alt bilgideki telefon satırı WhatsApp açıyor. Adres numaradan
 * TÜRETİLİYOR; numara değiştiğinde bağlantının sessizce bozulmaması
 * için biçim burada kilitleniyor.
 */
describe('whatsappAdresi', () => {
  it('yayımlanan numara için wa.me adresi üretiyor', () => {
    expect(whatsappAdresi()).toBe('https://wa.me/908502411940')
  })

  it('yayımlanan numara beklenen ulusal biçimde', () => {
    /* Bu test SATICI.telefon değişince ötekiyle birlikte düşsün diye
       var: 10 haneli değilse arayüz bağlantıyı hiç çizmiyor. */
    const rakamlar = String(SATICI.telefon).replace(/\D/g, '')
    expect(rakamlar.replace(/^0/, '')).toHaveLength(10)
  })
})
