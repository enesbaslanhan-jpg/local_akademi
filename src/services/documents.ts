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

  function resolveSafePath(storedName: string): string {
    const resolved = resolve(join(UPLOAD_DIR, storedName))
    const normalized = normalize(resolved)
    const uploadDirNormalized = normalize(UPLOAD_DIR)
    if (!normalized.startsWith(uploadDirNormalized)) {
      throw new FileValidationError('Geçersiz dosya yolu', 400)
    }
    return normalized
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

    const userQuotaUsage = await prisma.uploadedDocument.aggregate({
      where: { userId: user.id },
      _sum: { sizeBytes: true }
    })
    const currentUsage = userQuotaUsage._sum.sizeBytes || 0
    const quotaBytes = getUserQuotaBytes()
    if (currentUsage + buffer.length > quotaBytes) {
      return reply.status(413).send({
        error: 'Depolama kotanız doldu',
        quota_bytes: quotaBytes,
        usage_bytes: currentUsage
      })
    }

    const docId = randomUUID()
    const storedFilename = `${docId}.${ext}`
    const tempPath = join(UPLOAD_DIR, `.tmp.${storedFilename}`)

    try {
      await writeFile(tempPath, buffer)
    } catch (error) {
      request.log.error({ userId: user.id }, 'Disk yazma hatası')
      await unlink(tempPath).catch(() => {})
      return reply.status(500).send({ error: 'Dosya kaydedilemedi' })
    }

    let extractedText = ''
    let extractionMethod = 'native_text'
    try {
      if (ext === 'docx') {
        const result = await mammoth.extractRawText({ buffer })
        extractedText = result.value
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
      } else {
        extractedText = buffer.toString('utf-8')
      }
      extractedText = extractedText.substring(0, MAX_EXTRACTED_TEXT_LENGTH)
      if (['pdf', 'png', 'jpg', 'jpeg'].includes(ext) && !extractedText.trim()) {
        throw new FileValidationError('Belge üzerinde OCR tamamlandı ancak okunabilir metin bulunamadı', 422)
      }
    } catch (error) {
      request.log.error({ userId: user.id }, 'Metin çıkarımı başarısız')
      await unlink(tempPath).catch(() => {})
      const message = error instanceof FileValidationError
        ? error.message
        : 'Dosyadan metin çıkarılamadı. Bozuk, şifreli veya yalnızca görüntü içeren bir dosya olabilir.'
      return reply.status(422).send({ error: message })
    }

    const finalPath = join(UPLOAD_DIR, storedFilename)
    try {
      await writeFile(finalPath, buffer)
      await unlink(tempPath).catch(() => {})
    } catch (error) {
      request.log.error({ userId: user.id }, 'Final dosya yazma hatası')
      await unlink(tempPath).catch(() => {})
      return reply.status(500).send({ error: 'Dosya kaydedilemedi' })
    }

    /*
     * e-FATURA: yapılandırılmış okuma, yükleme anında.
     *
     * 🔴 NEDEN BURADA, SONRA DEĞİL: `extractedText`
     * `MAX_EXTRACTED_TEXT_LENGTH` (100.000 karakter) ile KIRPILIYOR.
     * XML sınırı ise 2 MB. Yani büyük bir fatura metin alanında yarım
     * kalır ve sonradan ayrıştırılmak istendiğinde biçim hatası verir.
     * Burada TAM tampon elimizde; bir kez okunup sonucu saklanıyor.
     *
     * Ayrıştırılamayan XML hata sayılmıyor: her XML fatura değil.
     * O durumda `eFatura` alanı hiç yazılmıyor ve belge sıradan bir
     * belge gibi davranıyor.
     */
    let eFatura: UblFatura | null = null
    if (ext === 'xml') {
      try {
        eFatura = ublFaturasiniAyristir(buffer.toString('utf-8'))
      } catch {
        /* Fatura değil ya da okunamadı; sessizce geçiliyor. */
      }
    }

    const analysis = {
      ...analyzeText(extractedText, filename),
      extraction_method: extractionMethod,
      ...(extractionMethod === 'ocr_tur' ? { ocr_pages_limit: MAX_OCR_PAGES } : {}),
      ...(eFatura ? { eFatura } : {})
    }

    let doc: { id: string; originalName: string; sizeBytes: number; status: string; analysis: string }
    try {
      doc = await prisma.uploadedDocument.create({
        data: {
          id: docId,
          userId: user.id,
          originalName: filename,
          storedName: storedFilename,
          mimeType,
          sizeBytes: buffer.length,
          extractedText,
          analysis: JSON.stringify(analysis),
          status: 'analyzed'
        }
      })
    } catch (error) {
      request.log.error({ userId: user.id }, 'DB kayıt hatası, dosya temizleniyor')
      await unlink(finalPath).catch(() => {})
      return reply.status(500).send({ error: 'Belge kaydedilemedi' })
    }

    return {
      id: doc.id,
      original_name: doc.originalName,
      size_bytes: doc.sizeBytes,
      status: doc.status,
      analysis: analysis
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
      filePath = resolveSafePath(doc.storedName)
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
