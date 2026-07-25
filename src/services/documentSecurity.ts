import { z } from 'zod'

export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const MAX_EXTRACTED_TEXT_LENGTH = 100000
export const MAX_QUESTION_LENGTH = 2000
export const MAX_ZIP_ENTRIES = 100
export const MAX_TOTAL_UNCOMPRESSED = 100 * 1024 * 1024
export const MAX_SINGLE_ENTRY_UNCOMPRESSED = 50 * 1024 * 1024
export const MAX_COMPRESSION_RATIO = 100

export const ALLOWED_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'docx'])
export const ALLOWED_MIME_MAP: Record<string, string> = {
  'txt': 'text/plain',
  'md': 'text/markdown',
  'csv': 'text/csv',
  'json': 'application/json',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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

  if (isJson(buffer)) {
    return { valid: true, detectedType: 'json' }
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
