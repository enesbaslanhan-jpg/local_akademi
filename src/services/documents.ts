import { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { prisma as sharedPrisma } from '../lib/prisma.js'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join, resolve, normalize } from 'path'
import { randomUUID } from 'crypto'
import fastifyMultipart from '@fastify/multipart'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { createWorker, OEM } from 'tesseract.js'
import { z } from 'zod'
import {
  MAX_FILE_SIZE, MAX_EXTRACTED_TEXT_LENGTH, MAX_PDF_PAGES, dosyayiDogrula,
  questionSchema, FileValidationError
} from './documentSecurity'
import { ublFaturasiniAyristir, type UblFatura } from './e-fatura.js'

const UPLOAD_DIR = join(process.cwd(), 'uploads')

/*
 * Yüklenen dosyanın diskteki GÜVENLİ tam yolu.
 *
 * 🔴 NEDEN TEK İŞLEV: içe aktarım, büyük tabloları `extractedText`
 * kırpılmasına takılmadan okumak için ikinci bir disk-okuma yolu açtı.
 * İki yol ayrı koruma kullansaydı biri günün sonunda `../` kaçışını
 * yutabilirdi. Silme rotasının eski yerel `resolveSafePath`i ile AYNI
 * mantık artık burada; her iki çağıran da bu kapıdan geçiyor.
 * (`storedName` sunucu üretiyor, o yüzden bugün sömürülebilir değil --
 * ama savunma beyana değil yapıya bağlı olmalı.)
 */
export function yuklemeYoluCoz(storedName: string): string {
  const resolved = resolve(join(UPLOAD_DIR, storedName))
  const normalized = normalize(resolved)
  const uploadDirNormalized = normalize(UPLOAD_DIR)
  if (!normalized.startsWith(uploadDirNormalized)) {
    throw new FileValidationError('Geçersiz dosya yolu', 400)
  }
  return normalized
}

/*
 * 🔴 EXCELJS CJS BİR MODÜL — `default` üzerinden alınmalı.
 *
 * `await import('exceljs')` bir ES modülü değil, CJS sarmalayıcısı
 * döndürüyor: ad alanında yalnız `default` ve `module.exports` var,
 * `Workbook` DOĞRUDAN yok. `new (await import('exceljs')).Workbook()`
 * bu yüzden "is not a constructor" ile patlıyordu -- ve `tsc` bunu
 * yakalamıyor, çünkü paketin tip tanımları CJS'i düz bir ad alanı gibi
 * tarifliyor. Yani DERLEME TEMİZ ama çalışma zamanı düşüyor; hata
 * ancak gerçek bir dosya yüklenince görünüyor.
 *
 * Tek bir yerde çözülüyor: iki çağıran da (belge yükleme ve toplu içe
 * aktarım) buradan geçiyor, ikisi ayrı ayrı yanlış yapamasın diye.
 */
export async function exceljsYukle() {
  const ns = (await import('exceljs')) as any
  return (ns.default ?? ns) as typeof import('exceljs')
}

const MAX_OCR_PAGES = 5
const turData = require('@tesseract.js-data/tur') as { code: string; gzip: boolean; langPath: string }

async function recognizeTurkishPages(pages: Array<{ data: Uint8Array }>) {
  const worker = await createWorker(turData.code, OEM.LSTM_ONLY, {
    langPath: turData.langPath,
    gzip: turData.gzip,
    cacheMethod: 'none',
    logger: () => {}
  })
  try {
    const text: string[] = []
    for (const page of pages.slice(0, MAX_OCR_PAGES)) {
      const result = await worker.recognize(Buffer.from(page.data))
      if (result.data.text.trim()) text.push(result.data.text.trim())
    }
    return text.join('\n\n')
  } finally {
    await worker.terminate()
  }
}

function getUserQuotaBytes(): number {
  const envVal = process.env.DOCUMENT_USER_QUOTA_BYTES
  if (envVal !== undefined && envVal !== '') {
    const parsed = parseInt(envVal, 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed
    }
  }
  return 100 * 1024 * 1024
}

/*
 * BELGEYİ İŞLE VE KAYDET — tek kaynak.
 *
 * 🔴 NEDEN ORTAK: Faz E ile belgenin uygulamaya girdiği İKİNCİ bir
 * yol açıldı (e-posta eki). Kota kontrolü, disk yazımı, metin
 * çıkarımı, e-Fatura ayrıştırması ve veritabanı kaydı orada yeniden
 * yazılsaydı iki yol kaçınılmaz olarak ayrışırdı -- örneğin biri
 * e-Faturayı yapılandırılmış okurken diğeri okumaz, ve kullanıcı
 * dosyayı NASIL gönderdiğine göre farklı sonuç alırdı.
 *
 * Doğrulama ayrı bir ortak işlevde (`dosyayiDogrula`); bu işlev
 * dosyanın ZATEN geçtiğini varsayıyor.
 *
 * Hata durumunda `FileValidationError` FIRLATIR; çağıran taraf
 * `statusCode` alanını kendi bağlamına göre kullanır.
 */
export async function belgeyiKaydet(opts: {
  prisma: PrismaClient
  buffer: Buffer
  filename: string
  mimeType: string
  ext: string
  userId: number
  /** Verilirse belge doğrudan çalışma alanına bağlanır (e-posta yolu). */
  workspaceId?: string | null
}) {
  const { prisma, buffer, filename, mimeType, ext, userId, workspaceId } = opts

  const kullanim = await prisma.uploadedDocument.aggregate({
    where: { userId },
    _sum: { sizeBytes: true }
  })
  const mevcut = kullanim._sum.sizeBytes || 0
  const kota = getUserQuotaBytes()
  if (mevcut + buffer.length > kota) {
    throw new FileValidationError('Depolama kotanız doldu', 413)
  }

  const docId = randomUUID()
  const storedFilename = `${docId}.${ext}`
  const tempPath = join(UPLOAD_DIR, `.tmp.${storedFilename}`)

  try {
    await writeFile(tempPath, buffer)
  } catch {
    await unlink(tempPath).catch(() => {})
    throw new FileValidationError('Dosya kaydedilemedi', 500)
  }

  let extractedText = ''
  let extractionMethod = 'native_text'
  try {
    if (ext === 'docx') {
      extractedText = (await mammoth.extractRawText({ buffer })).value
    } else if (ext === 'pdf') {
      const parser = new PDFParse({ data: buffer })
      try {
        const result = await parser.getText()
        if (result.total > MAX_PDF_PAGES) {
          throw new FileValidationError(`PDF en fazla ${MAX_PDF_PAGES} sayfa olabilir`, 422)
        }
        extractedText = result.text
        if (!extractedText.trim()) {
          const screenshots = await parser.getScreenshot({
            first: Math.min(result.total, MAX_OCR_PAGES),
            desiredWidth: 1800,
            imageBuffer: true,
            imageDataUrl: false
          })
          extractedText = await recognizeTurkishPages(screenshots.pages)
          extractionMethod = 'ocr_tur'
        }
      } finally {
        await parser.destroy()
      }
    } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
      extractedText = await recognizeTurkishPages([{ data: buffer }])
      extractionMethod = 'ocr_tur'
    } else if (ext === 'xlsx') {
      /*
       * 🔴 XLSX'in KENDİ dalı olmak ZORUNDA.
       *
       * Bu dal yokken dosya aşağıdaki `else`e düşüyor ve ikili bir ZIP
       * `toString('utf-8')` ile metne çevriliyordu. İçindeki `0x00`
       * baytları PostgreSQL metin sütununda geçersiz (hata 22021) ve
       * `uploadedDocument.create` düşüyordu: HER xlsx yüklemesi 500
       * veriyordu. Tarayıcıda ölçülerek bulundu -- testler yalnız
       * xlsx'in REDDEDİLMESİNİ sınadığı için görünmemişti.
       *
       * Hücreler `parseXlsx` ile aynı kütüphaneden okunuyor; ikinci bir
       * okuma yolu açılmıyor.
       */
      const ExcelJS = await exceljsYukle()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer as any)
      const satirlar: string[] = []
      workbook.worksheets.forEach(sayfa => {
        sayfa.eachRow(row => {
          const hucreler: string[] = []
          row.eachCell(cell => hucreler.push(String(cell.text ?? '').trim()))
          if (hucreler.some(Boolean)) satirlar.push(hucreler.join('\t'))
        })
      })
      extractedText = satirlar.join('\n')
      extractionMethod = 'xlsx_hucre'
    } else {
      extractedText = buffer.toString('utf-8')
    }
    /*
     * NUL baytı her yoldan temizleniyor. PostgreSQL `text` sütununda
     * `0x00` geçersiz; yukarıdaki xlsx arızası tam olarak bundan
     * çıkmıştı. Tek bir bozuk bayt taşıyan bir CSV ya da OCR çıktısı da
     * aynı 500'ü verirdi -- kapı burada, tek yerde kapatılıyor.
     */
    extractedText = extractedText.replace(/\u0000/g, '')
    extractedText = extractedText.substring(0, MAX_EXTRACTED_TEXT_LENGTH)
    if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext) && !extractedText.trim()) {
      throw new FileValidationError('Belge üzerinde OCR tamamlandı ancak okunabilir metin bulunamadı', 422)
    }
  } catch (error) {
    await unlink(tempPath).catch(() => {})
    if (error instanceof FileValidationError) throw error
    throw new FileValidationError(
      'Dosyadan metin çıkarılamadı. Bozuk, şifreli veya yalnızca görüntü içeren bir dosya olabilir.',
      422
    )
  }

  const finalPath = join(UPLOAD_DIR, storedFilename)
  try {
    await writeFile(finalPath, buffer)
    await unlink(tempPath).catch(() => {})
  } catch {
    await unlink(tempPath).catch(() => {})
    throw new FileValidationError('Dosya kaydedilemedi', 500)
  }

  /*
   * e-Fatura: yapılandırılmış okuma, TAM tampondan.
   *
   * `extractedText` kırpılıyor; büyük bir fatura orada yarım kalır ve
   * sonradan ayrıştırılamaz. Burada tampon elimizde.
   */
  let eFatura: UblFatura | null = null
  if (ext === 'xml') {
    try {
      eFatura = ublFaturasiniAyristir(buffer.toString('utf-8'))
    } catch {
      /* Her XML fatura değil; sessizce geçiliyor. */
    }
  }

  const analysis = {
    ...analyzeText(extractedText, filename),
    extraction_method: extractionMethod,
    ...(extractionMethod === 'ocr_tur' ? { ocr_pages_limit: MAX_OCR_PAGES } : {}),
    ...(eFatura ? { eFatura } : {})
  }

  let doc
  try {
    doc = await prisma.uploadedDocument.create({
      data: {
        id: docId,
        userId,
        originalName: filename,
        storedName: storedFilename,
        mimeType,
        sizeBytes: buffer.length,
        extractedText,
        analysis: JSON.stringify(analysis),
        status: 'analyzed',
        ...(workspaceId ? { workspaceId } : {})
      }
    })
  } catch {
    await unlink(finalPath).catch(() => {})
    throw new FileValidationError('Belge kaydedilemedi', 500)
  }

  return {
    id: doc.id,
    original_name: doc.originalName,
    size_bytes: doc.sizeBytes,
    status: doc.status,
    analysis
  }
}

export async function documentRoutes(fastify: FastifyInstance, opts?: { prisma?: PrismaClient }) {
  const prisma = opts?.prisma ?? sharedPrisma

  await fastify.register(fastifyMultipart, {
    limits: { fileSize: MAX_FILE_SIZE }
  })
  await mkdir(UPLOAD_DIR, { recursive: true })

  function sanitizeFilename(name: string): string {
    const ext = (name.split('.').pop() || '').toLowerCase()
    const safeBase = name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255)
    return `${safeBase}.${ext}` === safeBase ? safeBase : `${safeBase}.${ext}`
  }

  fastify.post('/upload', {
    preHandler: [fastify.authenticate],
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } }
  }, async (request, reply) => {
    const user = request.user as { id: number }

    let filename = 'unknown'
    let mimeType = ''
    let buffer = Buffer.from('')

    try {
      const data = await request.file()
      if (data) {
        filename = data.filename
        mimeType = data.mimetype
        const buf = await data.toBuffer()
        buffer = Buffer.from(buf)
      }
    } catch (e: any) {
      if (e.message?.includes('file size limit') || e.statusCode === 413) {
        return reply.status(413).send({ error: `Dosya boyutu ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB ile sınırlıdır` })
      }
      request.log.error({ error: e }, 'Upload read error')
      return reply.status(400).send({ error: 'Dosya okunamadı' })
    }

    if (!filename || filename === 'unknown' || buffer.length === 0) {
      return reply.status(400).send({ error: 'Dosya yüklenmedi' })
    }

    if (buffer.length > MAX_FILE_SIZE) {
      return reply.status(413).send({ error: `Dosya boyutu ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB ile sınırlıdır` })
    }

    /*
     * Kabul ölçütü ORTAK işlevde (`dosyayiDogrula`).
     *
     * Burada ~100 satırlık sıralı `if` zinciri vardı. Faz E ile ikinci
     * bir TAŞIMA yolu açıldı (e-posta eki); kontroller orada tekrar
     * yazılsaydı iki liste kaçınılmaz olarak ayrışırdı. Taşıma farklı,
     * kabul ölçütü aynı.
     */
    let ext: string
    try {
      ext = dosyayiDogrula(buffer, filename, mimeType).ext
    } catch (e) {
      if (e instanceof FileValidationError) {
        return reply.status(e.statusCode).send({ error: e.message })
      }
      throw e
    }

    /*
     * Kaydetme ve metin çıkarımı ORTAK işlevde.
     *
     * Faz E ile ikinci bir taşıma yolu açıldı (e-posta eki). Kota,
     * disk yazımı, metin çıkarımı ve e-Fatura ayrıştırması orada
     * tekrar yazılsaydı iki yol ayrışırdı -- örneğin biri e-Faturayı
     * okurken diğeri okumazdı.
     */
    try {
      return await belgeyiKaydet({
        prisma, buffer, filename, mimeType, ext, userId: user.id
      })
    } catch (e) {
      if (e instanceof FileValidationError) {
        return reply.status(e.statusCode).send({ error: e.message })
      }
      request.log.error({ userId: user.id }, 'belge kaydedilemedi')
      return reply.status(500).send({ error: 'Belge kaydedilemedi' })
    }
  })

  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    try {
      const docs = await prisma.uploadedDocument.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      })
      return {
        documents: docs.map((d: { id: string; originalName: string; sizeBytes: number; status: string; analysis: string; createdAt: Date }) => ({
          id: d.id,
          original_name: d.originalName,
          size_bytes: d.sizeBytes,
          status: d.status,
          analysis: safeParseJson(d.analysis),
          created_at: d.createdAt
        }))
      }
    } catch (error) {
      request.log.error({ userId: user.id }, 'Failed to fetch documents')
      return reply.status(500).send({ error: 'Belgeler yüklenemedi' })
    }
  })

  fastify.get('/:documentId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    const { documentId } = request.params as { documentId: string }

    try {
      const doc = await prisma.uploadedDocument.findFirst({
        where: { id: documentId, userId: user.id }
      })

      if (!doc) {
        return reply.status(404).send({ error: 'Belge bulunamadı' })
      }

      return {
        id: doc.id,
        original_name: doc.originalName,
        status: doc.status,
        analysis: safeParseJson(doc.analysis),
        extracted_text: (doc.extractedText || '').substring(0, 20000),
        created_at: doc.createdAt
      }
    } catch (error) {
      request.log.error({ userId: user.id, documentId }, 'Failed to fetch document')
      return reply.status(500).send({ error: 'Belge yüklenemedi' })
    }
  })

  fastify.delete('/:documentId', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    const { documentId } = request.params as { documentId: string }

    let doc: { id: string; userId: number; storedName: string } | null
    try {
      doc = await prisma.uploadedDocument.findFirst({
        where: { id: documentId, userId: user.id }
      })
    } catch (error) {
      request.log.error({ userId: user.id, documentId }, 'Failed to find document for delete')
      return reply.status(500).send({ error: 'Belge silinemedi' })
    }

    if (!doc) {
      return reply.status(404).send({ error: 'Belge bulunamadı' })
    }

    let filePath: string
    try {
      filePath = yuklemeYoluCoz(doc.storedName)
    } catch (e) {
      request.log.error({ storedName: doc.storedName }, 'Unsafe storedName rejected')
      return reply.status(500).send({ error: 'Belge silinemedi' })
    }

    try {
      await prisma.uploadedDocument.delete({
        where: { id: documentId }
      })
    } catch (error) {
      request.log.error({ userId: user.id, documentId }, 'DB delete failed')
      return reply.status(500).send({ error: 'Belge silinemedi' })
    }

    try {
      await unlink(filePath)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return { deleted: true }
      }
      request.log.error({ userId: user.id, storedName: doc.storedName }, 'File delete failed, DB record already removed')
      return { deleted: true }
    }

    return { deleted: true }
  })

  fastify.post('/:documentId/ask', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const user = request.user as { id: number }
    const { documentId } = request.params as { documentId: string }

    let question: string
    try {
      const validated = questionSchema.parse(request.body)
      question = validated.question
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return reply.status(422).send({ error: 'Geçersiz soru', details: err.errors.map((e: any) => e.message) })
      }
      return reply.status(422).send({ error: 'Geçersiz soru' })
    }

    try {
      const doc = await prisma.uploadedDocument.findFirst({
        where: { id: documentId, userId: user.id }
      })

      if (!doc) {
        return reply.status(404).send({ error: 'Belge bulunamadı' })
      }

      const text = doc.extractedText || ''
      const answer = answerQuestion(question, text)

      await prisma.documentConversation.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          documentId,
          question,
          answer: answer.answer,
          evidence: JSON.stringify(answer.evidence || []),
          aiMode: 'local_extractive'
        }
      })

      return { ...answer, id: randomUUID(), document_id: documentId }
    } catch (error) {
      request.log.error({ userId: user.id, documentId }, 'Failed to answer question')
      return reply.status(500).send({ error: 'Soru cevaplanamadı' })
    }
  })
}

function safeParseJson(value: string): any {
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function analyzeText(text: string, filename: string) {
  const words = text.split(/\s+/).filter((w: string) => w.length > 0)
  const numbers = text.match(/\d+\.?\d*/g) || []
  const keywords = extractKeywords(text)
  const categoryTerms: Record<string, string[]> = {
    Finans: ['bütçe', 'gelir', 'gider', 'nakit', 'finans', 'maliyet'],
    Teknik: ['yazılım', 'kod', 'sistem', 'teknik', 'veri', 'api'],
    Hukuk: ['kanun', 'hukuk', 'sözleşme', 'mevzuat', 'madde'],
    Eğitim: ['eğitim', 'öğrenci', 'öğrenme', 'ders', 'sınav']
  }
  const normalized = text.toLocaleLowerCase('tr-TR')
  const primaryCategory = Object.entries(categoryTerms)
    .map(([category, terms]) => ({ category, score: terms.filter(term => normalized.includes(term)).length }))
    .sort((a, b) => b.score - a.score)[0]
  const category = primaryCategory?.score ? primaryCategory.category : 'Genel'

  return {
    summary: text.substring(0, 300) + (text.length > 300 ? '...' : ''),
    word_count: words.length,
    primary_category: category,
    keywords,
    numbers,
    warnings: text.length > 100000 ? ['Çok uzun metin, bazı bölümler atlandı'] : []
  }
}

function extractKeywords(text: string) {
  const stopWords = ['bir', 've', 'ile', 'için', 'bu', 'da', 'de', 'ya', 'ne', 'mi', 'mı', 'mu', 'mü']
  const words = text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3 && !stopWords.includes(w))
  const freq: Record<string, number> = {}
  words.forEach((w: string) => { freq[w] = (freq[w] || 0) + 1 })
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w)
}

function answerQuestion(question: string, text: string) {
  const questionLower = question.toLowerCase()
  const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 10)

  let bestMatch = ''
  let maxScore = 0

  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase()
    const questionWords = questionLower.split(/\s+/)
    let score = 0
    for (const word of questionWords) {
      if (sentenceLower.includes(word)) score++
    }
    if (score > maxScore) {
      maxScore = score
      bestMatch = sentence.trim()
    }
  }

  if (maxScore === 0) {
    return { answer: 'Belgede bu soruya uygun bir cevap bulamadım.', evidence: [] }
  }

  return {
    answer: bestMatch,
    evidence: [bestMatch.substring(0, 200)],
    ai_mode: 'local_extractive'
  }
}
