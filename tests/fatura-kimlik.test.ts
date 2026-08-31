import { describe, expect, it } from 'vitest'
import {
  faturaKimligiDogrula,
  paytrAdresi,
  tcknGecerli,
  telefonNormalize,
  vknGecerli,
} from '../src/services/payments/fatura-kimlik.js'

/*
 * FATURA KİMLİK BİLGİSİ.
 *
 * 🔴 ÖLÇÜLEN EKSİK: `/checkout` PayTR'ye `user_address` ve
 * `user_phone` olarak "Belirtilmedi" gönderiyordu. Ödeme çalışıyordu
 * ama fatura kesilebilecek hiçbir bilgi toplanmıyordu.
 *
 * Ürün sahibi kararları (31.08.2026):
 *   - Form ödeme panelinin İÇİNDE, karttan önceki adım.
 *   - Bireysel alıcıda TCKN İSTEĞE BAĞLI.
 */

/*
 * 🔴 BU DEĞER ELDE DOĞRULANDI, uydurulmadı:
 * 1-0-0-0-0-0-0-0-1-4-6
 *   tek sıra (1.,3.,5.,7.,9.) = 1+0+0+0+1 = 2
 *   çift sıra (2.,4.,6.,8.)   = 0
 *   10. hane = (2×7 − 0) mod 10 = 4 ✓
 *   11. hane = ilk on hanenin toplamı (6) mod 10 = 6 ✓
 *
 * Beklenen değeri algoritmanın kendisinden hesaplasaydım test hiçbir
 * şey korumazdı — gövdeye `return true` yazsam yine geçerdi.
 */
const GECERLI_TCKN = '10000000146'

describe('TCKN doğrulaması', () => {
  it('elde hesaplanmış geçerli numarayı KABUL ediyor', () => {
    expect(tcknGecerli(GECERLI_TCKN)).toBe(true)
  })

  it('🦷 son hanesi bozulmuş numarayı REDDEDİYOR', () => {
    /* Sağlama çalışmasaydı bu da geçerdi — testin dişi burada. */
    expect(tcknGecerli('10000000147')).toBe(false)
  })

  it('🦷 10. hanesi bozulmuş numarayı REDDEDİYOR', () => {
    expect(tcknGecerli('10000000156')).toBe(false)
  })

  it('biçim kurallarını uyguluyor', () => {
    expect(tcknGecerli('00000000146'), 'ilk hane 0 olamaz').toBe(false)
    expect(tcknGecerli('1000000014'), '10 hane').toBe(false)
    expect(tcknGecerli('100000001460'), '12 hane').toBe(false)
    expect(tcknGecerli('1000000014a'), 'harf').toBe(false)
    expect(tcknGecerli('')).toBe(false)
  })
})

describe('VKN doğrulaması', () => {
  /*
   * ⚠️ Burada SAĞLAMA SINANMIYOR ve bu bilinçli. VKN'nin kontrol hanesi
   * algoritmasını doğrulayabileceğim bilinen-geçerli bir örnek yok;
   * hatırladığım bir formülü kendi ürettiğim değerlerle sınamak,
   * algoritmayı değil yalnız kendi tutarlılığımı doğrulardı. Yanlış
   * bir sağlama, geçerli numarasını giren kurumsal müşteriyi kapıda
   * durdururdu — bu, sağlama olmamasından kötü.
   */
  it('10 haneyi kabul, diğer uzunlukları reddediyor', () => {
    expect(vknGecerli('1234567890')).toBe(true)
    expect(vknGecerli('123456789')).toBe(false)
    expect(vknGecerli('12345678901')).toBe(false)
    expect(vknGecerli('123456789a')).toBe(false)
  })

  it('hepsi aynı rakam olan değeri reddediyor — doldurma', () => {
    expect(vknGecerli('0000000000')).toBe(false)
    expect(vknGecerli('1111111111')).toBe(false)
  })
})

describe('telefon', () => {
  it('+90 ve baştaki 0 atılıyor', () => {
    expect(telefonNormalize('+90 532 111 22 33')).toBe('5321112233')
    expect(telefonNormalize('0532 111 22 33')).toBe('5321112233')
    expect(telefonNormalize('532-111-22-33')).toBe('5321112233')
  })
})

const TAM_BIREYSEL = {
  tip: 'INDIVIDUAL',
  unvan: 'Ayşe Yılmaz',
  telefon: '0532 111 22 33',
  adres: 'Atatürk Caddesi No 12 Daire 5',
  il: 'İstanbul',
  ilce: 'Kadıköy',
}

describe('form doğrulaması — bireysel', () => {
  it('TCKN OLMADAN geçiyor — isteğe bağlı', () => {
    const s = faturaKimligiDogrula(TAM_BIREYSEL)

    expect(s.ok, JSON.stringify(s.hatalar)).toBe(true)
    expect(s.deger?.tckn, 'boş bırakılan TCKN null saklanır').toBeNull()
  })

  it('🦷 TCKN YAZILDIYSA doğru olmak ZORUNDA', () => {
    /* İsteğe bağlı olmak, yanlışını sessizce kaydetmek demek değil —
       hatalı kimlik numarası hatalı fatura demek. */
    const s = faturaKimligiDogrula({ ...TAM_BIREYSEL, tckn: '10000000147' })

    expect(s.ok).toBe(false)
    expect(s.hatalar.tckn).toBe('gecersiz')
  })

  it('geçerli TCKN yazılırsa saklanıyor', () => {
    const s = faturaKimligiDogrula({ ...TAM_BIREYSEL, tckn: GECERLI_TCKN })
    expect(s.deger?.tckn).toBe(GECERLI_TCKN)
  })

  it('eksik alanları alan alan bildiriyor', () => {
    const s = faturaKimligiDogrula({ tip: 'INDIVIDUAL' })

    expect(s.ok).toBe(false)
    /* Tek bir "form hatalı" mesajı, kullanıcıya hangi kutuyu
       düzelteceğini söylemez. */
    expect(Object.keys(s.hatalar).sort()).toEqual(['adres', 'il', 'ilce', 'telefon', 'unvan'])
  })

  it('geçersiz telefonu yakalıyor', () => {
    expect(faturaKimligiDogrula({ ...TAM_BIREYSEL, telefon: '123' }).hatalar.telefon).toBe('gecersiz')
  })
})

describe('form doğrulaması — kurumsal', () => {
  const TAM_KURUMSAL = {
    ...TAM_BIREYSEL,
    tip: 'CORPORATE',
    unvan: 'Örnek Ticaret Limited Şirketi',
    vkn: '1234567890',
    vergiDairesi: 'Kadıköy',
  }

  it('VKN ve vergi dairesiyle geçiyor', () => {
    const s = faturaKimligiDogrula(TAM_KURUMSAL)

    expect(s.ok, JSON.stringify(s.hatalar)).toBe(true)
    expect(s.deger?.vkn).toBe('1234567890')
    expect(s.deger?.vergiDairesi).toBe('Kadıköy')
  })

  it('🦷 VKN ve vergi dairesi ZORUNLU', () => {
    const s = faturaKimligiDogrula({ ...TAM_KURUMSAL, vkn: '', vergiDairesi: '' })

    expect(s.ok).toBe(false)
    expect(s.hatalar.vkn).toBe('zorunlu')
    expect(s.hatalar.vergiDairesi).toBe('zorunlu')
  })

  it('🔴 kurumsalda TCKN gönderilse bile SAKLANMIYOR', () => {
    /* KVKK — gereksiz kişisel veri toplamıyoruz. Kurumsal faturada
       TCKN'nin bir işi yok; formdan gelse de atılıyor. */
    const s = faturaKimligiDogrula({ ...TAM_KURUMSAL, tckn: GECERLI_TCKN })

    expect(s.ok).toBe(true)
    expect(s.deger?.tckn).toBeNull()
  })

  it('kurumsalda geçersiz TCKN ödemeyi ENGELLEMİYOR', () => {
    /* Zaten atılan bir alan yüzünden kullanıcıyı durdurmak anlamsız. */
    const s = faturaKimligiDogrula({ ...TAM_KURUMSAL, tckn: '99999999999' })
    expect(s.ok).toBe(true)
  })
})

describe('PayTR adresi', () => {
  it('adres, ilçe ve ili tek satırda birleştiriyor', () => {
    const s = faturaKimligiDogrula(TAM_BIREYSEL)

    /* PayTR `user_address`i zorunlu tutuyor ve tek alan istiyor;
       bugüne kadar oraya "Belirtilmedi" gidiyordu. */
    expect(paytrAdresi(s.deger!)).toBe('Atatürk Caddesi No 12 Daire 5, Kadıköy, İstanbul')
  })
})
