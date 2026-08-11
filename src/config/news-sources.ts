import type { NewsCategory, NewsSourceType } from '@prisma/client'

export interface NewsSourceConfig {
  id: string
  name: string
  baseUrl: string
  feedUrl?: string
  listingUrl?: string
  type: NewsSourceType
  category: NewsCategory
  isActive: boolean
  isOfficial: boolean
  allowedDomains: string[]
  // Listing is rendered entirely in the browser (no server-rendered dated
  // markup and no static JSON endpoint); static adapters cannot fetch it.
  requiresJs?: boolean
  // Only announcement links whose href contains at least one of these
  // fragments are considered candidates; keeps nav/menu noise out.
  listingHrefPattern?: string | string[]
}

// Every URL below is an official institution page verified on 2026-08-10.
// A source without a verified feed intentionally uses OFFICIAL_PAGE.
export const NEWS_SOURCES: readonly NewsSourceConfig[] = [
  {
    id: 'tcmb',
    name: 'Türkiye Cumhuriyet Merkez Bankası',
    baseUrl: 'https://www.tcmb.gov.tr',
    feedUrl: 'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Bottom+Menu/Diger/RSS/Basin+Duyurulari',
    type: 'RSS',
    category: 'FINANS',
    isActive: true,
    isOfficial: true,
    allowedDomains: ['tcmb.gov.tr', 'www.tcmb.gov.tr'],
  },
  {
    id: 'gib',
    name: 'Gelir İdaresi Başkanlığı',
    baseUrl: 'https://www.gib.gov.tr',
    listingUrl: 'https://gib.gov.tr/api/gibportal/duyuru/listPublish',
    type: 'OFFICIAL_PAGE',
    category: 'VERGI',
    isActive: true,
    isOfficial: true,
    allowedDomains: ['gib.gov.tr', 'www.gib.gov.tr', 'cdn.gib.gov.tr'],
  },
  {
    id: 'tuik',
    name: 'Türkiye İstatistik Kurumu',
    baseUrl: 'https://veriportali.tuik.gov.tr',
    listingUrl: 'https://www.tuik.gov.tr/Home/HaberBultenleriPartial',
    listingHrefPattern: 'veriportali.tuik.gov.tr',
    type: 'OFFICIAL_PAGE',
    category: 'GENEL_EKONOMI',
    isActive: true,
    isOfficial: true,
    allowedDomains: ['tuik.gov.tr', 'www.tuik.gov.tr', 'veriportali.tuik.gov.tr'],
  },
  {
    id: 'resmi-gazete',
    name: 'Resmî Gazete',
    baseUrl: 'https://www.resmigazete.gov.tr',
    listingUrl: 'https://www.resmigazete.gov.tr/',
    listingHrefPattern: ['/eskiler/', '/ilanlar/'],
    type: 'OFFICIAL_PAGE',
    category: 'MEVZUAT',
    isActive: true,
    isOfficial: true,
    allowedDomains: ['resmigazete.gov.tr', 'www.resmigazete.gov.tr'],
  },
  {
    id: 'kosgeb',
    name: 'KOSGEB',
    baseUrl: 'https://www.kosgeb.gov.tr',
    listingUrl: 'https://www.kosgeb.gov.tr/site/tr/genel/liste/2/basin-ve-duyurular?Page=1',
    type: 'OFFICIAL_PAGE',
    category: 'DESTEK',
    isActive: true,
    isOfficial: true,
    allowedDomains: ['kosgeb.gov.tr', 'www.kosgeb.gov.tr'],
    requiresJs: true,
  },
  {
    id: 'ticaret-bakanligi',
    name: 'T.C. Ticaret Bakanlığı',
    baseUrl: 'https://ticaret.gov.tr',
    listingUrl: 'https://ticaret.gov.tr/duyurular',
    listingHrefPattern: '/duyuru',
    type: 'OFFICIAL_PAGE',
    category: 'IS_DUNYASI',
    isActive: true,
    isOfficial: true,
    allowedDomains: ['ticaret.gov.tr', 'www.ticaret.gov.tr'],
  },
  {
    id: 'kvkk',
    name: 'Kişisel Verileri Koruma Kurumu',
    baseUrl: 'https://www.kvkk.gov.tr',
    listingUrl: 'https://www.kvkk.gov.tr/Icerik/2015/Duyurular',
    listingHrefPattern: '/Icerik/',
    type: 'OFFICIAL_PAGE',
    category: 'DIJITALLESME',
    isActive: true,
    isOfficial: true,
    allowedDomains: ['kvkk.gov.tr', 'www.kvkk.gov.tr'],
  },
  {
    id: 'spk',
    name: 'Sermaye Piyasası Kurulu',
    baseUrl: 'https://spk.gov.tr',
    listingUrl: 'https://spk.gov.tr/duyurular',
    type: 'OFFICIAL_PAGE',
    category: 'FINANS',
    isActive: true,
    isOfficial: true,
    allowedDomains: ['spk.gov.tr', 'www.spk.gov.tr'],
    requiresJs: true,
  },
  {
    id: 'bddk',
    name: 'Bankacılık Düzenleme ve Denetleme Kurumu',
    baseUrl: 'https://www.bddk.org.tr',
    listingUrl: 'https://www.bddk.org.tr/Duyuru/Liste',
    listingHrefPattern: '/Duyuru/Detay/',
    type: 'OFFICIAL_PAGE',
    category: 'FINANS',
    isActive: true,
    isOfficial: true,
    allowedDomains: ['bddk.org.tr', 'www.bddk.org.tr', 'bddk.gov.tr', 'www.bddk.gov.tr'],
  },
  {
    id: 'sgk',
    name: 'Sosyal Güvenlik Kurumu',
    baseUrl: 'https://www.sgk.gov.tr',
    listingUrl: 'https://www.sgk.gov.tr/duyuru',
    listingHrefPattern: '/duyuru/detay/',
    type: 'OFFICIAL_PAGE',
    category: 'MEVZUAT',
    isActive: true,
    isOfficial: true,
    allowedDomains: ['sgk.gov.tr', 'www.sgk.gov.tr'],
  },
] as const
