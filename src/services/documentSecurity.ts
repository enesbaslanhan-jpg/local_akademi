import { z } from 'zod'
import { XMLValidator } from 'fast-xml-parser'

export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const MAX_EXTRACTED_TEXT_LENGTH = 100000
export const MAX_QUESTION_LENGTH = 2000
export const MAX_ZIP_ENTRIES = 100
export const MAX_TOTAL_UNCOMPRESSED = 100 * 1024 * 1024
export const MAX_SINGLE_ENTRY_UNCOMPRESSED = 50 * 1024 * 1024
export const MAX_COMPRESSION_RATIO = 100
export const MAX_PDF_PAGES = 200
export const MAX_IMAGE_PIXELS = 25_000_000

/*
 * XML ayrıştırma için ayrı ve DAHA DAR bir sınır.
 *
 * `MAX_FILE_SIZE` (10 MB) yükleme sınırı; ayrıştırma sınırı değil. XML
 * ağaca açıldığında bellekte dosyadan kat kat büyür. e-Fatura XML'leri
 * tipik olarak birkaç yüz KB; 2 MB fazlasıyla yeterli ve kötü niyetli
 * bir dosyanın belleği şişirmesini erkenden keser.
 */
export const MAX_XML_BYTES = 2 * 1024 * 1024

export const ALLOWED_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'xml', 'docx', 'pdf', 'png', 'jpg', 'jpeg'])
export const ALLOWED_MIME_MAP: Record<string, string> = {
  'txt': 'text/plain',
  'md': 'text/markdown',
  'csv': 'text/csv',
  'json': 'application/json',
  'xml': 'application/xml',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'pdf': 'application/pdf',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  /*
   * Video YALNIZ topluluk paylaşımları için.
   *
   * Belge yükleme bu haritayı MIME eşleştirmesinde kullanıyor ama izin
   * listesi ayrı (`ALLOWED_EXTENSIONS`, yukarıda) — oraya eklenmediği
   * sürece belge yükleme tarafında video kabul edilmez. Bilerek böyle:
   * bir dosyayı "belge" olarak işlemek (metin çıkarma, OCR) videoda
   * anlamsız.
   */
  'mp4': 'video/mp4',
  'webm': 'video/webm'
}

/*
 * Bazı uzantılar için TEK bir doğru MIME yok.
 *
 * XML bunun tipik örneği: `application/xml` ve `text/xml` ikisi de
 * geçerli ve hangisinin gönderileceği yazılıma göre değişiyor. Muhasebe
 * programlarının ürettiği e-Fatura dosyalarında ikisi de görülüyor.
 * Tek değere zorlamak, tamamen geçerli bir faturayı 415 ile reddederdi.
 *
 * Bu bir GEVŞETME değil: liste kapalı, yalnız burada yazılı değerler
 * kabul ediliyor ve içerik doğrulaması (sihirli bayt / ayrıştırma)
 * ayrıca çalışıyor. MIME zaten istemcinin beyanı; asıl güvence orada.
 */
export const ALLOWED_MIME_ALTERNATIVES: Record<string, readonly string[]> = {
  'xml': ['text/xml']
}

/**
 * Uzantı ile istemcinin bildirdiği MIME türü uyuşuyor mu.
 *
 * Tek noktadan sorulması önemli: iki ayrı yerde `!==` ile karşılaştırma
 * yapılırsa biri güncellenip diğeri unutulur ve aynı dosya bir kapıdan
 * geçip diğerinden geçmez.
 */
export function mimeTuruUygunMu(ext: string, mimeType: string): boolean {
  const beklenen = ALLOWED_MIME_MAP[ext]
  /* Haritada karşılığı olmayan uzantı için MIME kontrolü yapılmıyor —
     mevcut davranış buydu, korunuyor. */
  if (!beklenen) return true
  if (mimeType === beklenen) return true
  return (ALLOWED_MIME_ALTERNATIVES[ext] || []).includes(mimeType)
}

export const questionSchema = z.object({
  question: z.string().min(1, 'Soru boş olamaz').max(MAX_QUESTION_LENGTH, `Soru ${MAX_QUESTION_LENGTH} karakterden uzun olamaz`)
})

export interface FileTypeCheckResult {
  valid: boolean
  detectedType: string | null
  error?: string
}

export function detectFileType(buffer: Buffer): FileTypeCheckResult {
  if (buffer.length < 4) {
    return { valid: false, detectedType: null, error: 'Dosya çok küçük' }
  }

  const magic = buffer.subarray(0, 8)
  const firstBytes = buffer.subarray(0, 4)

  if (isZip(buffer)) {
    return { valid: true, detectedType: 'docx' }
  }

  if (isPdf(buffer)) {
    return { valid: true, detectedType: 'pdf' }
  }

  if (isPng(buffer)) {
    return { valid: true, detectedType: 'png' }
  }

  if (isJpeg(buffer)) {
    return { valid: true, detectedType: 'jpeg' }
  }

  if (isJson(buffer)) {
    return { valid: true, detectedType: 'json' }
  }

  /*
   * Video, aşağıdaki "binary dosya" reddinden ÖNCE tanınmalı: ikili
   * içerik oldukları için o kontrol onları da reddederdi.
   *
   * Burada tanınmaları, belge yükleme tarafında kabul edildikleri
   * anlamına GELMEZ — orada ayrı bir izin listesi var
   * (`ALLOWED_EXTENSIONS`) ve video o listede yok.
   */
  if (isMp4(buffer)) {
    return { valid: true, detectedType: 'mp4' }
  }

  if (isWebm(buffer)) {
    return { valid: true, detectedType: 'webm' }
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 1024))
  if (sample.includes(0x00)) {
    return { valid: false, detectedType: null, error: 'Binary dosya tespit edildi. Yalnız TXT, MD, CSV, JSON, DOCX desteklenir.' }
  }

  const slice = buffer.toString('utf-8', 0, Math.min(buffer.length, 512))
  if (/^[\s\S]*$/.test(slice) && slice.length > 0) {
    return { valid: true, detectedType: 'text' }
  }

  return { valid: false, detectedType: null, error: 'Dosya türü tanınamadı' }
}

function isZip(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B &&
    buffer[2] === 0x03 && buffer[3] === 0x04
}

function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-'
}

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9
}

/*
 * MP4: ilk kutu başlığında 4. bayttan itibaren "ftyp" imzası bulunur.
 * (İlk dört bayt kutu uzunluğudur, sabit değildir.)
 */
function isMp4(buffer: Buffer): boolean {
  return buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp'
}

/* WebM/Matroska: EBML başlığı 1A 45 DF A3. */
function isWebm(buffer: Buffer): boolean {
  return buffer.length >= 4
    && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
}

/*
 * Video içerik doğrulaması — uzantıya değil BAYTLARA bakar.
 *
 * Uzantı ve MIME istemciden geliyor, ikisi de uydurulabilir. Bir betiği
 * `.mp4` diye yüklemek mümkün olmamalı; bu yüzden her yüklemede imza
 * kontrol ediliyor. Aynı yaklaşım PNG/JPEG/PDF için de uygulanıyor.
 */
export function validateVideoFile(buffer: Buffer, expected: 'mp4' | 'webm'): void {
  const eslesti = expected === 'mp4' ? isMp4(buffer) : isWebm(buffer)
  if (!eslesti) {
    throw new FileValidationError('Video içeriği uzantıyla uyuşmuyor', 415)
  }
}

export function validatePdfFile(buffer: Buffer): void {
  if (!isPdf(buffer)) {
    throw new FileValidationError('Geçersiz PDF imzası', 415)
  }
  const structuralSample = buffer.toString('latin1')
  if (/\/Encrypt\b/.test(structuralSample)) {
    throw new FileValidationError('Şifreli PDF dosyaları desteklenmez', 422)
  }
  if (!/%%EOF\s*$/.test(structuralSample.trimEnd())) {
    throw new FileValidationError('Eksik veya bozuk PDF yapısı', 422)
  }
}

export function validateImageFile(buffer: Buffer, type: 'png' | 'jpeg'): void {
  let width = 0
  let height = 0
  if (type === 'png' && isPng(buffer) && buffer.length >= 24) {
    width = buffer.readUInt32BE(16)
    height = buffer.readUInt32BE(20)
  } else if (type === 'jpeg' && isJpeg(buffer)) {
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset += 1; continue }
      const marker = buffer[offset + 1]
      const length = buffer.readUInt16BE(offset + 2)
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        height = buffer.readUInt16BE(offset + 5)
        width = buffer.readUInt16BE(offset + 7)
        break
      }
      if (length < 2) break
      offset += 2 + length
    }
  }
  if (!width || !height) throw new FileValidationError('Görsel boyutları okunamadı', 422)
  if (width > 10_000 || height > 10_000 || width * height > MAX_IMAGE_PIXELS) {
    throw new FileValidationError('Görsel çözünürlüğü güvenli OCR sınırını aşıyor', 422)
  }
}

function isJson(buffer: Buffer): boolean {
  const trimmed = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000)).trim()
  return trimmed.startsWith('{') || trimmed.startsWith('[')
}

export function validateTextFile(buffer: Buffer): void {
  if (buffer.length === 0) {
    throw new FileValidationError('Dosya boş', 422)
  }
  if (buffer.includes(0x00)) {
    throw new FileValidationError('Binary veri içeren dosya TXT/MD/CSV olarak kabul edilmez', 415)
  }
}

export function validateJsonFile(buffer: Buffer): void {
  const text = buffer.toString('utf-8')
  try {
    JSON.parse(text)
  } catch {
    throw new FileValidationError('Geçersiz JSON dosyası', 422)
  }
}

/*
 * ---------- XML ----------
 *
 * 🔴 XML, JSON DEĞİLDİR. İki saldırı sınıfı sunucuyu düşürebilir ya da
 * dosyalarını okutabilir, ve ikisi de DTD üzerinden çalışır:
 *
 *   1. XXE (dış varlık):
 *      <!DOCTYPE f [<!ENTITY x SYSTEM "file:///etc/passwd">]>
 *      Ayrıştırıcı dış varlığı çözerse sunucudaki dosya faturanın
 *      içine gömülür ve kullanıcıya geri gösterilir.
 *
 *   2. Milyar kahkaha (varlık şişmesi):
 *      İç içe tanımlı varlıklarla birkaç KB'lık dosya ayrıştırıldığında
 *      gigabaytlara açılır ve süreç ölür.
 *
 * SAVUNMA: DTD'nin KENDİSİ reddediliyor -- `<!DOCTYPE` gördüğümüz anda
 * dosya geri çevriliyor.
 *
 * Neden ayrıştırıcının varsayılanlarına güvenilmedi: `fast-xml-parser`
 * dış varlık çözmüyor, ama bu bir kütüphane davranışıdır ve sürüm
 * yükseltmesiyle değişebilir; üstelik bir gün başka bir ayrıştırıcıya
 * geçilirse bu dosyadaki koruma onunla da çalışmalı. Kapıda durmak,
 * içeride birinin dikkatli olmasını ummaktan güvenlidir.
 *
 * Neden meşru dosyaları kırmıyor: UBL-TR e-Fatura belgelerinde DTD
 * BULUNMAZ. Şema doğrulaması XSD ile yapılır, DTD ile değil.
 */

/* Yorumları çıkarıp `<!DOCTYPE`yi yorum içine gizlemeyi engellemek için
   önce yorumlar siliniyor; sonra bildirim aranıyor. */
function xmlYorumlariniSil(metin: string): string {
  return metin.replace(/<!--[\s\S]*?-->/g, '')
}

export function validateXmlFile(buffer: Buffer): void {
  if (buffer.length === 0) {
    throw new FileValidationError('Dosya boş', 422)
  }
  if (buffer.length > MAX_XML_BYTES) {
    throw new FileValidationError(
      `XML dosyası ${Math.floor(MAX_XML_BYTES / 1024 / 1024)} MB sınırını aşıyor`,
      413
    )
  }
  if (buffer.includes(0x00)) {
    throw new FileValidationError('Binary veri içeren dosya XML olarak kabul edilmez', 415)
  }

  const ham = buffer.toString('utf-8')
  const metin = xmlYorumlariniSil(ham)

  if (/<!DOCTYPE/i.test(metin)) {
    throw new FileValidationError(
      'DTD içeren XML kabul edilmiyor. e-Fatura belgelerinde DTD bulunmaz.',
      415
    )
  }
  /* DOCTYPE dışında ENTITY bildirimi teknik olarak geçersizdir, ama
     kapıyı tek bir desene bağlamamak için ayrıca aranıyor. */
  if (/<!ENTITY/i.test(metin)) {
    throw new FileValidationError('Varlık (ENTITY) bildirimi içeren XML kabul edilmiyor', 415)
  }

  /*
   * Biçim doğruluğu. `validateJsonFile`'daki desenin aynısı: burada
   * ayrıştırılamayan dosya, ileride sessizce boş sonuç üretmek yerine
   * yükleme anında reddedilsin.
   */
  const dogrulama = XMLValidator.validate(metin, { allowBooleanAttributes: true })
  if (dogrulama !== true) {
    throw new FileValidationError('Geçersiz XML dosyası: biçim hatalı', 422)
  }
}

export interface ZipInspectionResult {
  valid: boolean
  entryCount: number
  hasContentTypesXml: boolean
  hasWordDocumentXml: boolean
  hasEncryptedEntries: boolean
  hasTraversalEntries: boolean
  totalUncompressedSize: number
  maxSingleEntrySize: number
  error?: string
}

export function inspectZip(buffer: Buffer): ZipInspectionResult {
  if (!isZip(buffer)) {
    return { valid: false, entryCount: 0, hasContentTypesXml: false, hasWordDocumentXml: false, hasEncryptedEntries: false, hasTraversalEntries: false, totalUncompressedSize: 0, maxSingleEntrySize: 0, error: 'Geçersiz ZIP imzası' }
  }

  const eocd = findEOCD(buffer)
  if (!eocd) {
    return { valid: false, entryCount: 0, hasContentTypesXml: false, hasWordDocumentXml: false, hasEncryptedEntries: false, hasTraversalEntries: false, totalUncompressedSize: 0, maxSingleEntrySize: 0, error: 'ZIP EOCD bulunamadı' }
  }

  const totalEntries = eocd.readUInt16LE(8)
  const cdOffset = eocd.readUInt32LE(16)
  const cdSize = eocd.readUInt32LE(12)

  if (totalEntries > MAX_ZIP_ENTRIES) {
    return { valid: false, entryCount: totalEntries, hasContentTypesXml: false, hasWordDocumentXml: false, hasEncryptedEntries: false, hasTraversalEntries: false, totalUncompressedSize: 0, maxSingleEntrySize: 0, error: `Çok fazla ZIP entry: ${totalEntries} (maks: ${MAX_ZIP_ENTRIES})` }
  }

  if (cdOffset + cdSize > buffer.length) {
    return { valid: false, entryCount: totalEntries, hasContentTypesXml: false, hasWordDocumentXml: false, hasEncryptedEntries: false, hasTraversalEntries: false, totalUncompressedSize: 0, maxSingleEntrySize: 0, error: 'ZIP yapısı bozuk' }
  }

  let hasContentTypesXml = false
  let hasWordDocumentXml = false
  let hasEncryptedEntries = false
  let hasTraversalEntries = false
  let totalUncompressedSize = 0
  let maxSingleEntrySize = 0
  let pos = cdOffset

  for (let i = 0; i < totalEntries; i++) {
    if (pos + 46 > buffer.length) break

    const sig = buffer.readUInt32LE(pos)
    if (sig !== 0x02014b50) break

    const compressionMethod = buffer.readUInt16LE(pos + 10)
    const flags = buffer.readUInt16LE(pos + 8)
    const uncompressedSize = buffer.readUInt32LE(pos + 24)
    const compressedSize = buffer.readUInt32LE(pos + 20)
    const nameLen = buffer.readUInt16LE(pos + 28)
    const extraLen = buffer.readUInt16LE(pos + 30)
    const commentLen = buffer.readUInt16LE(pos + 32)

    const nameBuf = buffer.subarray(pos + 46, pos + 46 + nameLen)
    const name = nameBuf.toString('utf-8')

    if ((flags & 1) !== 0) {
      hasEncryptedEntries = true
    }

    if (name.includes('..') || name.startsWith('/') || name.includes('\\')) {
      hasTraversalEntries = true
    }

    totalUncompressedSize += uncompressedSize
    if (uncompressedSize > maxSingleEntrySize) {
      maxSingleEntrySize = uncompressedSize
    }

    if (compressedSize > 0 && uncompressedSize > 0) {
      const ratio = uncompressedSize / compressedSize
      if (ratio > MAX_COMPRESSION_RATIO) {
        return { valid: false, entryCount: totalEntries, hasContentTypesXml, hasWordDocumentXml, hasEncryptedEntries, hasTraversalEntries, totalUncompressedSize, maxSingleEntrySize, error: `Aşırı sıkıştırma oranı: ${Math.round(ratio)}x` }
      }
    }

    if (name === '[Content_Types].xml') hasContentTypesXml = true
    if (name === 'word/document.xml') hasWordDocumentXml = true

    pos += 46 + nameLen + extraLen + commentLen
  }

  if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED) {
    return { valid: false, entryCount: totalEntries, hasContentTypesXml, hasWordDocumentXml, hasEncryptedEntries, hasTraversalEntries, totalUncompressedSize, maxSingleEntrySize, error: `Toplam açılmış boyut sınırı aşıldı: ${totalUncompressedSize} bayt` }
  }

  if (maxSingleEntrySize > MAX_SINGLE_ENTRY_UNCOMPRESSED) {
    return { valid: false, entryCount: totalEntries, hasContentTypesXml, hasWordDocumentXml, hasEncryptedEntries, hasTraversalEntries, totalUncompressedSize, maxSingleEntrySize, error: `Tek entry boyutu sınırı aşıldı: ${maxSingleEntrySize} bayt` }
  }

  if (hasEncryptedEntries) {
    return { valid: false, entryCount: totalEntries, hasContentTypesXml, hasWordDocumentXml, hasEncryptedEntries, hasTraversalEntries, totalUncompressedSize, maxSingleEntrySize, error: 'Şifreli ZIP dosyaları desteklenmez' }
  }

  if (hasTraversalEntries) {
    return { valid: false, entryCount: totalEntries, hasContentTypesXml, hasWordDocumentXml, hasEncryptedEntries, hasTraversalEntries, totalUncompressedSize, maxSingleEntrySize, error: 'ZIP dosyası güvensiz entry içeriyor' }
  }

  return {
    valid: true,
    entryCount: totalEntries,
    hasContentTypesXml,
    hasWordDocumentXml,
    hasEncryptedEntries,
    hasTraversalEntries,
    totalUncompressedSize,
    maxSingleEntrySize
  }
}

function findEOCD(buffer: Buffer): Buffer | null {
  for (let i = buffer.length - 22; i >= 0; i--) {
    if (buffer[i] === 0x50 && buffer[i + 1] === 0x4B &&
        buffer[i + 2] === 0x05 && buffer[i + 3] === 0x06) {
      return buffer.subarray(i, i + 22)
    }
  }
  return null
}

export class FileValidationError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'FileValidationError'
    this.statusCode = statusCode
  }
}
