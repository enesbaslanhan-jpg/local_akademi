import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import { contentLanguage } from '../lib/content-language.js'
import { FORMULA_EN_BY_ID, localizeFormula, localizeFormulaResult } from '../content/i18n/formula-en.js'

interface FormulaDef {
  id: string
  name: string
  inputs: { name: string; label: string; unit: string; min?: number; max?: number }[]
  calculate: (inputs: Record<string, number>) => Record<string, any>
  warning?: string
  category?: 'daily' | 'cash' | 'sales' | 'stock' | 'growth'
  description?: string
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

export function calculateVatAddition(inputs: Record<string, number>) {
  const net = inputs.kdv_haric_tutar
  const rate = inputs.kdv_orani / 100
  return {
    kdv_haric_tutar: round2(net),
    kdv_tutari: round2(net * rate),
    kdv_dahil_tutar: round2(net * (1 + rate)),
  }
}

export function calculateCashClosing(inputs: Record<string, number>) {
  const inflow = inputs.acilis_kasasi + inputs.nakit_satis + inputs.tahsilat + inputs.diger_giris
  const outflow = inputs.gider_odeme + inputs.tedarikci_odeme + inputs.bankaya_yatirilan
  return {
    toplam_giris: round2(inflow),
    toplam_cikis: round2(outflow),
    beklenen_kasa: round2(inflow - outflow),
    durum: inflow - outflow >= 0 ? 'Kasa pozitif' : 'Kasa açığı var',
  }
}

export function calculateRunway(inputs: Record<string, number>) {
  const burn = Math.max(0, inputs.aylik_nakit_cikisi - inputs.aylik_nakit_girisi)
  const months = burn > 0 ? inputs.mevcut_nakit / burn : 99
  return {
    aylik_nakit_acigi: round2(burn),
    dayanma_suresi_ay: round2(months),
    durum: burn === 0 ? 'Nakit tüketimi yok' : months >= 6 ? '6 ay ve üzeri' : months >= 3 ? 'Yakından izleyin' : 'Kritik nakit riski',
  }
}

export function calculateUnitCost(inputs: Record<string, number>) {
  if (inputs.uretim_adedi <= 0) throw new Error('Üretim adedi sıfırdan büyük olmalıdır')
  const total = inputs.hammadde + inputs.iscilik + inputs.genel_gider + inputs.ambalaj_kargo + inputs.fire_iade
  return {
    toplam_uretim_maliyeti: round2(total),
    birim_maliyet: round2(total / inputs.uretim_adedi),
  }
}

export function calculateTermDifference(inputs: Record<string, number>) {
  const total = inputs.pesin_fiyat * Math.pow(1 + inputs.aylik_vade_orani / 100, inputs.vade_ay)
  return {
    vadeli_toplam: round2(total),
    vade_farki: round2(total - inputs.pesin_fiyat),
    aylik_esit_odeme: round2(inputs.vade_ay > 0 ? total / inputs.vade_ay : total),
  }
}

export function calculateMarketplaceProfit(inputs: Record<string, number>) {
  const commission = inputs.satis_fiyati * inputs.komisyon_orani / 100
  const revenue = inputs.satis_fiyati
  const totalCost = inputs.urun_maliyeti + commission + inputs.kargo + inputs.ambalaj + inputs.reklam_payi + inputs.iade_riski
  const contribution = revenue - totalCost
  return {
    komisyon_tutari: round2(commission),
    siparis_toplam_maliyeti: round2(totalCost),
    siparis_katkisi: round2(contribution),
    siparis_marji: round2(revenue > 0 ? contribution / revenue * 100 : 0),
    durum: contribution > 0 ? 'Sipariş kârlı' : contribution < 0 ? 'Sipariş zarar ediyor' : 'Başa baş',
  }
}

export function calculatePriceArchitecture(inputs: Record<string, number>) {
  const directCost = inputs.dogrudan_maliyet
  const fulfilmentCost = inputs.operasyon_maliyeti
  const fixedCostShare = inputs.sabit_gider_payi
  const returnRisk = inputs.iade_risk_payi
  const commissionRate = inputs.komisyon_orani / 100
  const paymentRate = inputs.odeme_orani / 100
  const targetMarginRate = inputs.hedef_marj / 100
  const totalRate = commissionRate + paymentRate + targetMarginRate

  if (totalRate >= 1) {
    throw new Error('Komisyon, ödeme kesintisi ve hedef marj toplamı %100’den küçük olmalıdır')
  }

  const unitCost = directCost + fulfilmentCost + fixedCostShare + returnRisk
  const netSalesPrice = unitCost / (1 - totalRate)
  const commissionAmount = netSalesPrice * commissionRate
  const paymentAmount = netSalesPrice * paymentRate
  const contribution = netSalesPrice - unitCost - commissionAmount - paymentAmount

  return {
    gercek_birim_maliyet: round2(unitCost),
    onerilen_kdv_haric_fiyat: round2(netSalesPrice),
    komisyon_tutari: round2(commissionAmount),
    odeme_kesintisi: round2(paymentAmount),
    birim_katki: round2(contribution),
    gerceklesen_marj: round2(netSalesPrice > 0 ? (contribution / netSalesPrice) * 100 : 0),
  }
}

const formulas: FormulaDef[] = [
  {
    id: 'fiyat_mimarisi',
    name: 'Fiyat Mimarisi ve Hedef Marj',
    inputs: [
      { name: 'dogrudan_maliyet', label: 'Doğrudan ürün/hizmet maliyeti', unit: 'TRY', min: 0 },
      { name: 'operasyon_maliyeti', label: 'Ambalaj, kargo ve operasyon', unit: 'TRY', min: 0 },
      { name: 'sabit_gider_payi', label: 'Birim sabit gider payı', unit: 'TRY', min: 0 },
      { name: 'iade_risk_payi', label: 'Birim iade/hasar risk payı', unit: 'TRY', min: 0 },
      { name: 'komisyon_orani', label: 'Satış kanalı komisyonu', unit: '%', min: 0, max: 99 },
      { name: 'odeme_orani', label: 'Ödeme kuruluşu kesintisi', unit: '%', min: 0, max: 99 },
      { name: 'hedef_marj', label: 'Hedef satış marjı', unit: '%', min: 0, max: 99 },
    ],
    calculate: calculatePriceArchitecture,
    warning: 'Sonuç KDV hariç bir yönetim fiyatıdır. Oranları tahminle değil güncel sözleşme ve gerçekleşen işletme verinizle girin; vergi ve hukuki kararlar için meslek uzmanınıza danışın.',
  },
  {
    id: 'kar_hesabi',
    name: 'Kâr ve Kâr Marjı',
    inputs: [
      { name: 'satis', label: 'Aylık Satış', unit: 'TRY', min: 0 },
      { name: 'gider', label: 'Aylık Gider', unit: 'TRY', min: 0 },
    ],
    calculate: (i) => {
      const kar = i.satis - i.gider
      const marj = i.satis > 0 ? (kar / i.satis) * 100 : 0
      return {
        kar: Math.round(kar * 100) / 100,
        kar_marji: Math.round(marj * 100) / 100,
        durum: kar > 0 ? 'Kârlı' : kar < 0 ? 'Zararda' : 'Başa baş',
      }
    },
    warning: 'Bu hesaplama vergi ve diğer giderleri dikkate almaz.',
  },
  {
    id: 'basabas_noktasi',
    name: 'Başabaş Noktası',
    inputs: [
      { name: 'sabit_gider', label: 'Sabit Gider', unit: 'TRY', min: 0 },
      { name: 'birim_fiyat', label: 'Birim Satış Fiyatı', unit: 'TRY', min: 0 },
      { name: 'birim_degisken', label: 'Birim Değişken Gider', unit: 'TRY', min: 0 },
    ],
    calculate: (i) => {
      if (i.birim_fiyat <= i.birim_degisken) throw new Error('Birim fiyat, birim değişken giderden büyük olmalıdır')
      const katki = i.birim_fiyat - i.birim_degisken
      const basabas = Math.ceil(i.sabit_gider / katki)
      const basabasGelir = basabas * i.birim_fiyat
      return {
        katki_payi: Math.round(katki * 100) / 100,
        basabas_adet: basabas,
        basabas_gelir: Math.round(basabasGelir * 100) / 100,
      }
    },
    warning: 'Varsayılan: tüm ürünler aynı fiyat ve maliyet yapısındadır.',
  },
  {
    id: 'nakit_pozisyonu',
    name: 'Nakit Pozisyonu',
    inputs: [
      { name: 'nakit', label: 'Nakit ve Benzerleri', unit: 'TRY', min: 0 },
      { name: 'borc', label: 'Kısa Vadeli Borç', unit: 'TRY', min: 0 },
    ],
    calculate: (i) => {
      const net = i.nakit - i.borc
      const oran = i.borc > 0 ? i.nakit / i.borc : (i.nakit > 0 ? 99 : 0)
      return {
        net_pozisyon: Math.round(net * 100) / 100,
        nakit_oran: Math.round(oran * 100) / 100,
        durum: net > 0 ? 'Pozitif' : net < 0 ? 'Negatif' : 'Sıfır',
      }
    },
  },
  {
    id: 'isletme_sermayesi',
    name: 'İşletme Sermayesi',
    inputs: [
      { name: 'donen_varlik', label: 'Dönen Varlıklar', unit: 'TRY', min: 0 },
      { name: 'kisa_vadeli_borc', label: 'Kısa Vadeli Borçlar', unit: 'TRY', min: 0 },
    ],
    calculate: (i) => {
      const sermaye = i.donen_varlik - i.kisa_vadeli_borc
      return {
        isletme_sermayesi: Math.round(sermaye * 100) / 100,
        durum: sermaye > 0 ? 'Yeterli' : sermaye < 0 ? 'Yetersiz' : 'Sıfır',
      }
    },
    warning: 'Pozitif işletme sermayesi kısa vadeli yükümlülüklerin karşılanabildiğini gösterir.',
  },
  {
    id: 'roi',
    name: 'Yatırım Getirisi (ROI)',
    inputs: [
      { name: 'yatirim', label: 'Toplam Yatırım', unit: 'TRY', min: 0 },
      { name: 'getiri', label: 'Net Getiri', unit: 'TRY', min: 0 },
    ],
    calculate: (i) => {
      const netKar = i.getiri - i.yatirim
      const roi = i.yatirim > 0 ? (netKar / i.yatirim) * 100 : 0
      return {
        net_kar: Math.round(netKar * 100) / 100,
        roi_yuzde: Math.round(roi * 100) / 100,
        durum: roi > 0 ? 'Kârlı yatırım' : roi < 0 ? 'Zararlı yatırım' : 'Başa baş',
      }
    },
    warning: 'Basit ROI hesaplamadır, vergi, enflasyon ve zaman değeri dikkate alınmaz.',
  },
  {
    id: 'stok_devir',
    name: 'Stok Devir Hızı',
    inputs: [
      { name: 'satislar', label: 'Yıllık Satışlar (maliyet)', unit: 'TRY', min: 0 },
      { name: 'ortalama_stok', label: 'Ortalama Stok', unit: 'TRY', min: 0 },
    ],
    calculate: (i) => {
      if (i.ortalama_stok === 0) throw new Error('Ortalama stok sıfır olamaz')
      const hiz = i.satislar / i.ortalama_stok
      const gun = 365 / hiz
      return {
        devir_hizi: Math.round(hiz * 100) / 100,
        stokta_kalma_gunu: Math.round(gun),
      }
    },
    warning: 'Yüksek devir hızı genellikle iyi stok yönetimini gösterir.',
  },
  {
    id: 'cac',
    name: 'Müşteri Edinme Maliyeti (CAC)',
    inputs: [
      { name: 'pazarlama', label: 'Pazarlama Gideri', unit: 'TRY', min: 0 },
      { name: 'satis_ekip', label: 'Satış Ekip Gideri', unit: 'TRY', min: 0 },
      { name: 'yeni_musteri', label: 'Yeni Müşteri Sayısı', unit: 'adet', min: 1 },
    ],
    calculate: (i) => {
      const cac = (i.pazarlama + i.satis_ekip) / i.yeni_musteri
      return {
        cac: Math.round(cac * 100) / 100,
      }
    },
    warning: 'CAC düşük olması pazarlama verimliliğini gösterir.',
  },
  {
    id: 'ltv',
    name: 'Müşteri Yaşam Boyu Değeri (LTV)',
    inputs: [
      { name: 'ortalama_satis', label: 'Ortalama Satış Tutarı', unit: 'TRY', min: 0 },
      { name: 'satis_sikligi', label: 'Yıllık Satın Alma Sıklığı', unit: 'adet', min: 0 },
      { name: 'musteri_omru', label: 'Müşteri İlişki Süresi', unit: 'yıl', min: 0 },
    ],
    calculate: (i) => {
      const ltv = i.ortalama_satis * i.satis_sikligi * i.musteri_omru
      return {
        ltv: Math.round(ltv * 100) / 100,
      }
    },
    warning: 'LTV, müşteri ilişki yönetimi stratejilerini değerlendirmek için kullanılır.',
  },
  {
    id: 'ltv_cac',
    name: 'LTV/CAC Oranı',
    inputs: [
      { name: 'ltv_degeri', label: 'Müşteri Yaşam Boyu Değeri', unit: 'TRY', min: 0 },
      { name: 'cac_degeri', label: 'Müşteri Edinme Maliyeti', unit: 'TRY', min: 0 },
    ],
    calculate: (i) => {
      if (i.cac_degeri === 0) throw new Error('CAC sıfır olamaz')
      const oran = i.ltv_degeri / i.cac_degeri
      return {
        ltv_cac_orani: Math.round(oran * 100) / 100,
        degerlendirme: oran >= 3 ? 'Sağlıklı (3+)' : oran >= 1 ? 'Kabul edilebilir (1-3)' : 'Zayıf (<1)',
      }
    },
    warning: '3:1 oranı sağlıklı kabul edilir, 1:1 altı sürdürülemez.',
  },
  {
    id: 'indirim_kar',
    name: 'İndirim/Kampanya Kârlılığı',
    inputs: [
      { name: 'normal_fiyat', label: 'Normal Satış Fiyatı', unit: 'TRY', min: 0 },
      { name: 'indirim_oran', label: 'İndirim Oranı', unit: '%', min: 0, max: 100 },
      { name: 'birim_maliyet', label: 'Birim Maliyet', unit: 'TRY', min: 0 },
      { name: 'beklenen_satis', label: 'Beklenen Satış Adedi', unit: 'adet', min: 1 },
    ],
    calculate: (i) => {
      const indirimliFiyat = i.normal_fiyat * (1 - i.indirim_oran / 100)
      const normalKar = (i.normal_fiyat - i.birim_maliyet) * i.beklenen_satis
      const kampanyaKar = (indirimliFiyat - i.birim_maliyet) * i.beklenen_satis
      const fark = kampanyaKar - normalKar
      return {
        indirimli_fiyat: Math.round(indirimliFiyat * 100) / 100,
        normal_kar: Math.round(normalKar * 100) / 100,
        kampanya_kar: Math.round(kampanyaKar * 100) / 100,
        kar_farki: Math.round(fark * 100) / 100,
        durum: fark >= 0 ? 'Kampanya kârlı' : 'Kampanya kârlı değil',
      }
    },
    warning: 'Talep artışı varsayılmamıştır; kampanya ile satış adedi artabilir.',
  },
  {
    id: 'kredi_maliyeti',
    name: 'Kredi Taksiti ve Toplam Maliyet',
    inputs: [
      { name: 'kredi_tutari', label: 'Kredi Tutarı', unit: 'TRY', min: 0 },
      { name: 'yillik_faiz', label: 'Yıllık Faiz Oranı', unit: '%', min: 0 },
      { name: 'vade', label: 'Vade', unit: 'ay', min: 1 },
    ],
    calculate: (i) => {
      const aylikFaiz = (i.yillik_faiz / 100) / 12
      const taksit = i.kredi_tutari * (aylikFaiz * Math.pow(1 + aylikFaiz, i.vade)) / (Math.pow(1 + aylikFaiz, i.vade) - 1)
      const toplam = taksit * i.vade
      const toplamFaiz = toplam - i.kredi_tutari
      return {
        aylik_taksit: Math.round(taksit * 100) / 100,
        toplam_odeme: Math.round(toplam * 100) / 100,
        toplam_faiz: Math.round(toplamFaiz * 100) / 100,
      }
    },
    warning: 'Sabit faiz oranı varsayılmıştır; dosya masrafı ve sigorta dahil değildir.',
  },
  {
    id: 'ihracat_maliyet',
    name: 'İhracat Birim Maliyeti',
    inputs: [
      { name: 'uretim_maliyet', label: 'Üretim Maliyeti', unit: 'TRY', min: 0 },
      { name: 'lojistik', label: 'Lojistik Gideri', unit: 'TRY', min: 0 },
      { name: 'gumruk', label: 'Gümrük/Vergi Gideri', unit: 'TRY', min: 0 },
      { name: 'diger', label: 'Diğer Giderler', unit: 'TRY', min: 0 },
      { name: 'urun_adet', label: 'Ürün Adedi', unit: 'adet', min: 1 },
      { name: 'kur', label: 'Döviz Kuru (1 USD)', unit: 'TRY', min: 0 },
    ],
    calculate: (i) => {
      const birimMaliyetTry = (i.uretim_maliyet + i.lojistik + i.gumruk + i.diger) / i.urun_adet
      const birimMaliyetUsd = i.kur > 0 ? birimMaliyetTry / i.kur : 0
      return {
        birim_maliyet_try: Math.round(birimMaliyetTry * 100) / 100,
        birim_maliyet_usd: Math.round(birimMaliyetUsd * 100) / 100,
        toplam_maliyet: Math.round((i.uretim_maliyet + i.lojistik + i.gumruk + i.diger) * 100) / 100,
      }
    },
    warning: 'Kur dalgalanmaları ve ek vergiler maliyeti etkileyebilir.',
  },
  {
    id: 'kdv_ekleme',
    name: 'KDV Ekleme',
    category: 'daily',
    description: 'KDV hariç tutardan vergi ve KDV dahil toplamı hesaplar.',
    inputs: [
      { name: 'kdv_haric_tutar', label: 'KDV Hariç Tutar', unit: 'TRY', min: 0 },
      { name: 'kdv_orani', label: 'Uygulanacak KDV Oranı', unit: '%', min: 0, max: 100 },
    ],
    calculate: calculateVatAddition,
    warning: 'Güncel ve doğru KDV oranını kullanıcı girmelidir; bu sonuç vergi beyannamesi yerine geçmez.',
  },
  {
    id: 'kasa_kapanis',
    name: 'Günlük Kasa Kapanışı',
    category: 'daily',
    description: 'Gün içindeki nakit giriş ve çıkışlardan beklenen kasa bakiyesini bulur.',
    inputs: [
      { name: 'acilis_kasasi', label: 'Açılış Kasası', unit: 'TRY', min: 0 },
      { name: 'nakit_satis', label: 'Nakit Satış', unit: 'TRY', min: 0 },
      { name: 'tahsilat', label: 'Nakit Tahsilat', unit: 'TRY', min: 0 },
      { name: 'diger_giris', label: 'Diğer Nakit Girişi', unit: 'TRY', min: 0 },
      { name: 'gider_odeme', label: 'Gider Ödemeleri', unit: 'TRY', min: 0 },
      { name: 'tedarikci_odeme', label: 'Tedarikçi Ödemeleri', unit: 'TRY', min: 0 },
      { name: 'bankaya_yatirilan', label: 'Bankaya Yatırılan', unit: 'TRY', min: 0 },
    ],
    calculate: calculateCashClosing,
  },
  {
    id: 'nakit_dayanim',
    name: 'Nakit Dayanma Süresi',
    category: 'cash',
    description: 'Mevcut nakdin aylık nakit açığını kaç ay karşılayacağını gösterir.',
    inputs: [
      { name: 'mevcut_nakit', label: 'Mevcut Nakit', unit: 'TRY', min: 0 },
      { name: 'aylik_nakit_girisi', label: 'Aylık Nakit Girişi', unit: 'TRY', min: 0 },
      { name: 'aylik_nakit_cikisi', label: 'Aylık Nakit Çıkışı', unit: 'TRY', min: 0 },
    ],
    calculate: calculateRunway,
    warning: 'Beklenmedik giderler ve tahsilat gecikmeleri ayrıca değerlendirilmelidir.',
  },
  {
    id: 'birim_maliyet',
    name: 'Gerçek Birim Maliyet',
    category: 'stock',
    description: 'Hammadde, işçilik, genel gider, kargo ve fireyi ürün başına dağıtır.',
    inputs: [
      { name: 'hammadde', label: 'Hammadde / Ürün Alımı', unit: 'TRY', min: 0 },
      { name: 'iscilik', label: 'İşçilik', unit: 'TRY', min: 0 },
      { name: 'genel_gider', label: 'Genel Gider Payı', unit: 'TRY', min: 0 },
      { name: 'ambalaj_kargo', label: 'Ambalaj ve Kargo', unit: 'TRY', min: 0 },
      { name: 'fire_iade', label: 'Fire ve İade Maliyeti', unit: 'TRY', min: 0 },
      { name: 'uretim_adedi', label: 'Üretilen / Alınan Adet', unit: 'adet', min: 1 },
    ],
    calculate: calculateUnitCost,
  },
  {
    id: 'vade_farki',
    name: 'Vade Farkı',
    category: 'cash',
    description: 'Peşin fiyatın vadeli toplamını ve finansman farkını hesaplar.',
    inputs: [
      { name: 'pesin_fiyat', label: 'Peşin Fiyat', unit: 'TRY', min: 0 },
      { name: 'aylik_vade_orani', label: 'Aylık Vade Oranı', unit: '%', min: 0, max: 100 },
      { name: 'vade_ay', label: 'Vade', unit: 'ay', min: 1 },
    ],
    calculate: calculateTermDifference,
    warning: 'Sözleşmedeki masraf, vergi ve komisyonlar ayrıca eklenmelidir.',
  },
  {
    id: 'pazaryeri_siparis_kari',
    name: 'Pazar Yeri Sipariş Kârlılığı',
    category: 'sales',
    description: 'Komisyon, kargo, reklam ve iade riskinden sonra sipariş katkısını gösterir.',
    inputs: [
      { name: 'satis_fiyati', label: 'Satış Fiyatı', unit: 'TRY', min: 0 },
      { name: 'urun_maliyeti', label: 'Ürün Maliyeti', unit: 'TRY', min: 0 },
      { name: 'komisyon_orani', label: 'Pazar Yeri Komisyonu', unit: '%', min: 0, max: 100 },
      { name: 'kargo', label: 'Kargo', unit: 'TRY', min: 0 },
      { name: 'ambalaj', label: 'Ambalaj', unit: 'TRY', min: 0 },
      { name: 'reklam_payi', label: 'Sipariş Başına Reklam', unit: 'TRY', min: 0 },
      { name: 'iade_riski', label: 'İade Risk Payı', unit: 'TRY', min: 0 },
    ],
    calculate: calculateMarketplaceProfit,
    warning: 'KDV ve gelir/kurumlar vergisi etkisi işletmenin durumuna göre ayrıca değerlendirilmelidir.',
  },
]

export async function formulaRoutes(fastify: FastifyInstance) {
  // GET /formulas — list all formulas
  fastify.get('/formulas', async request => {
    const language = contentLanguage(request)
    return formulas.map(source => {
      const f = localizeFormula(source, language)
      return ({
      id: f.id,
      name: f.name,
      inputs: f.inputs,
      warning: f.warning,
      category: f.category,
      description: f.description,
      })
    })
  })

  // POST /formulas/:formulaId/calculate — execute calculation
  fastify.post('/formulas/:formulaId/calculate', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number }
    const language = contentLanguage(request)
    const { formulaId } = request.params as { formulaId: string }
    const { inputs } = request.body as { inputs: Record<string, number> }

    const formula = formulas.find(f => f.id === formulaId)
    if (!formula) return reply.status(404).send({ error: 'Formül bulunamadı' })

    // Validate inputs
    for (const inp of formula.inputs) {
      const val = inputs[inp.name]
      if (val === undefined || val === null) {
        return reply.status(422).send({ error: `Eksik girdi: ${inp.label}` })
      }
      if (typeof val !== 'number' || isNaN(val)) {
        return reply.status(422).send({ error: `Geçersiz değer: ${inp.label}` })
      }
      if (inp.min !== undefined && val < inp.min) {
        return reply.status(422).send({ error: `${inp.label} en az ${inp.min} olmalıdır` })
      }
      if (inp.max !== undefined && val > inp.max) {
        return reply.status(422).send({ error: `${inp.label} en fazla ${inp.max} olmalıdır` })
      }
    }

    let result: Record<string, any>
    try {
      result = formula.calculate(inputs)
    } catch (e: any) {
      return reply.status(422).send({ error: e.message || 'Hesaplama hatası' })
    }

    // Store in history
    try {
      await prisma.formulaCalculation.create({
        data: {
          userId: user.id,
          formulaId: formula.id,
          formulaName: formula.name,
          inputs: JSON.stringify(inputs),
          result: JSON.stringify(result),
        },
      })
    } catch (error) {
      request.log.error({ error, formulaId, userId: user.id }, 'Could not save calculation')
    }

    const localized = localizeFormula(formula, language)
    return {
      formulaId: formula.id,
      result: localizeFormulaResult(result, language),
      assumptions: [],
      warnings: localized.warning ? [localized.warning] : [],
    }
  })

  // GET /formula-calculations — history
  fastify.get('/formula-calculations', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number }
    const language = contentLanguage(request)
    try {
      const calculations = await prisma.formulaCalculation.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return calculations.map(c => ({
        id: c.id,
        formulaId: c.formulaId,
        formulaName: language === 'en' ? (FORMULA_EN_BY_ID[c.formulaId]?.name ?? c.formulaName) : c.formulaName,
        inputs: JSON.parse(c.inputs || '{}'),
        result: JSON.parse(c.result || '{}'),
        createdAt: c.createdAt,
      }))
    } catch (error) {
      request.log.error({ error, userId: user.id }, 'Could not load history')
      return reply.status(500).send({ error: 'Geçmiş yüklenemedi' })
    }
  })
}
