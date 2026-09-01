/*
 * Yasal metinlerin SÜRÜM kaydı.
 *
 * Neden sürüm: KVKK açısından önemli olan onayı kanıtlayabilmek — kim, ne
 * zaman, metnin HANGİ HALİNİ onayladı. Metin değişip sürüm artınca eski
 * onay o yeni metni kapsamaz ve kullanıcıdan yeniden onay istenir.
 *
 * Sürüm biçimi `YYYY-MM-DD`: hem sıralanabilir hem de yürürlük tarihini
 * kendi içinde taşır, ayrı bir alan gerekmez.
 *
 * BU DOSYA TEK KAYNAKTIR. Frontend metinleri gösterirken sürümü buradan
 * (API üzerinden) alır; iki yerde ayrı ayrı yazılırsa kaydedilen onay ile
 * gösterilen metin ayrışır.
 */

/*
 * Ticari satış belgeleri (29.08.2026) — PayTR sanal POS başvurusu ve
 * Mesafeli Sözleşmeler Yönetmeliği gereği eklendi.
 *
 * 🔴 DÖRDÜ DE `requiredAtSignup: false`.
 * Bunlar kayıt anında değil SATIN ALMA anında onaylanır. `true`
 * yapmak `auth.ts:181-187`'nin her required belgeye otomatik onay
 * satırı yazmasını tetikler, kayıt formunun etiketini yalan hâline
 * getirir ve mevcut bütün kullanıcılara onay şeridi çıkarır.
 */
export type LegalDocumentType =
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'mesafeli-satis'
  | 'on-bilgilendirme'
  | 'teslimat-iade'
  | 'abonelik'

export interface LegalDocumentMeta {
  type: LegalDocumentType
  /** Kullanıcıya gösterilen ad. */
  title: string
  /** İngilizce arayüzde gösterilen ad; onay türü ve sürümü değişmez. */
  titleEn: string
  /** `YYYY-MM-DD`. Metin değiştiğinde ARTIRILIR. */
  version: string
  /** Kayıt sırasında onaylanması ZORUNLU mu. */
  requiredAtSignup: boolean
}

export const LEGAL_DOCUMENTS: readonly LegalDocumentMeta[] = [
  {
    type: 'terms',
    title: 'Kullanım Koşulları',
    titleEn: 'Terms of Use',
    /* 2026-08-23.2: dört açık kapatıldı -- üyeler arası ÖZEL MESAJLAŞMA,
       ENGELLEME kayıtları, REKLAM sayaçları ve işletmeye özel GELEN
       E-POSTA KUTUSU. Dördü de canlıda çalışan özelliklerdi ama metinde
       hiç geçmiyordu.

       ⚠️ AYNI GÜN İKİNCİ ARTIŞ. Sabah `2026-08-23`e çıkılmış ve
       yayımlanmıştı; açıklar o sırada kapatılmadığı için ikinci bir
       artış kaçınılmaz oldu. Kullanıcı aynı gün iki kez onay görüyor --
       bir daha olmaması için metin ile özellik AYNI turda güncellenmeli. */
    /* 2026-08-24: gelen kutusuna GÜVENİLİR GÖNDEREN listesi eklendi.
       Metin bu artıştan önce "Başka bir adresten gelen postalar
       işlenmez" diyordu; liste eklendiği an o cümle YANLIŞ olacaktı.
       Özellik ve metin bu kez AYNI turda güncellendi -- 23.08'de aynı
       gün iki kez onay istemek zorunda kalmamızın dersi buydu. */
    /* 2026-08-25: pazaryeri magaza baglantisi bolumu eklendi (11.
       madde) ve sonraki bolum numaralari kaydirildi. */
    /* 2026-08-29: ABONELİK VE ÜCRETLENDİRME bölümü eklendi (12. madde),
       sonraki bölüm numaraları kaydırıldı. PayTR sanal POS başvurusu
       için ticari satış belgeleri yazıldı ve üyelik akışı kuruldu;
       terms.js'in kendi başlık yorumundaki "eklendiğinde ayrı bölüm
       yazılıp sürüm artırılacak" talimatı bu turda tetiklendi.
       Türkçe ve İngilizce metinler AYNI turda güncellendi. */
    version: '2026-08-29',
    requiredAtSignup: true
  },
  {
    type: 'privacy',
    title: 'Gizlilik ve KVKK Aydınlatma Metni',
    titleEn: 'Privacy and KVKK Notice',
    /* 2026-08-23.3: AI Mentor işletme takip özetini (sayılar ve toplamlar; müşteri adı, fatura no, başlık hariç) alıyor. */
    /* 2026-08-25: pazaryeri magaza verileri yeni bir kategori olarak
       eklendi (alici adi dahil), Shopify aktarim tablosuna girdi,
       mentora giden ozete urun adlari eklendi. Ozellik ve metin AYNI
       turda guncellendi. */
    /* 2026-08-29: ÖDEME VERİSİ ve ödeme kuruluşu bölümü eklendi
       (7.1). PayTR yurt İÇİ aktarım olduğu için yurt dışı tablosuna
       yazılmadı. Fatura kimlik bilgisi ve vergi mevzuatı kaynaklı
       saklama süresi de bu bölümde. Açık adres notu artık koşullu:
       adres yayımlandığı gün kendiliğinden düşüyor. */
    version: '2026-08-29',
    requiredAtSignup: true
  },
  {
    /* Çerez politikası bilgilendirmedir; reklam çerezi kullanılmadığı için
       kayıtta onay şartı değil. */
    type: 'cookies',
    title: 'Çerez ve Yerel Depolama Politikası',
    titleEn: 'Cookie and Local Storage Policy',
    /* 2026-08-23: sessionStorage ve Cloudflare'ın koşullu teknik
       güvenlik çerezleri eklendi. Bilgilendirme metnidir. */
    version: '2026-08-23',
    requiredAtSignup: false
  },
  {
    /* Sözleşme kurulmadan ÖNCE sunulan bilgilendirme. Ayrı bir belge
       olmasının sebebi mevzuatın onu sözleşmeden ayrı aramasıdır. */
    type: 'on-bilgilendirme',
    title: 'Ön Bilgilendirme Formu',
    titleEn: 'Pre-Contract Information Form',
    /* 2026-08-30: OTOMATİK YENİLEME açıkça yazıldı (ürün sahibi
       kararı) ve kurucu indirimi "en az %40" olarak düzeltildi —
       499 x 0,6 = 299,4 aşağı yuvarlandığı için gerçek indirim
       %40'ın biraz üstünde; "tam %40" demek yanlış beyandı. */
    version: '2026-09-01',
    requiredAtSignup: false
  },
  {
    type: 'mesafeli-satis',
    title: 'Mesafeli Hizmet Sözleşmesi',
    titleEn: 'Distance Service Agreement',
    /* 2026-08-30: OTOMATİK YENİLEME açıkça yazıldı (ürün sahibi
       kararı) ve kurucu indirimi "en az %40" olarak düzeltildi —
       499 x 0,6 = 299,4 aşağı yuvarlandığı için gerçek indirim
       %40'ın biraz üstünde; "tam %40" demek yanlış beyandı. */
    version: '2026-09-01',
    requiredAtSignup: false
  },
  {
    type: 'teslimat-iade',
    title: 'Teslimat, İptal ve İade Koşulları',
    titleEn: 'Delivery, Cancellation and Refund Terms',
    /* 2026-08-30: OTOMATİK YENİLEME açıkça yazıldı (ürün sahibi
       kararı) ve kurucu indirimi "en az %40" olarak düzeltildi —
       499 x 0,6 = 299,4 aşağı yuvarlandığı için gerçek indirim
       %40'ın biraz üstünde; "tam %40" demek yanlış beyandı. */
    version: '2026-09-01',
    requiredAtSignup: false
  },
  {
    type: 'abonelik',
    title: 'Abonelik ve Faturalandırma Koşulları',
    titleEn: 'Subscription and Billing Terms',
    /* 2026-08-30: OTOMATİK YENİLEME açıkça yazıldı (ürün sahibi
       kararı) ve kurucu indirimi "en az %40" olarak düzeltildi —
       499 x 0,6 = 299,4 aşağı yuvarlandığı için gerçek indirim
       %40'ın biraz üstünde; "tam %40" demek yanlış beyandı. */
    version: '2026-09-01',
    requiredAtSignup: false
  }
]

/** Kayıtta onayı zorunlu olan metinler. */
export function requiredDocuments(): LegalDocumentMeta[] {
  return LEGAL_DOCUMENTS.filter(d => d.requiredAtSignup)
}

export function findDocument(type: string): LegalDocumentMeta | undefined {
  return LEGAL_DOCUMENTS.find(d => d.type === type)
}

/**
 * Kullanıcının onayladığı sürümler, güncel sürümleri karşılıyor mu.
 *
 * Eksik olanları döndürür — boş dizi "her şey güncel" demektir.
 * Metin sürümü artınca eski onaylar otomatik olarak yetersiz kalır.
 */
export function missingConsents(
  kabuller: ReadonlyArray<{ documentType: string; version: string }>
): LegalDocumentMeta[] {
  return requiredDocuments().filter(
    doc => !kabuller.some(k => k.documentType === doc.type && k.version === doc.version)
  )
}
