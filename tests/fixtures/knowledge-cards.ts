import type { KnowledgeObjectResult } from '../../src/services/retrieval/types'

export interface CardDef {
  id: number
  code?: string | null
  title: string
  content: string
  verificationStatus?: string
  categoryName?: string | null
  sources?: Array<{ id: string; title: string; url?: string | null; authorityLevel: string }>
}

export function makeCandidate(def: CardDef): any {
  return {
    id: def.id,
    code: def.code ?? null,
    title: def.title,
    content: def.content,
    verificationStatus: def.verificationStatus ?? 'unverified',
    category: def.categoryName ? { name: def.categoryName } : null,
    sources: (def.sources ?? []).map(s => ({
      source: {
        id: s.id,
        title: s.title,
        url: s.url ?? null,
        authorityLevel: s.authorityLevel,
      },
    })),
  }
}

export interface EvalCase {
  name: string
  query: string
  relevantKOId: number
  maxResults?: number
}

export function expectHitAt3(
  results: KnowledgeObjectResult[],
  relevantKOId: number,
): { hit: boolean; rank: number | null } {
  const idx = results.findIndex(r => r.id === relevantKOId)
  return { hit: idx >= 0, rank: idx >= 0 ? idx + 1 : null }
}

export const CORPORA: CardDef[] = [
  {
    id: 1, code: 'KO-SIRKET', title: 'Şirket Kurulum Rehberi',
    content: 'Şirket kurulumu için gerekli adımlar: ticaret siciline kayıt, vergi dairesine başvuru, ' +
      'banka hesabı açılması ve sermaye yatırılması. Şirket türleri: anonim, limited, şahıs.',
    verificationStatus: 'verified',
    categoryName: 'Girişimcilik',
    sources: [{ id: 's1', title: 'Ticaret Bakanlığı', url: 'https://trade.gov.tr', authorityLevel: 'high' }],
  },
  {
    id: 2, title: 'KDV Beyannamesi Hazırlama',
    content: 'KDV beyannamesi her ay düzenlenir. Dönem içi alış ve satış faturaları girilir. ' +
      'İndirilecek KDV ve hesaplanan KDV hesaplanır. Beyanname son günü takip eden ayın 28. günüdür.',
    verificationStatus: 'verified',
    categoryName: 'Muhasebe',
    sources: [{ id: 's2', title: 'Gelir İdaresi Başkanlığı', url: 'https://gib.gov.tr', authorityLevel: 'high' }],
  },
  {
    id: 3, title: 'Girişimcilik Destekleri',
    content: 'KOSGEB tarafından sağlanan girişimcilik destekleri: hibe desteği, faizsiz kredi, ' +
      'danışmanlık hizmetleri. Başvuru için girişimcilik eğitimi tamamlanmalıdır.',
    verificationStatus: 'verified',
    categoryName: 'Girişimcilik',
    sources: [{ id: 's3', title: 'KOSGEB', url: null, authorityLevel: 'high' }],
  },
  {
    id: 4, title: 'Sigorta Prim Hesaplama',
    content: 'SGK prim oranları: işveren payı %20.5, işçi payı %14. Prim hesaplaması brüt ücret üzerinden yapılır. ' +
      'Asgari ücret üzerinden prime esas kazanç hesaplanır.',
    verificationStatus: 'verified',
    categoryName: 'İstihdam',
    sources: [{ id: 's4', title: 'SGK', url: 'https://sgk.gov.tr', authorityLevel: 'high' }],
  },
  {
    id: 5, title: 'İhracat Süreçleri',
    content: 'İhracat işlemleri: gümrük beyannamesi, e-fatura, dolaşım belgesi. ' +
      'İhracatçı birliklerine kayıt zorunludur. KDV istisnası uygulanır.',
    verificationStatus: 'unverified',
    categoryName: 'Dış Ticaret',
  },
  {
    id: 6, title: 'Vergi Muafiyetleri',
    content: 'Genç girişimcilere vergi muafiyeti: 3 yıl boyunca gelir vergisi muafiyeti. ' +
      'Başvuru şartları: 29 yaş altı, limited şirket veya anonim şirket kuruluşu.',
    verificationStatus: 'verified',
    categoryName: 'Vergi',
    sources: [{ id: 's5', title: 'Gelir İdaresi Başkanlığı', url: 'https://gib.gov.tr', authorityLevel: 'high' }],
  },
  {
    id: 7, title: 'İşçi Çalışma İzinleri',
    content: 'Yabancı uyruklu işçi çalışma izni başvurusu. Süre: 30 gün. Gerekli belgeler: pasaport, ' +
      'iş sözleşmesi, SGK bildirgesi. Çalışma izni uzatma süreçleri.',
    verificationStatus: 'unverified',
    categoryName: 'İstihdam',
  },
  {
    id: 8, title: 'Anonim Şirket Genel Kurul',
    content: 'Anonim şirket genel kurul toplantı usulleri, çağrı süresi, pay sahipleri hakları, ' +
      'gündem belirleme, vekaletname düzenlemeleri.',
    verificationStatus: 'unverified',
    categoryName: 'Şirketler Hukuku',
    sources: [{ id: 's6', title: 'Ticaret Bakanlığı', url: 'https://trade.gov.tr', authorityLevel: 'high' }],
  },
  {
    id: 9, title: 'E-Fatura Uygulaması',
    content: 'E-fatura zorunluluğu, e-fatura entegrasyonu, e-fatura portali kullanımı, ' +
      'e-fatura kesme süreleri ve cezai işlemler.',
    verificationStatus: 'verified',
    categoryName: 'Dijital Dönüşüm',
    sources: [{ id: 's7', title: 'Gelir İdaresi Başkanlığı', url: 'https://gib.gov.tr', authorityLevel: 'high' }],
  },
  {
    id: 10, title: 'Limited Şirket Avantajları',
    content: 'Limited şirketin avantajları: düşük sermaye gereksinimi, tek ortakla kurulabilme, ' +
      'sınırlı sorumluluk, yönetim kolaylığı. Limited şirket kurulum adımları.',
    verificationStatus: 'verified',
    categoryName: 'Girişimcilik',
    sources: [{ id: 's8', title: 'Ticaret Bakanlığı', url: 'https://trade.gov.tr', authorityLevel: 'high' }],
  },
  {
    id: 11, title: 'SGK İşveren Teşvikleri',
    content: 'İşverenlere SGK prim teşvikleri: 5 puan indirimi, genç girişimci teşviki, ' +
      'kadın istihdamı teşviki, mesleki eğitim teşviki.',
    verificationStatus: 'verified',
    categoryName: 'Teşvikler',
    sources: [{ id: 's9', title: 'SGK', url: 'https://sgk.gov.tr', authorityLevel: 'high' }],
  },
  {
    id: 12, title: 'Marka Tescil Süreci',
    content: 'Türk Patent ve Marka Kurumu marka tescil başvurusu: araştırma, başvuru formu, ' +
      'görsel yükleme, itiraz süreci, tescil belgesi.',
    verificationStatus: 'unverified',
    categoryName: 'Fikri Mülkiyet',
  },
]

export const HIT3_EVAL_CASES: EvalCase[] = [
  { name: 'exact code match', query: 'KO-SIRKET', relevantKOId: 1 },
  { name: 'şirket kurulum phrase', query: 'şirket kurulum', relevantKOId: 1 },
  { name: 'KDV query', query: 'KDV beyanname', relevantKOId: 2 },
  { name: 'destek girişimcilik', query: 'girişimcilik destekleri', relevantKOId: 3 },
  { name: 'sigorta primi', query: 'sigorta prim hesaplama', relevantKOId: 4 },
  { name: 'ihracat query', query: 'ihracat süreç', relevantKOId: 5 },
  { name: 'vergi muafiyet genç girişimci', query: 'genç girişimci vergi muafiyeti', relevantKOId: 6 },
  { name: 'matching category: girişimcilik', query: 'girişimcilik şirket avantaj', relevantKOId: 10 },
  { name: 'çalışma izni yabancı', query: 'yabancı uyruklu çalışma izni', relevantKOId: 7 },
  { name: 'anonim şirket genel kurul', query: 'anonim şirket genel kurul', relevantKOId: 8 },
  { name: 'e-fatura zorunluluk', query: 'elektronik fatura zorunluluğu', relevantKOId: 9 },
  { name: 'marka tescil patent', query: 'marka tescil başvurusu', relevantKOId: 12 },
  { name: 'SGK işveren teşvikleri', query: 'işveren teşvik prim', relevantKOId: 11 },
  { name: 'limited şirket kurulum', query: 'limited şirket avantaj', relevantKOId: 10 },
]
