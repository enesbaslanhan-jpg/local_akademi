import { faturaYonu, type UblFatura } from './e-fatura.js'
import type { Prisma, PrismaClient } from '@prisma/client'

type SuggestionDocument = {
  originalName: string
  extractedText: string
  category: string | null
  dueDate: Date | null
  /** Yükleme anında ayrıştırılmış e-Fatura; `analysis.eFatura` içinden. */
  eFatura?: UblFatura | null
}

/*
 * e-FATURADAN ÖNERİ — tahmin değil, okuma.
 *
 * Aşağıdaki sezgisel üretici metinden TAHMİN ediyor: tutarı `₺|TL`
 * arayarak, türü kelime eşleştirmesiyle buluyor. Kaçınılmaz olarak
 * kayıplı ve bu yüzden güveni 0.95'i geçmiyor.
 *
 * UBL-TR faturasında ise tutar, tarih, para birimi ve taraflar
 * YAPILANDIRILMIŞ alanlar. Okunuyor, tahmin edilmiyor -- güven 1.
 *
 * 🔴 YÖN AYRI BİR MESELE. Tutarı bilmek yönü bilmek değildir: aynı
 * fatura hem borç hem alacak olabilir. `faturaYonu` işletmenin vergi
 * numarasıyla karşılaştırıyor; eşleşme yoksa `neutral` dönüyor ve
 * kullanıcıya soruluyor. Yanlış yön, kullanıcının alacağını borç
 * olarak yazmak demektir.
 */
function faturadanOneri(fatura: UblFatura, isletmeVergiNo: string | null | undefined) {
  const yon = faturaYonu(fatura, isletmeVergiNo)

  /* Karşı taraf: yön belliyse öteki taraf, değilse satıcı (faturayı
     kesen taraf, kullanıcının en çok tanıdığı isim). */
  const karsiTaraf = yon === 'receivable' ? fatura.alici : fatura.satici
  const ad = karsiTaraf.unvan || 'Bilinmeyen taraf'

  const payload: RecordSuggestionPayload = {
    type: yon === 'receivable' ? 'receivable' : 'payment',
    title: `${ad} — Fatura ${fatura.id}`,
    description: yon === 'neutral'
      ? 'e-Fatura okundu. Bu faturanın gelen mi giden mi olduğu belirlenemedi — işletme ayarlarında vergi numaranızı girerseniz otomatik ayrılır.'
      : `e-Fatura okundu. Tutar ve tarih faturadan alındı, tahmin edilmedi.`,
    direction: yon,
    amount: fatura.odenecekTutar,
    currency: fatura.paraBirimi,
    /* Vade örneklerin %86'sında yok; yoksa düzenleme tarihi de
       yazılmıyor -- olmayan bir vade uydurmak yanlış hatırlatma
       kurardı. */
    dueAt: fatura.vadeTarihi ? new Date(`${fatura.vadeTarihi}T00:00:00.000Z`).toISOString() : null,
    priority: 'normal'
  }

  const evidence = [
    `Fatura no: ${fatura.id}`,
    `Düzenleme: ${fatura.duzenlemeTarihi}`,
    fatura.vadeTarihi ? `Vade: ${fatura.vadeTarihi}` : null,
    `Tutar: ${fatura.odenecekTutar} ${fatura.paraBirimi}`,
    fatura.satici.unvan ? `Satıcı: ${fatura.satici.unvan}${fatura.satici.kimlik ? ` (${fatura.satici.kimlikTuru} ${fatura.satici.kimlik})` : ''}` : null,
    fatura.alici.unvan ? `Alıcı: ${fatura.alici.unvan}${fatura.alici.kimlik ? ` (${fatura.alici.kimlikTuru} ${fatura.alici.kimlik})` : ''}` : null,
    yon === 'neutral' ? 'Yön belirlenemedi: işletme vergi numarası taraflarla eşleşmiyor' : null
  ].filter(Boolean)

  /* Yapılandırılmış alandan geldiği için tam güven. Sezgisel yol
     0.95'i geçemiyor; aradaki fark bilinçli. */
  return { suggestionType: 'business_record' as const, payload, confidence: 1, evidence }
}

export type RecordSuggestionPayload = {
  type: 'payment' | 'receivable' | 'promissory_note' | 'cheque' | 'purchase' | 'shipment'
  title: string
  description: string
  direction: 'payable' | 'receivable' | 'neutral'
  amount: number | null
  currency: string
  dueAt: string | null
  priority: 'normal' | 'high'
  /* Geçmiş işlem belgelerinde 'completed'; ötekilerde tanımsız
     (kayıt varsayılan olarak açık doğar). */
  status?: 'completed'
}

/*
 * 🔴 GEÇMİŞ İŞLEM BELGELERİ.
 *
 * Dekont, makbuz ve fiş ZATEN YAPILMIŞ ödemelerdir. Bunlardan "açık
 * borç" kaydı önermek, kullanıcıya ödediği parayı bir daha borç olarak
 * göstermek demekti -- ana sayfadaki toplamları ve geciken sayısını da
 * bozardı.
 *
 * Ölçüldü (10.09.2026): banka dekontu "alım borcu" olarak öneriliyordu.
 *
 * ⚠️ Öneri KALDIRILMIYOR, DURUMU değişiyor. Harcamanın kaydı tutulmak
 * istenebilir; olan biteni yok saymak yerine "bu iş bitti" demek doğru.
 */
const GECMIS_ISLEM_ISARETLERI = [
  'dekont',
  'makbuz',
  'fiş',
  'fis no',
  'tahsil edildi',
  'ödenmiştir',
  'ödendi',
  'para üstü'
]

export function gecmisIslemMi(aranabilir: string): boolean {
  return GECMIS_ISLEM_ISARETLERI.some(isaret => aranabilir.includes(isaret))
}

/*
 * Geçmiş işlemin YÖNÜ.
 *
 * ⚠️ Tahmin edilmiyor, yalnız belgenin söylediği okunuyor. Fiş ve
 * makbuz para çıkışıdır; "tahsil edildi" para girişidir. Tek başına
 * "dekont" ikisi de olabilir -- havale hem gelir hem gider olarak
 * çekilir. O durumda yön 'neutral' kalıyor ve kullanıcıya soruluyor;
 * yanlış yön, kullanıcının alacağını borç yazmak demektir.
 */
const GECMIS_ODEME_ISARETLERI = ['fiş', 'fis no', 'makbuz', 'para üstü', 'ödenmiştir', 'ödendi']
const GECMIS_TAHSILAT_ISARETLERI = ['tahsil edildi']

function gecmisIslemYonu(aranabilir: string): RecordSuggestionPayload['direction'] {
  if (GECMIS_TAHSILAT_ISARETLERI.some(i => aranabilir.includes(i))) return 'receivable'
  if (GECMIS_ODEME_ISARETLERI.some(i => aranabilir.includes(i))) return 'payable'
  return 'neutral'
}

const TYPE_RULES: Array<{
  type: RecordSuggestionPayload['type']
  direction: RecordSuggestionPayload['direction']
  terms: string[]
}> = [
  /*
   * ⚠️ 'vade tarihi' BU LİSTEDEN ÇIKARILDI (10.09.2026).
   *
   * Çok genel bir ifade: vadeli hesabı olan bir banka cüzdanında,
   * kredi ekstresinde ya da kira sözleşmesinde geçer. Üstelik bu kural
   * listenin İLK sırasında olduğu için ötekilerin hepsini eziyordu.
   *
   * Ölçüldü: ürün sahibi bir "Dijital Hesap Cüzdanı.pdf" yükledi;
   * belge SENET + borç + yüksek öncelik olarak sınıflandı, vadesi
   * geçmiş göründü ve iki hatırlatma kurdu.
   */
  { type: 'promissory_note', direction: 'payable', terms: ['senet', 'bono'] },
  /* Çek ve senet Türkiye'de hukuken FARKLI; çek bankaya çekilir ve
     karşılıksız çıkarsa ayrı bir süreç işler. Tek türe girdiklerinde
     'hangisi çekti' bilgisi kayboluyordu. */
  { type: 'cheque', direction: 'payable', terms: ['çek no', 'keşide'] },
  { type: 'shipment', direction: 'neutral', terms: ['kargo', 'sevkiyat', 'teslimat', 'takip numarası'] },
  { type: 'receivable', direction: 'receivable', terms: ['tahsilat', 'alacak', 'müşteriden alınacak'] },
  { type: 'purchase', direction: 'payable', terms: ['satın alma', 'sipariş', 'tedarik', 'alım'] },
  { type: 'payment', direction: 'payable', terms: ['fatura', 'ödeme', 'borç', 'son ödeme'] }
]

const CATEGORY_TYPE: Record<string, Pick<RecordSuggestionPayload, 'type' | 'direction'>> = {
  invoice: { type: 'payment', direction: 'payable' },
  promissory_note: { type: 'promissory_note', direction: 'payable' },
  shipment: { type: 'shipment', direction: 'neutral' },
  purchase: { type: 'purchase', direction: 'payable' }
}

/*
 * 🔴 FATURADA İLK TUTAR YANLIŞ TUTARDIR.
 *
 * Önceki sürüm metindeki İLK parayı alıyordu. Faturada ilk tutar hemen
 * her zaman KDV'siz ara toplamdır; ödenecek olan en altta yazar.
 * Ölçüldü (10.09.2026): e-fatura örneğinde 15.000 yerine 12.500,
 * tedarikçi faturasında 3.840 yerine 3.200 alınıyordu. Yani her
 * faturada EKSİK borç kaydediliyordu.
 *
 * Artık önce etiketli toplam aranıyor. Etiket yoksa eski davranışa
 * dönülüyor -- fişte, dekontta tek tutar olur ve etiket aranmaz.
 *
 * ⚠️ Sıra ÖNEMLİ: 'ödenecek tutar' en spesifik olan, başta. Yalnız
 * 'toplam' en sonda, çünkü 'ara toplam' da onu içerir.
 */
const TOPLAM_ETIKETLERI = [
  'ödenecek tutar',
  'vergiler dahil toplam tutar',
  'genel toplam',
  'genel tutar',
  'toplam tutar',
  'toplam'
]

/* Etiketlerin hepsi düz metin (nokta, yıldız vb. yok); bu yüzden
   RegExp'e doğrudan gömülüyorlar, kaçış gerekmiyor. */
const PARA_DESENI = String.raw`(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)`

function findLabelledAmount(text: string) {
  for (const etiket of TOPLAM_ETIKETLERI) {
    const kalip = new RegExp(
      etiket + String.raw`[^\d]{0,20}` + PARA_DESENI + String.raw`\s*(?:₺|TL|TRY)?`,
      'i'
    )
    const eslesme = kalip.exec(text)
    if (!eslesme) continue
    const ham = eslesme[1]
    const duz = ham.includes(',')
      ? ham.replace(/\./g, '').replace(',', '.')
      : ham.replace(/,(?=\d{3}\b)/g, '')
    const tutar = Number(duz)
    if (Number.isFinite(tutar) && tutar > 0 && tutar <= 1e15) {
      return { amount: tutar, evidence: eslesme[0].trim() }
    }
  }
  return null
}

function findAmount(text: string) {
  const matches = [...text.matchAll(/(?:₺|TL|TRY)?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)\s*(?:₺|TL|TRY)\b/gi)]
  for (const match of matches) {
    const raw = match[1]
    const normalized = raw.includes(',')
      ? raw.replace(/\./g, '').replace(',', '.')
      : raw.replace(/,(?=\d{3}\b)/g, '')
    const amount = Number(normalized)
    if (Number.isFinite(amount) && amount >= 0 && amount <= 1e15) {
      return { amount, evidence: match[0].trim() }
    }
  }
  return null
}

function parseDate(day: number, month: number, year: number) {
  const fullYear = year < 100 ? 2000 + year : year
  const date = new Date(Date.UTC(fullYear, month - 1, day, 12))
  if (
    date.getUTCFullYear() !== fullYear ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null
  return date
}

/*
 * 🔴 ETİKETSİZ TARİH VADE SAYILMIYOR.
 *
 * Önceki sürümde etiketli tarih bulunamazsa belgedeki İLK tarihe
 * düşülüyordu. Bir hesap ekstresinde onlarca tarih var ve ilki genelde
 * geçmişte; kayıt doğduğu anda "vadesi geçmiş" görünüyordu.
 *
 * Vade, belgenin SÖYLEDİĞİ bir şeydir; rastgele bir tarih değil.
 * Bulunamıyorsa boş bırakılıyor -- kullanıcı girer.
 */
function findDueDate(text: string) {
  const labelled = /(?:vade|son ödeme|teslimat|kargo)[^\d]{0,30}(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/i.exec(text)
  const match = labelled
  if (!match) return null
  const date = parseDate(Number(match[1]), Number(match[2]), Number(match[3]))
  return date ? { date, evidence: match[0].trim() } : null
}

export function buildDocumentSuggestion(
  document: SuggestionDocument,
  isletmeVergiNo?: string | null
) {
  /*
   * Yapılandırılmış fatura varsa sezgisel yola HİÇ girilmiyor.
   *
   * Girilseydi, XML etiketlerinin arasından `₺` arayan bir tarama
   * yapılırdı; okunmuş bir tutarın üstüne tahmin edilmiş bir tutar
   * koymak açık bir gerileme olurdu.
   */
  if (document.eFatura) return faturadanOneri(document.eFatura, isletmeVergiNo)

  const searchable = `${document.originalName}\n${document.extractedText}`.toLocaleLowerCase('tr-TR')
  const matchedRule = TYPE_RULES.find(rule => rule.terms.some(term => searchable.includes(term)))
  const categoryRule = document.category ? CATEGORY_TYPE[document.category] : undefined
  /*
   * 🔴 GEÇMİŞ İŞLEM BELGESİ HİÇ ÖNERİ ÜRETMİYORDU.
   *
   * Dekont ve fişte 'fatura', 'ödeme', 'senet' gibi tür kelimeleri
   * geçmez; hiçbir kural eşleşmiyor ve belge sessizce düşüyordu.
   * Yapılmış bir harcamanın kaydı esnaf için değerli -- ay sonunda
   * "para nereye gitti" sorusunun cevabı bu kayıtlar.
   *
   * ⚠️ Kural eşleşmesi VARSA ona dokunulmuyor; bu yalnız hiçbir şey
   * bulunamadığında devreye giren son çare.
   */
  const gecmisIslem = gecmisIslemMi(searchable)
  const gecmisKurali = gecmisIslem
    ? { type: 'payment' as const, direction: gecmisIslemYonu(searchable) }
    : undefined

  const classification = matchedRule ?? categoryRule ?? gecmisKurali
  if (!classification) return null

  /* Etiketli toplam varsa o kazanır; yoksa eski tarama. */
  const amountMatch =
    findLabelledAmount(document.extractedText) ?? findAmount(document.extractedText)
  const dateMatch = document.dueDate
    ? { date: document.dueDate, evidence: 'Belge için girilen vade tarihi' }
    : findDueDate(document.extractedText)
  /*
   * 🔴 TUTARSIZ PARA KAYDI ÖNERİLMİYOR.
   *
   * Ödeme, tahsilat, alım ve senet kayıtlarının varlık sebebi TUTAR.
   * Tutar okunamadığında öneri yine de üretiliyordu ve kullanıcının
   * karşısına ₺0,00'lık bir borç kaydı çıkıyordu (ölçüldü, 10.09.2026).
   * Sıfır tutarlı bir borç, bilgi değil gürültüdür: ana sayfadaki
   * toplamları ve geciken sayısını bozar.
   *
   * ⚠️ Kargo/sevkiyat bunun DIŞINDA: onların tutarı olmayabilir ve
   * kayıt yine de anlamlıdır.
   */
  const PARA_TURLERI = new Set(['payment', 'receivable', 'purchase', 'promissory_note'])
  if (PARA_TURLERI.has(classification.type) && !amountMatch) return null

  /* Elde tek bir genel kelimeden başka hiçbir somut veri yoksa kayıt
     önermek, uydurmaktır. */
  if (!amountMatch && !dateMatch) return null

  const evidence = [
    matchedRule ? `Tür eşleşmesi: ${matchedRule.terms.find(term => searchable.includes(term))}` : `Belge kategorisi: ${document.category}`,
    amountMatch?.evidence ? `Tutar: ${amountMatch.evidence}` : null,
    dateMatch?.evidence ? `Tarih: ${dateMatch.evidence}` : null
  ].filter(Boolean)

  const baseName = document.originalName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  /*
   * GÜVEN, GERÇEK KANITI YANSITMALI.
   *
   * Önceki formülde tek bir anahtar kelime eşleşmesi %70'e, üstüne
   * rastgele bir tarih eklenince %80'e çıkıyordu. Ekranda "%80"
   * yazarken elde yalnızca "vade tarihi" ifadesi vardı.
   *
   * ⚠️ İNSANIN SEÇTİĞİ KATEGORİ, ANAHTAR KELİMEDEN DAHA GÜÇLÜ kanıt.
   * Önceki formül tam tersini yapıyordu (kelime 0.18, kategori 0.08).
   */
  const confidence = Math.min(
    0.9,
    0.30 +
      (categoryRule ? 0.20 : 0) +
      (matchedRule ? 0.08 : 0) +
      (amountMatch ? 0.25 : 0) +
      (dateMatch ? 0.15 : 0)
  )
  const gecmis = gecmisIslem

  const payload: RecordSuggestionPayload = {
    ...(gecmis ? { status: 'completed' as const } : {}),
    type: classification.type,
    title: baseName || 'Belgeden oluşturulan kayıt',
    description: `“${document.originalName}” belgesinden önerildi. Kaydetmeden önce bilgileri kontrol edin.`,
    direction: classification.direction,
    amount: amountMatch?.amount ?? null,
    currency: 'TRY',
    dueAt: dateMatch?.date.toISOString() ?? null,
    /* Çek ve senet vadeli ödeme taahhüdü; kaçırılması ağır sonuç
       doğurur, o yüzden ikisi de yüksek öncelikli. Ama zaten olmuş bir
       işlemin aciliyeti yok. */
    priority: !gecmis && (classification.type === 'promissory_note' || classification.type === 'cheque')
      ? 'high'
      : 'normal'
  }
  return { suggestionType: 'business_record', payload, confidence, evidence }
}

/*
 * Üretilen öneriyi KAYDET — tek blok.
 *
 * Belge güncelleme ucu ile e-posta kanalı aynı `documentSuggestion.create`
 * çağrısını kopyalıyordu; üçüncü kopya yazılırken ortaklaştırıldı. Durum
 * daima 'proposed': BusinessRecord ancak insan onayıyla oluşur, öneri
 * hiçbir yerde kendiliğinden kabul edilmez.
 */
export async function oneriKaydet(
  db: PrismaClient | Prisma.TransactionClient,
  veri: {
    workspaceId: string
    documentId: string
    generated: NonNullable<ReturnType<typeof buildDocumentSuggestion>>
  }
) {
  return db.documentSuggestion.create({
    data: {
      workspaceId: veri.workspaceId,
      documentId: veri.documentId,
      suggestionType: veri.generated.suggestionType,
      payload: JSON.stringify(veri.generated.payload),
      confidence: veri.generated.confidence,
      evidence: JSON.stringify(veri.generated.evidence),
      status: 'proposed'
    }
  })
}
