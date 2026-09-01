import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/*
 * YAYINDAKİ METİNLER OTOMATİK YENİLEME İDDİA ETMEZ.
 *
 * 🔴 NEDEN KAYNAK TARANIYOR (ürün sahibi kararı, 01.09.2026).
 *
 * PayTR'nin cevabı: kayıtlı karttan tahsilat yalnız Direkt API +
 * Non3D ile mümkün. O yol kart numarasını ve CVV'yi bizim
 * sunucumuzdan geçirir; PCI-DSS kapsamı SAQ A'dan SAQ D'ye çıkar,
 * Non3D ile ters ibraz sorumluluğu satıcıya geçer ve yayındaki dört
 * metin yanlış beyan olur. Ürün sahibi OTOMATİK YENİLEMEDEN
 * VAZGEÇTİ; kart hiç saklanmıyor, kullanıcı her dönem kendi ödüyor.
 *
 * 🔴 ASIL RİSK METİNLERİN YARISININ DEĞİŞMESİ.
 *
 * Depo bu hatayı bir kez TERS YÖNDE yaşadı: `abonelik.js` "otomatik
 * denmiyor, karar verilmedi" derken metnin geri kalanı ("sonraki
 * tahsilat", "tahsilat gerçekleşmezse") otomatiği zaten ima
 * ediyordu. Dört ayrı dosyada, dört ayrı cümlede duran bir vaadi
 * elle takip etmek aynı tutarsızlığı yeniden üretir — ve bu sefer
 * kullanıcıya "kartından otomatik çekilecek" demiş oluruz, oysa
 * çekmiyoruz.
 *
 * Bu yüzden vaat, gözle değil TARAMAYLA korunuyor.
 *
 * ⚠️ Test metnin TAMAMINI okumuyor, YASAKLI KALIPLARI arıyor. Kalıp
 * listesi dar tutuldu: "yenile" kelimesinin kendisi yasak değil
 * (elle yenilemeyi anlatan cümleler de onu kullanıyor), yasak olan
 * KENDİLİĞİNDEN/OTOMATİK yenileme ve KAYITLI KART iddiası.
 */

const METIN_DIZINI = join(process.cwd(), 'frontend', 'src', 'content', 'legal')

/*
 * Ticari belgeler. Yalnız bunlar taranıyor: `privacy` ve `cookies`
 * ödeme vaadi taşımıyor, `terms` ise abonelik ayrıntısını Abonelik
 * Koşulları'na havale ediyor.
 */
const TICARI_BELGELER = ['abonelik', 'mesafeli-satis', 'on-bilgilendirme', 'teslimat-iade']

/**
 * Otomatik yenileme iddiasının kalıpları.
 *
 * Her biri gerçek metinlerden alındı; uydurulmadı.
 */
const YASAK_KALIPLAR: ReadonlyArray<{ ad: string; desen: RegExp }> = [
  { ad: 'kendiliğinden yenilenir', desen: /KEND[İI]L[İI][ĞG][İI]NDEN\s+YEN[İI]LEN|kendili[ğg]inden\s+yenilen/i },
  { ad: 'otomatik yenileme', desen: /otomatik\s+(olarak\s+)?yenile/i },
  { ad: 'kayıtlı karttan tahsilat', desen: /kay[ıi]tl[ıi]\s+kart[ıi]?n?[ıi]?zdan|kay[ıi]tl[ıi]\s+kartt?an/i },
  { ad: 'kartın saklanması', desen: /kart[ıi]n[ıi]z[ıi]?n?\s+.{0,30}saklan|kart,?\s+[öo]deme\s+kurulu[şs]u\s+nezdinde\s+saklan/i },
  { ad: 'otomatik tahsilat', desen: /otomatik\s+(olarak\s+)?tahsil/i },
]

/*
 * Olumsuzluk işaretleri.
 *
 * 🔴 BUNSUZ TEST METNİ BOZMAYA İTERDİ. Elle yenilemeyi anlatan doğru
 * bir metin, olguyu OLUMSUZ kurarak söylemek zorunda: "Kartınız
 * saklanmaz", "otomatik yenileme yoktur". Kalıplar bunları da
 * yakalasaydı, test yazarı doğru cümleyi silip yerine daha muğlak
 * bir şey yazmaya zorlanırdı — yani test, korumaya çalıştığı şeyin
 * tam tersini üretirdi.
 *
 * Bu yüzden aranan şey kalıbın VARLIĞI değil, kalıbın olumsuzlanmadan
 * kurulmuş hâli.
 */
const OLUMSUZLUK = /(yoktur|yok|bulunmaz|bulunmamakta|yap[ıi]lmaz|yap[ıi]lm[ıi]yor|edilmez|edilmiyor|saklanmaz|saklanm[ıi]yor|tutulmaz|tutulmuyor|de[ğg]ildir|istenmez|istenmiyor)/i

/**
 * Kalıp, olumsuzlanmadan geçiyor mu — yani gerçekten VAAT ediliyor mu.
 *
 * 🔴 OLUMSUZLUK AYNI CÜMLEDE ARANIYOR, yakın bir pencerede değil.
 *
 * İlk sürüm eşleşmenin 60 karakter çevresine bakıyordu ve TAM DA
 * DÜZELTMEYE ÇALIŞTIĞIMIZ CÜMLEYİ kaçırıyordu:
 *
 *   "Üyelik dönem sonunda kendiliğinden yenilenir ve kayıtlı
 *    kartınızdan tahsil edilir; iptal ettiğiniz anda durur."
 *
 * Buradaki "durur"/"yapılmaz" bitişik cümleye ait ama pencereye
 * giriyor ve gerçek bir vaadi aklıyordu. Cümleye bağlamak bu yanlış
 * negatifi kapatıyor: olumsuzluk, iddianın KENDİ cümlesinde olmalı.
 */
function iddiaEdiliyorMu(metin: string, desen: RegExp): boolean {
  /* Kaynak dosyada cümleler `' +` ile satırlara bölünmüş; nokta yine
     de cümle sınırı olarak duruyor. */
  const cumleler = metin.split(/\.(?=[\s'"`+,)\]]|$)/)

  return cumleler.some(cumle => desen.test(cumle) && !OLUMSUZLUK.test(cumle))
}

function belgeMetni(tip: string): string {
  const dosyalar = readdirSync(METIN_DIZINI).filter(d => d === `${tip}.js` || d === `${tip}.en.js`)
  expect(dosyalar.length, `${tip} için metin dosyası bulunamadı`).toBeGreaterThan(0)
  return dosyalar.map(d => readFileSync(join(METIN_DIZINI, d), 'utf8')).join('\n')
}

/**
 * Dosya başındaki blok yorumu atar.
 *
 * ⚠️ Şart: yorumlar KARARIN GEÇMİŞİNİ anlatıyor ("otomatik yenileme
 * kararı verilmişti, PayTR cevabıyla geri alındı") ve bu tarih
 * bilgisinin silinmesi istenmiyor. Taranan şey KULLANICIYA GÖSTERİLEN
 * metin; yorumu da taramak, doğru yazılmış bir gerekçe yüzünden testi
 * düşürürdü.
 */
function yorumsuz(kaynak: string): string {
  return kaynak.replace(/\/\*[\s\S]*?\*\//g, ' ')
}

describe('yasal metinler — otomatik yenileme iddiası yok', () => {
  it.each(TICARI_BELGELER)('%s otomatik yenileme VAAT ETMİYOR', tip => {
    const metin = yorumsuz(belgeMetni(tip))

    const bulunanlar = YASAK_KALIPLAR
      .filter(k => iddiaEdiliyorMu(metin, k.desen))
      .map(k => k.ad)

    expect(
      bulunanlar,
      `${tip} metninde otomatik yenileme iddiası kaldı: ${bulunanlar.join(', ')}. ` +
      'Kart saklanmıyor ve tekrarlayan tahsilat yapılmıyor; bu cümleler yanlış beyan.',
    ).toEqual([])
  })

  /*
   * 🦷 Testin kendisinin işe yaradığının kanıtı.
   *
   * Kalıplar hiçbir şeyle eşleşmeyecek kadar dar yazılsaydı yukarıdaki
   * dört test de "geçer" ve hiçbir şey korumazdı. Burada kalıpların
   * GERÇEKTEN yakaladığı gösteriliyor.
   */
  it('🦷 kalıplar otomatik yenileme cümlesini gerçekten yakalıyor', () => {
    const ornek =
      'ÜYELİĞİNİZ, İPTAL ETMEDİĞİNİZ SÜRECE DÖNEM SONUNDA KENDİLİĞİNDEN YENİLENİR ' +
      've kayıtlı kartınızdan otomatik olarak tahsil edilir.'

    const yakalananlar = YASAK_KALIPLAR.filter(k => iddiaEdiliyorMu(ornek, k.desen)).map(k => k.ad)

    expect(yakalananlar).toContain('kendiliğinden yenilenir')
    expect(yakalananlar).toContain('kayıtlı karttan tahsilat')
    expect(yakalananlar).toContain('otomatik tahsilat')
  })

  /*
   * 🦷 YANLIŞ NEGATİFİN KENDİSİ SINANIYOR.
   *
   * İlk sürüm olumsuzluğu 60 karakterlik bir pencerede arıyordu ve
   * aşağıdaki cümleyi TEMİZ sayıyordu: "durur" bitişik cümleye ait
   * olmasına rağmen pencereye giriyordu. Yani test, düzeltmek için
   * yazıldığı cümleyi kaçırıyordu.
   */
  it('🦷 bitişik cümledeki olumsuzluk gerçek iddiayı AKLAMIYOR', () => {
    const sinsi =
      'Üyelik normalde dönem sonunda kendiliğinden yenilenir ve kayıtlı kartınızdan ' +
      'tahsil edilir; iptal ettiğiniz anda bu otomatik yenileme durur. ' +
      'Yenilemeyi durdurmak için başka bir işlem yapmanız gerekmez.'

    const yakalananlar = YASAK_KALIPLAR.filter(k => iddiaEdiliyorMu(sinsi, k.desen)).map(k => k.ad)
    expect(yakalananlar.length, 'bu cümle bir vaat taşıyor, yakalanmalı').toBeGreaterThan(0)
  })

  /*
   * Elle yenilemeyi anlatan cümleler YASAKLANMAMALI. Kalıplar "yenile"
   * kelimesine çakılsaydı, doğru yazılmış yeni metin de testi
   * düşürürdü ve test yazarını metni bozmaya iterdi.
   */
  it('elle yenilemeyi anlatan cümleyi yanlışlıkla yakalamıyor', () => {
    const dogruMetin =
      'Dönem sonunda tahsilat YAPILMAZ. Üyeliğinizi sürdürmek isterseniz ' +
      'Ayarlar → Üyelik bölümünden yeni dönemin bedelini kendiniz ödersiniz. ' +
      'Ödeme yapılmazsa hesabınız salt okunur moda geçer; verileriniz durur.'

    expect(YASAK_KALIPLAR.filter(k => iddiaEdiliyorMu(dogruMetin, k.desen)).map(k => k.ad)).toEqual([])
  })

  it('OLUMSUZ kurulmuş doğru cümleleri yakalamıyor', () => {
    /* Yeni metinlerin olguyu açıkça olumsuzlaması GEREKİYOR —
       kullanıcı "kartım saklanıyor mu" sorusunun cevabını okumalı. */
    const olumsuz =
      'Otomatik yenileme yoktur. Kartınız saklanmaz ve kartınızdan otomatik ' +
      'tahsilat yapılmaz; her ödemeyi kendiniz başlatırsınız.'

    expect(YASAK_KALIPLAR.filter(k => iddiaEdiliyorMu(olumsuz, k.desen)).map(k => k.ad)).toEqual([])
  })
})
