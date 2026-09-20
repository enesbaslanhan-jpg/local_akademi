import { z } from 'zod'
import type { RecordSuggestionPayload } from './document-suggestions.js'

/*
 * BELGE ANLAMA — OCR metninden yapılandırılmış alanlar (20.09.2026).
 *
 * 🔴 NEDEN VAR: Fiş/fatura fotoğrafları için sezgisel tutar seçici (regex ile
 * "toplam" arama) canlıda üst üste yanlış sonuç verdi: kafe fişinde üstteki
 * gürültülü "TOPLAM 4534500" satırı 4.534.500 ₺ önerdi (gerçek 345 ₺);
 * BİM e-Arşiv'de "Ödenecek KDV Dahil Tutar *195.00" hiç yakalanmadı (0 ₺).
 * OCR metni doğruydu; yanlış olan anlama katmanıydı. Her yeni fiş biçimi için
 * regex eklemek bitmez; bir dil modeli bu işi tek seferde ve satır bağlamıyla
 * yapar.
 *
 * ⚠️ TASARIM SINIRLARI:
 *  - Model yalnız ÇIKARIM yapar, karar vermez: tutar/tarih/tür/yön/satıcı.
 *    Kaydı yine kullanıcı onaylar (öneri akışı değişmedi).
 *  - Çıktı katı şemayla doğrulanır (zod); şemaya uymayan ya da güveni düşük
 *    yanıt YOK sayılır ve sezgisel yol devreye girer. Model asla "uydurmaya"
 *    zorlanmaz: emin değilse null döndürmesi istenir.
 *  - Sağlayıcı/profil mentor ile aynı kapıdan (ai-gateway); giriş/çıkış
 *    denetleyicileri kapalı çünkü bu bir sohbet değil, veri çıkarımı.
 *  - Metin 6.000 karakterle sınırlı: fiş metni zaten kısa; ekstre gibi uzun
 *    belgelerde baş+son alınır (toplamlar genelde sondadır).
 *  - Sağlayıcı yoksa/hata verirse sessizce null: yükleme akışı asla AI
 *    yüzünden düşmez.
 */

const AlanlarSemasi = z.object({
  belge_turu: z.enum(['fis', 'fatura', 'ekstre', 'dekont', 'senet', 'cek', 'siparis', 'diger']).nullable(),
  toplam_tutar: z.number().nonnegative().max(1e12).nullable(),
  para_birimi: z.string().max(3).nullable(),
  tarih: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  son_odeme_tarihi: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  satici: z.string().max(120).nullable(),
  yon: z.enum(['odeme', 'tahsilat', 'belirsiz']).nullable(),
  odenmis_mi: z.boolean().nullable(),
  guven: z.number().min(0).max(1),
  gerekce: z.string().max(300).nullable(),
})
export type BelgeAlanlari = z.infer<typeof AlanlarSemasi>

const SISTEM = `Sen Türkiye'deki küçük işletmelerin fiş, fatura, e-Arşiv fatura, banka/kredi kartı ekstresi, dekont, çek ve senet belgelerinden alan çıkaran bir asistansın. Sana OCR ile okunmuş, hatalı karakterler içerebilen ham metin verilecek.

Görev: SADECE aşağıdaki JSON nesnesini döndür, başka hiçbir şey yazma.
{
  "belge_turu": "fis|fatura|ekstre|dekont|senet|cek|siparis|diger|null",
  "toplam_tutar": sayı veya null,
  "para_birimi": "TRY" gibi 3 harf veya null,
  "tarih": "YYYY-MM-DD" veya null,
  "son_odeme_tarihi": "YYYY-MM-DD" veya null,
  "satici": kısa ad veya null,
  "yon": "odeme|tahsilat|belirsiz|null",
  "odenmis_mi": true/false/null,
  "guven": 0 ile 1 arası,
  "gerekce": tek cümle, hangi satırdan aldığın
}

Kurallar:
- toplam_tutar = müşterinin ÖDEDİĞİ/ÖDEYECEĞİ nihai tutar. Fişte "TOPLAM", "GENEL TOPLAM", "ÖDENECEK KDV DAHİL TUTAR"; kredi kartı ekstresinde "DÖNEM BORCU" (asgari ödeme, faiz, puan DEĞİL); faturada "ÖDENECEK TUTAR" (ara toplam, KDV, matrah DEĞİL).
- OCR gürültüsüne dikkat: aynı satır iki kez geçebilir, biri bozuk ("4534500") biri doğru ("345,00 TL"). Kart ödeme satırı ("345,00 TL", "ONAY KODU") ile fiş toplamı tutarlıysa onu seç. Mantıksız büyüklükte (ürün satırlarının toplamıyla uyumsuz) tutarı seçme.
- Türk biçimi 1.234,56 ve banka biçimi 1,234.56 ikisi de olabilir; sayıyı doğru çöz. "*195.00" gibi yıldızlı yazımlar tutar demektir.
- tarih = belgenin/işlemin tarihi. son_odeme_tarihi yalnız ekstre/fatura/senet gibi vadeli belgelerde.
- yon: işletme para ÖDÜYORSA "odeme" (fiş, alış faturası, ekstre, senet borcu); işletme para ALIYORSA "tahsilat" (kendi kestiği satış faturası, tahsilat dekontu). Emin değilsen "belirsiz".
- odenmis_mi: fiş, kart ödeme satırı olan belge, ödeme dekontu → true; ekstre/vadeli fatura → false.
- Emin olmadığın alanı null bırak; guven'i dürüst ver. Uydurma.`

function metniKirp(metin: string, sinir = 6000) {
  const t = metin.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (t.length <= sinir) return t
  const bas = Math.floor(sinir * 0.45), son = sinir - bas
  return t.slice(0, bas) + '\n…\n' + t.slice(-son)
}

function jsonCikar(icerik: string): unknown {
  const temiz = icerik.replace(/```json|```/gi, '').trim()
  const ilk = temiz.indexOf('{'), son = temiz.lastIndexOf('}')
  if (ilk < 0 || son <= ilk) throw new Error('JSON yok')
  return JSON.parse(temiz.slice(ilk, son + 1))
}

/** Sağlayıcı yoksa, hata verirse ya da güven düşükse null. */
export async function belgeAlanlariniCikar(
  metin: string,
  opts: { dosyaAdi?: string; requestId?: string } = {}
): Promise<BelgeAlanlari | null> {
  if (!metin || metin.trim().length < 20) return null
  if (process.env.BELGE_ANLAMA_KAPALI === '1') return null
  /*
   * ZAMAN BÜTÇESİ: bu çağrı belge yükleme isteğinin İÇİNDE koşar. Sohbet
   * yönlendiricisi yedek sağlayıcılarla 50+ sn bekleyebiliyor (ölçüldü:
   * Gemini 503 → omniroute → nvidia zaman aşımları, 56 sn). Yükleme o kadar
   * beklemez: BELGE_ANLAMA_SURE_MS (varsayılan 9 sn; ölçülen yanıtlar 5–8 sn) dolunca iptal edilir ve
   * sezgisel sonuç kullanılır.
   */
  const butceMs = Number(process.env.BELGE_ANLAMA_SURE_MS) || 9000
  const denetleyici = new AbortController()
  const zamanlayici = setTimeout(() => denetleyici.abort(), butceMs)
  try {
    const { generateCompletion } = await import('./ai-gateway.js')
    const baslangic = Date.now()
    const yanit = await Promise.race([
      generateCompletion({
      abortSignal: denetleyici.signal,
      profile: 'BELGE_HIZLI',
      messages: [
        { role: 'system', content: SISTEM },
        { role: 'user', content: `Dosya adı: ${opts.dosyaAdi ?? '-'}\n\nOCR metni:\n"""\n${metniKirp(metin)}\n"""` },
      ],
      skipMasking: true,
      skipInputReview: true,
      skipOutputReview: true,
      temperature: 0,
      maxOutputTokens: 400,
      requestId: opts.requestId,
      provider: process.env.BELGE_AI_PROVIDER ?? process.env.MENTOR_AI_PROVIDER,
      model: process.env.BELGE_AI_MODEL ?? process.env.MENTOR_AI_MODEL,
      }),
      new Promise<never>((_, reddet) => denetleyici.signal.addEventListener('abort', () => reddet(new Error('BELGE_ANLAMA_ZAMAN_ASIMI')))),
    ])
    const alanlar = AlanlarSemasi.parse(jsonCikar(yanit.content))
    console.log(JSON.stringify({
      event: 'BELGE_ANLAMA_FINISHED',
      provider: yanit.provider, model: yanit.model,
      durationMs: Date.now() - baslangic,
      guven: alanlar.guven, tutarVar: alanlar.toplam_tutar != null, belgeTuru: alanlar.belge_turu,
    }))
    if (alanlar.guven < 0.5) return null
    return alanlar
  } catch (error) {
    console.log(JSON.stringify({ event: 'BELGE_ANLAMA_FAILED', message: (error as Error)?.message?.slice(0, 200) }))
    return null
  } finally {
    clearTimeout(zamanlayici)
  }
}

const TUR_ESLEME: Record<NonNullable<BelgeAlanlari['belge_turu']>, RecordSuggestionPayload['type']> = {
  fis: 'payment',
  fatura: 'payment',
  ekstre: 'payment',
  dekont: 'payment',
  senet: 'promissory_note',
  cek: 'cheque',
  siparis: 'purchase',
  diger: 'payment',
}

/**
 * AI alanlarını öneri yüküne çevirir. Sezgisel yükle birleştirir: AI'ın
 * verdiği alan kazanır, vermediği yerde sezgiselin değeri kalır.
 */
export function alanlardanOneri(
  alanlar: BelgeAlanlari,
  taban: RecordSuggestionPayload,
  dosyaAdi: string
): RecordSuggestionPayload {
  const tur = alanlar.belge_turu ? TUR_ESLEME[alanlar.belge_turu] : taban.type
  const yon: RecordSuggestionPayload['direction'] =
    alanlar.yon === 'tahsilat' ? 'receivable' : alanlar.yon === 'odeme' ? 'payable' : taban.direction
  /* Tahsilat yönünde tür 'receivable' olmalı; 'payment' + receivable çelişir. */
  const type: RecordSuggestionPayload['type'] = yon === 'receivable' && (tur === 'payment' || tur === 'purchase') ? 'receivable' : tur
  const vade = alanlar.son_odeme_tarihi ?? (alanlar.odenmis_mi === false ? alanlar.tarih : null)
  const baslik = alanlar.satici
    ? `${alanlar.satici}${alanlar.tarih ? ' · ' + alanlar.tarih.split('-').reverse().join('.') : ''}`
    : taban.title
  return {
    ...taban,
    type,
    direction: yon,
    title: baslik.slice(0, 120),
    amount: alanlar.toplam_tutar ?? taban.amount,
    currency: alanlar.para_birimi && /^[A-Z]{3}$/.test(alanlar.para_birimi) ? alanlar.para_birimi : taban.currency,
    dueAt: vade ? new Date(vade + 'T12:00:00.000Z').toISOString() : taban.dueAt,
    ...(alanlar.odenmis_mi === true ? { status: 'completed' as const } : alanlar.odenmis_mi === false ? { status: undefined } : {}),
    description: `“${dosyaAdi}” belgesinden okundu${alanlar.gerekce ? ` (${alanlar.gerekce})` : ''}. Kaydetmeden önce bilgileri kontrol edin.`,
  }
}
