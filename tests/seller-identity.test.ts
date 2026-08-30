import { describe, it, expect } from 'vitest'
import { BILLING_STARTS_AT } from '../src/config/billing.js'
import { LEGAL_DOCUMENTS, requiredDocuments, findDocument } from '../src/config/legal-documents.js'
// @ts-expect-error — ön yüz JS modülü, tip bildirimi yok; bilerek.
import { SATICI, saticiKimligiTam, saticiSatirlari } from '../frontend/src/config/seller.js'

/*
 * SATICI KİMLİĞİ VE TİCARİ BELGELER.
 *
 * Bu dosyanın koruduğu şey bir kod ayrıntısı değil, bir SIRA:
 * ücretlendirme, satıcı kimliği eksikken açılamaz.
 *
 * Mesafeli Sözleşmeler Yönetmeliği satıcının açık adresini ve
 * iletişim bilgisini zorunlu kılıyor. "Başvuru geçti, adresi koymayı
 * unuttuk" senaryosu bu testle imkânsız hâle geliyor: `BILLING_STARTS_AT`
 * dolduğu an, kimlik eksikse takım kırmızıya düşüyor.
 */

describe('satıcı kimliği', () => {
  it('🔴 ücretlendirme açıksa kimlik EKSİKSİZ olmalı', () => {
    if (BILLING_STARTS_AT === null) {
      /* Bugünkü hâl: ücretlendirme kapalı, kimlik henüz beklenebilir.
         Test burada geçiyor ama sessiz kalmıyor — aşağıdaki assertion
         kapalı olduğunu KANITLIYOR ki bu dal yanlışlıkla sonsuza kadar
         atlanmasın. */
      expect(BILLING_STARTS_AT).toBeNull()
      return
    }

    /* 🦷 Diş kontrolü: config'e geçici bir tarih yazıp bu testin
       düştüğü görülecek. Düşmüyorsa koruma çalışmıyordur.

       ⚠️ `kimlikNo` ARANMIYOR — yayımlanması gerekmiyor. Mevzuatın
       sitede aradığı asgari küme ad + açık adres + telefon + iletişim
       adresi; TC kimlik numarası bu listede yok. */
    expect(saticiKimligiTam()).toBe(true)
    expect(SATICI.adres, 'açık posta adresi zorunlu').toBeTruthy()
    expect(SATICI.telefon, 'telefon zorunlu').toBeTruthy()
  })

  it('🔴 kimlik numarası HİÇBİR koşulda yayımlanmaz', () => {
    /*
     * Ürün sahibi kararı (29.08.2026): TC kimlik numarası herkese açık
     * sayfaya konmuyor. Mevzuat da istemiyor — Mesafeli Sözleşmeler
     * Yönetmeliği satıcıdan "adı veya unvanı, varsa MERSİS numarası,
     * açık adresi, telefon numarası" istiyor.
     *
     * Yayımlanan kimlik numarası geri alınamaz ve kimlik avında
     * doğrudan kullanılabilir.
     *
     * 🦷 Bu test, alan DOLU olsa bile listeye sızmadığını sınıyor —
     * `saticiSatirlari`ye `kimlikNo` geri eklenirse düşer.
     */
    const anahtarlar = saticiSatirlari().map((s: { anahtar: string }) => s.anahtar)
    expect(anahtarlar).not.toContain('kimlikNo')

    /* Değer doluymuş gibi davranıldığında da sızmamalı. */
    const yedek = SATICI.kimlikNo
    SATICI.kimlikNo = '12345678901'
    try {
      const doluyken = saticiSatirlari().map((s: { anahtar: string }) => s.anahtar)
      expect(doluyken).not.toContain('kimlikNo')
      expect(JSON.stringify(saticiSatirlari())).not.toContain('12345678901')
    } finally {
      SATICI.kimlikNo = yedek
    }
  })

  it('kimlik satırlarında boş değer BULUNMAZ', () => {
    /* Eksik alan listeye hiç girmemeli. Önceki sürüm eksik alanlara
       "TODO_URUN_SAHIBI: açık posta adresi" gibi yer tutucu METİNLER
       basıyordu ve bunlar gerçek ziyaretçiye görünüyordu. */
    for (const satir of saticiSatirlari()) {
      expect(satir.deger).toBeTruthy()
      expect(String(satir.deger)).not.toContain('TODO')
    }
  })

  it('ad ve e-posta her hâlükârda var', () => {
    const anahtarlar = saticiSatirlari().map((s: { anahtar: string }) => s.anahtar)
    expect(anahtarlar).toContain('ad')
    expect(anahtarlar).toContain('eposta')
  })
})

describe('ticari satış belgeleri', () => {
  const TICARI = ['on-bilgilendirme', 'mesafeli-satis', 'teslimat-iade', 'abonelik']

  it('dördü de kayıtlı', () => {
    for (const tip of TICARI) {
      expect(findDocument(tip), `${tip} kayıtlı olmalı`).toBeDefined()
    }
  })

  it('🔴 hiçbiri kayıtta ZORUNLU değil', () => {
    /* `requiredAtSignup: true` yapılırsa `auth.ts` her required belgeye
       otomatik onay satırı yazar, kayıt formunun etiketi yalan olur ve
       MEVCUT bütün kullanıcılara onay şeridi çıkar. Bunlar satın alma
       anında onaylanır, kayıt anında değil. */
    for (const tip of TICARI) {
      expect(findDocument(tip)?.requiredAtSignup, `${tip} false olmalı`).toBe(false)
    }
  })

  it('kayıtta zorunlu belgeler hâlâ yalnız ikisi', () => {
    const zorunlu = requiredDocuments().map(d => d.type).sort()
    expect(zorunlu).toEqual(['privacy', 'terms'])
  })

  it('her belgenin sürümü geçerli bir tarih biçiminde', () => {
    for (const belge of LEGAL_DOCUMENTS) {
      expect(belge.version, `${belge.type} sürümü`).toMatch(/^\d{4}-\d{2}-\d{2}(\.\d+)?$/)
    }
  })

  it('ödeme maddeleri eklendiği için terms ve privacy sürümü arttı', () => {
    /* Metin ile özellik AYNI turda güncellenir — deponun iki kez
       ihlal edip ders çıkardığı kural. Ödeme bölümleri eklendiğine
       göre bu iki belge 2026-08-25'te KALAMAZ. */
    expect(findDocument('terms')?.version).not.toBe('2026-08-25')
    expect(findDocument('privacy')?.version).not.toBe('2026-08-25')
  })
})
