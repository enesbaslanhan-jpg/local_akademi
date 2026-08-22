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

export type LegalDocumentType = 'terms' | 'privacy' | 'cookies'

export interface LegalDocumentMeta {
  type: LegalDocumentType
  /** Kullanıcıya gösterilen ad. */
  title: string
  /** `YYYY-MM-DD`. Metin değiştiğinde ARTIRILIR. */
  version: string
  /** Kayıt sırasında onaylanması ZORUNLU mu. */
  requiredAtSignup: boolean
}

export const LEGAL_DOCUMENTS: readonly LegalDocumentMeta[] = [
  {
    type: 'terms',
    title: 'Kullanım Koşulları',
    /* 2026-08-23: topluluk etkileşimleri, hizmet kapsamı ve deterministik
       hesap/AI ayrımı teknik davranışla eşleştirildi. Eski onay bu metni
       KAPSAMIYOR, yeniden onay istenecek. */
    version: '2026-08-23',
    requiredAtSignup: true
  },
  {
    type: 'privacy',
    title: 'Gizlilik ve KVKK Aydınlatma Metni',
    /* 2026-08-23: veri kategorileri, Mentor bağlamı ve aktarım alıcıları
       gerçek veri akışlarıyla eşleştirildi; yeniden onay istenecek. */
    version: '2026-08-23',
    requiredAtSignup: true
  },
  {
    /* Çerez politikası bilgilendirmedir; reklam çerezi kullanılmadığı için
       kayıtta onay şartı değil. */
    type: 'cookies',
    title: 'Çerez ve Yerel Depolama Politikası',
    /* 2026-08-23: sessionStorage ve Cloudflare'ın koşullu teknik
       güvenlik çerezleri eklendi. Bilgilendirme metnidir. */
    version: '2026-08-23',
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
