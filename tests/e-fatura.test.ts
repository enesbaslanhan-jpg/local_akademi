import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ublFaturasiniAyristir, faturaYonu, UblAyristirmaHatasi } from '../src/services/e-fatura.js'

/*
 * UBL-TR AYRIŞTIRICI.
 *
 * 🔴 BU TESTLER ELLE UYDURULMUŞ XML'E DEĞİL, GİB'İN RESMÎ ÖRNEKLERİNE
 * BAKIYOR. `tests/fixtures/ubl/` altındaki dosyalar
 * `ebelge.gib.gov.tr/dosyalar/kilavuzlar/UBL-TR1.2.1_Paketi.zip`
 * içinden olduğu gibi alındı.
 *
 * Sebebi: kendi yazdığım örneğe göre yazılan bir ayrıştırıcı yalnız
 * kendi örneğimi okur. Gerçek paket taranınca üç varsayımım yanlış
 * çıktı -- vadenin zorunlu olduğu, kimliğin hep VKN olduğu ve unvanın
 * hep `PartyName` altında bulunduğu. Üçü de gerçek dosyalarda kırılıyor.
 */

const oku = (ad: string) => readFileSync(join(__dirname, 'fixtures', 'ubl', ad), 'utf-8')

describe('gerçek GİB faturaları okunuyor', () => {
  it('temel fatura: tutar, tarih ve taraflar birebir', () => {
    const f = ublFaturasiniAyristir(oku('TemelFaturaOrnegi.xml'))

    expect(f.id).toBe('GIB20090000000001')
    expect(f.duzenlemeTarihi).toBe('2009-01-05')
    expect(f.odenecekTutar).toBe(17.88)
    expect(f.paraBirimi).toBe('TRY')
    expect(f.profil).toBe('TEMELFATURA')

    expect(f.satici.unvan).toBe('AAA Anonim Şirketi')
    expect(f.satici.kimlik).toBe('1288331521')
    expect(f.satici.kimlikTuru).toBe('VKN')
  })

  /*
   * Bu faturada alıcı GERÇEK KİŞİ: `PartyName` yok, ad-soyad
   * `Person` altında. Yalnız `PartyName`e bakan bir ayrıştırıcı
   * burada boş unvan dönerdi.
   */
  it('gerçek kişi alıcının adı Person altından okunur', () => {
    const f = ublFaturasiniAyristir(oku('TemelFaturaOrnegi.xml'))
    expect(f.alici.unvan).toBe('Ali YILMAZ')
    expect(f.alici.kimlikTuru).toBe('TCKN')
  })

  /*
   * 🔴 TUZAK: aynı alıcının altında TCKN'nin yanında `TESISATNO` ve
   * `SAYACNO` da var. İlk `PartyIdentification`ı almak, kimlik yerine
   * elektrik sayacı numarasını okumak olurdu.
   */
  it('sayaç/tesisat numarası kimlik sanılmaz', () => {
    const f = ublFaturasiniAyristir(oku('TemelFaturaOrnegi.xml'))
    expect(f.alici.kimlik).toBe('1234567890')
    expect(f.alici.kimlikTuru).toBe('TCKN')
    expect(f.alici.kimlik).not.toBe('1234567')   // TESISATNO
    expect(f.alici.kimlik).not.toBe('12345678')  // SAYACNO
  })

  /*
   * Yukarıdaki test tek başına ZAYIF: o dosyada TCKN zaten ilk sırada,
   * yani "ilkini al" diyen hatalı bir ayrıştırıcı da doğru cevabı
   * verirdi -- test yanlış sebeple yeşil olurdu.
   *
   * Bu yüzden sıra BİLEREK ters çevrilmiş bir belge: sayaç ve tesisat
   * numarası önce, kimlik sonra geliyor. Şema filtresi çalışmıyorsa
   * burada sayaç numarası kimlik olarak okunur.
   */
  it('kimlik ilk sırada olmasa da doğru şemadan okunur', () => {
    const xml = `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
      xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
      xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
      <cbc:ID>A1</cbc:ID><cbc:IssueDate>2026-08-23</cbc:IssueDate>
      <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
      <cac:AccountingCustomerParty><cac:Party>
        <cac:PartyIdentification><cbc:ID schemeID="SAYACNO">99999999</cbc:ID></cac:PartyIdentification>
        <cac:PartyIdentification><cbc:ID schemeID="TESISATNO">88888888</cbc:ID></cac:PartyIdentification>
        <cac:PartyIdentification><cbc:ID schemeID="TCKN">11111111111</cbc:ID></cac:PartyIdentification>
      </cac:Party></cac:AccountingCustomerParty>
      <cac:LegalMonetaryTotal><cbc:PayableAmount currencyID="TRY">10.00</cbc:PayableAmount></cac:LegalMonetaryTotal>
    </Invoice>`
    const f = ublFaturasiniAyristir(xml)
    expect(f.alici.kimlik).toBe('11111111111')
    expect(f.alici.kimlikTuru).toBe('TCKN')
  })

  it('ticari fatura: vade tarihi okunur', () => {
    const f = ublFaturasiniAyristir(oku('TicariFaturaOrnegi.xml'))
    expect(f.odenecekTutar).toBe(29755.47)
    expect(f.vadeTarihi).toBe('2008-11-25')
    expect(f.satici.kimlikTuru).toBe('VKN')
    expect(f.alici.unvan).toContain('BBB')
  })

  /*
   * Para birimi TRY VARSAYILMIYOR. Bu ihracat faturası USD; TRY
   * varsayan bir ayrıştırıcı 26.475 doları 26.475 lira sanardı.
   */
  it('yabancı para birimi doğru okunur, TRY varsayılmaz', () => {
    const f = ublFaturasiniAyristir(oku('ISTISNA-1.xml'))
    expect(f.paraBirimi).toBe('USD')
    expect(f.odenecekTutar).toBe(26475)
  })

  /* Bu faturada alıcının hiç kimlik numarası yok -- olağan bir durum. */
  it('kimliksiz taraf hata değil, null döner', () => {
    const f = ublFaturasiniAyristir(oku('ISTISNA-1.xml'))
    expect(f.alici.unvan).toBe('XEZER BSS MMC')
    expect(f.alici.kimlik).toBeNull()
    expect(f.alici.kimlikTuru).toBeNull()
  })

  it('özel matrah faturası okunur', () => {
    const f = ublFaturasiniAyristir(oku('OZELMATRAH.xml'))
    expect(f.odenecekTutar).toBe(24.94)
    expect(f.alici.kimlikTuru).toBe('TCKN')
  })

  /* Vade örneklerin %86'sında yok; zorunlu sayılmamalı. */
  it('vadesiz fatura reddedilmez', () => {
    const f = ublFaturasiniAyristir(oku('OZELMATRAH.xml'))
    expect(f.vadeTarihi).toBeNull()
    expect(f.odenecekTutar).toBeGreaterThan(0)
  })
})

describe('fatura OLMAYAN UBL belgeleri reddedilir', () => {
  /*
   * İrsaliye ve uygulama yanıtı geçerli UBL belgeleridir ama tutar
   * taşımazlar. Kök öğe kontrolü olmasaydı "tutarı 0 olan fatura"
   * gibi görünürlerdi -- kullanıcıya yanlış bir öneri düşerdi.
   */
  it('e-İrsaliye fatura sayılmaz', () => {
    expect(() => ublFaturasiniAyristir(oku('Irsaliye-Ornek1.xml')))
      .toThrow(/e-İrsaliye/)
  })

  it('uygulama yanıtı fatura sayılmaz', () => {
    expect(() => ublFaturasiniAyristir(oku('KabulUygulamaYanitiOrnegi.xml')))
      .toThrow(/uygulama yanıtı/)
  })

  /*
   * 🔴 GERÇEK OLAY. Ürün sahibi "e-fatura XML'i" diye Canva'nın baskı
   * çıktısını gönderdi. Dosya GEÇERLİ bir XML -- DTD yok, biçim doğru
   * -- yani yükleme kapısından geçer. Ayrıştırıcı ayrıca "bu bir UBL
   * faturası mı" diye sormasaydı, kullanıcıya tutarsız bir öneri
   * gösterilirdi.
   */
  it('geçerli ama fatura olmayan XML (çizim formatı) reddedilir', () => {
    expect(() => ublFaturasiniAyristir(oku('CizimFormati-FaturaDegil.xml')))
      .toThrow(/UBL faturası değil/)
  })

  it('bozuk XML sessizce yutulmaz', () => {
    expect(() => ublFaturasiniAyristir('<Invoice><ID>1</Invoice>'))
      .toThrow(UblAyristirmaHatasi)
  })
})

describe('eksik zorunlu alanlar sessizce geçilmez', () => {
  /*
   * Hepsinde ORTAK ilke: yarım okunmuş bir fatura, hiç okunmamış
   * faturadan kötüdür. "Tutar 0 TL" diyen bir öneri kullanıcıyı
   * yanıltır; hata fırlatmak dürüst olan.
   */
  const govde = (ic: string) =>
    `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
      xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
      xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">${ic}</Invoice>`

  it('tutarsız fatura reddedilir', () => {
    const xml = govde('<cbc:ID>A1</cbc:ID><cbc:IssueDate>2026-08-23</cbc:IssueDate><cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>')
    expect(() => ublFaturasiniAyristir(xml)).toThrow(/PayableAmount/)
  })

  it('tarihsiz fatura reddedilir', () => {
    const xml = govde('<cbc:ID>A1</cbc:ID><cac:LegalMonetaryTotal><cbc:PayableAmount currencyID="TRY">10.00</cbc:PayableAmount></cac:LegalMonetaryTotal>')
    expect(() => ublFaturasiniAyristir(xml)).toThrow(/IssueDate/)
  })

  it('numarasız fatura reddedilir', () => {
    const xml = govde('<cbc:IssueDate>2026-08-23</cbc:IssueDate><cac:LegalMonetaryTotal><cbc:PayableAmount currencyID="TRY">10.00</cbc:PayableAmount></cac:LegalMonetaryTotal>')
    expect(() => ublFaturasiniAyristir(xml)).toThrow(/Fatura numarası/)
  })

  /* Para birimi yoksa TRY varsayılmıyor -- yanlış para birimi,
     yanlış tutardır. */
  it('para birimi hiç yoksa reddedilir', () => {
    const xml = govde('<cbc:ID>A1</cbc:ID><cbc:IssueDate>2026-08-23</cbc:IssueDate><cac:LegalMonetaryTotal><cbc:PayableAmount>10.00</cbc:PayableAmount></cac:LegalMonetaryTotal>')
    expect(() => ublFaturasiniAyristir(xml)).toThrow(/Para birimi/)
  })

  it('para birimi yalnız öznitelikte varsa oradan okunur', () => {
    const xml = govde('<cbc:ID>A1</cbc:ID><cbc:IssueDate>2026-08-23</cbc:IssueDate><cac:LegalMonetaryTotal><cbc:PayableAmount currencyID="eur">10.00</cbc:PayableAmount></cac:LegalMonetaryTotal>')
    expect(ublFaturasiniAyristir(xml).paraBirimi).toBe('EUR')
  })
})

describe('sayı ve kimlik dönüşümü', () => {
  const fatura = (tutar: string, vkn = '0012345678') =>
    `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
      xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
      xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
      <cbc:ID>A1</cbc:ID><cbc:IssueDate>2026-08-23</cbc:IssueDate>
      <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
      <cac:AccountingSupplierParty><cac:Party>
        <cac:PartyIdentification><cbc:ID schemeID="VKN">${vkn}</cbc:ID></cac:PartyIdentification>
      </cac:Party></cac:AccountingSupplierParty>
      <cac:LegalMonetaryTotal><cbc:PayableAmount currencyID="TRY">${tutar}</cbc:PayableAmount></cac:LegalMonetaryTotal>
    </Invoice>`

  /*
   * 🔴 VKN metin kalmalı. Otomatik sayı dönüşümü açık olsaydı
   * "0012345678" 12345678 olur, baştaki iki sıfır kaybolur ve kimlik
   * BOZULURDU.
   */
  it('baştaki sıfırlı VKN bozulmaz', () => {
    expect(ublFaturasiniAyristir(fatura('10.00')).satici.kimlik).toBe('0012345678')
  })

  /*
   * UBL her zaman nokta ondalık kullanır. Türkçe yerel ayarla
   * çevrilseydi 1.234,56 ile 1234.56 karışırdı.
   */
  it('nokta ondalık doğru okunur', () => {
    expect(ublFaturasiniAyristir(fatura('1234.56')).odenecekTutar).toBe(1234.56)
    expect(ublFaturasiniAyristir(fatura('0.05')).odenecekTutar).toBe(0.05)
  })

  it('sayı olmayan tutar kabul edilmez', () => {
    expect(() => ublFaturasiniAyristir(fatura('1.234,56'))).toThrow(/PayableAmount/)
    expect(() => ublFaturasiniAyristir(fatura('bin lira'))).toThrow(/PayableAmount/)
  })
})

describe('fatura yönü', () => {
  const temel = () => ublFaturasiniAyristir(oku('TemelFaturaOrnegi.xml'))
  /* Bu faturada satıcı VKN 1288331521, alıcı TCKN 1234567890. */

  it('alıcı bizsek gelen fatura (borç)', () => {
    expect(faturaYonu(temel(), '1234567890')).toBe('payable')
  })

  it('satıcı bizsek giden fatura (alacak)', () => {
    expect(faturaYonu(temel(), '1288331521')).toBe('receivable')
  })

  /*
   * 🔴 EN ÖNEMLİ TEST. Yanlış yön, kullanıcının ALACAĞINI borç olarak
   * yazmak demek -- işletme takibinde kasada olmayan bir borç görünür.
   * Eşleşme yoksa tahmin edilmiyor.
   */
  it('taraflardan hiçbiri biz değilsek yön TAHMİN EDİLMEZ', () => {
    expect(faturaYonu(temel(), '9999999999')).toBe('neutral')
  })

  it('işletmenin vergi numarası girilmemişse yön tahmin edilmez', () => {
    expect(faturaYonu(temel(), null)).toBe('neutral')
    expect(faturaYonu(temel(), '')).toBe('neutral')
    expect(faturaYonu(temel(), '   ')).toBe('neutral')
  })

  /*
   * GİB paketinde satıcı ve alıcı aynı olan faturalar var
   * (`YTB_*`, `SARJ`). Orada yön anlamsız; "payable" demek uydurma
   * bir borç yaratırdı.
   */
  it('kendine kesilen faturada yön belirsiz kalır', () => {
    const f = ublFaturasiniAyristir(oku('TicariFaturaOrnegi.xml'))
    const kendi = f.satici.kimlik!
    const sahte = { ...f, alici: { ...f.alici, kimlik: kendi } }
    expect(faturaYonu(sahte, kendi)).toBe('neutral')
  })

  /*
   * Numaralar METİN olarak karşılaştırılıyor. Sayıya çevrilseydi
   * "0001234567" ile "1234567" eşit sayılır, başkasının faturası
   * bizim sanılırdı.
   */
  it('baştaki sıfır farkı eşleşme sayılmaz', () => {
    const f = temel()
    const sahte = { ...f, alici: { ...f.alici, kimlik: '0001234567' } }
    expect(faturaYonu(sahte, '1234567')).toBe('neutral')
  })
})
