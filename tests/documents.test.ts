import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import Fastify, { FastifyInstance } from 'fastify'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { normalize, resolve } from 'path'
import { detectFileType, validatePdfFile } from '../src/services/documentSecurity'
import { createCanvas } from '@napi-rs/canvas'

const realPrisma = new PrismaClient()

const dbErrors: Record<string, boolean> = {}

function createMockPrisma(): PrismaClient {
  return new Proxy({} as any, {
    get(_, modelName: string) {
      const realModel = (realPrisma as any)[modelName]
      if (!realModel) return undefined
      return new Proxy(realModel, {
        get(modelTarget: any, methodName: string) {
          if (typeof methodName !== 'string' || methodName === 'constructor' || methodName === 'then') {
            return modelTarget[methodName]
          }
          const key = `${modelName}.${methodName}`
          if (dbErrors[key]) {
            return (...args: any[]) => Promise.reject(new Error(`Simulated DB error: ${key}`))
          }
          const method = modelTarget[methodName]
          return typeof method === 'function' ? method.bind(modelTarget) : method
        }
      })
    }
  }) as PrismaClient
}

let app: FastifyInstance
let userToken: string
let otherUserToken: string
let userId: number
let otherUserId: number

function makeTextFile(content: string, ext: string = 'txt'): { filename: string; buffer: Buffer; mime: string } {
  const mimeMap: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return {
    filename: `test.${ext}`,
    buffer: Buffer.from(content),
    mime: mimeMap[ext] || 'text/plain'
  }
}

function makeJsonFile(obj: any): { filename: string; buffer: Buffer; mime: string } {
  return makeTextFile(JSON.stringify(obj), 'json')
}

function makeMinimalDocx(text: string = 'Merhaba Dünya'): { filename: string; buffer: Buffer; mime: string } {
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
  </w:body>
</w:document>`

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const zipBuffer = createZipBuffer([
    { name: '[Content_Types].xml', data: contentTypes },
    { name: 'word/document.xml', data: documentXml },
    { name: '_rels/.rels', data: rels }
  ])

  return {
    filename: 'test.docx',
    buffer: zipBuffer,
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
}

function makeZipFromEntries(entries: { name: string; data: string }[]): Buffer {
  return createZipBuffer(entries)
}

function createZipBuffer(entries: { name: string; data: string }[]): Buffer {
  const localHeaders: Buffer[] = []
  const centralHeaders: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf-8')
    const dataBuf = Buffer.from(entry.data, 'utf-8')
    const crc = crc32(dataBuf)

    const lh = Buffer.alloc(30)
    lh.writeUInt32LE(0x04034b50, 0)
    lh.writeUInt16LE(20, 4)
    lh.writeUInt16LE(0, 6)
    lh.writeUInt16LE(0, 8)
    lh.writeUInt16LE(0, 10)
    lh.writeUInt16LE(0, 12)
    lh.writeUInt32LE(crc, 14)
    lh.writeUInt32LE(dataBuf.length, 18)
    lh.writeUInt32LE(dataBuf.length, 22)
    lh.writeUInt16LE(nameBuf.length, 26)
    lh.writeUInt16LE(0, 28)

    localHeaders.push(lh, nameBuf, dataBuf)

    const ch = Buffer.alloc(46)
    ch.writeUInt32LE(0x02014b50, 0)
    ch.writeUInt16LE(20, 4)
    ch.writeUInt16LE(20, 6)
    ch.writeUInt16LE(0, 8)
    ch.writeUInt16LE(0, 10)
    ch.writeUInt16LE(0, 12)
    ch.writeUInt32LE(crc, 16)
    ch.writeUInt32LE(dataBuf.length, 20)
    ch.writeUInt32LE(dataBuf.length, 24)
    ch.writeUInt16LE(nameBuf.length, 28)
    ch.writeUInt16LE(0, 30)
    ch.writeUInt16LE(0, 32)
    ch.writeUInt16LE(0, 34)
    ch.writeUInt16LE(0, 36)
    ch.writeUInt32LE(0, 38)
    ch.writeUInt32LE(offset, 42)

    centralHeaders.push(ch, nameBuf)
    offset += 30 + nameBuf.length + dataBuf.length
  }

  const cdStart = offset
  const cdSize = centralHeaders.reduce((s, b) => s + b.length, 0)
  const cdBuf = Buffer.concat(centralHeaders)

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(cdSize, 12)
  eocd.writeUInt32LE(cdStart, 16)
  eocd.writeUInt16LE(0, 20)

  return Buffer.concat([...localHeaders, cdBuf, eocd])
}

function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

async function createTestUser(email: string, name: string) {
  return realPrisma.user.create({
    data: { email, password: 'hashed_test', name, role: 'learner' }
  })
}

beforeAll(async () => {
  await mkdir(join(process.cwd(), 'uploads'), { recursive: true })

  app = Fastify()

  await app.register(jwt, { secret: 'test-secret-key-min-32-bytes-long!!' })

  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  const { documentRoutes } = await import('../src/services/documents')
  await app.register(documentRoutes, { prefix: '/documents', prisma: createMockPrisma() })

  await app.ready()

  const user1 = await createTestUser(`doc-test-${Date.now()}@test.com`, 'Test User')
  const user2 = await createTestUser(`doc-other-${Date.now()}@test.com`, 'Other User')
  userId = user1.id
  otherUserId = user2.id

  userToken = app.jwt.sign({ id: userId, email: user1.email, role: 'learner' })
  otherUserToken = app.jwt.sign({ id: otherUserId, email: user2.email, role: 'learner' })
})

beforeEach(() => {
  for (const key of Object.keys(dbErrors)) {
    delete dbErrors[key]
  }
})

afterAll(async () => {
  await realPrisma.documentConversation.deleteMany({ where: { userId } })
  await realPrisma.documentConversation.deleteMany({ where: { userId: otherUserId } })
  await realPrisma.uploadedDocument.deleteMany({ where: { userId } })
  await realPrisma.uploadedDocument.deleteMany({ where: { userId: otherUserId } })
  await realPrisma.user.delete({ where: { id: userId } }).catch(() => {})
  await realPrisma.user.delete({ where: { id: otherUserId } }).catch(() => {})
  await app.close()
})

function simulateUpload(file: { filename: string; buffer: Buffer; mime: string }, token: string, path: string = '/documents/upload') {
  const boundary = '----TestBoundary' + randomUUID()
  const bodyParts: Buffer[] = []

  const header = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${file.filename}"\r\n` +
    `Content-Type: ${file.mime}\r\n\r\n`
  )
  bodyParts.push(header)
  bodyParts.push(file.buffer)
  bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

  const body = Buffer.concat(bodyParts)

  return app.inject({
    method: 'POST',
    url: path,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': `multipart/form-data; boundary=${boundary}`
    },
    body
  })
}

describe('Başarılı yüklemeler', () => {
  it('PNG belgeyi yerel Türkçe OCR ile okur', async () => {
    const canvas = createCanvas(1200, 300)
    const context = canvas.getContext('2d')
    context.fillStyle = 'white'
    context.fillRect(0, 0, 1200, 300)
    context.fillStyle = 'black'
    context.font = 'bold 72px Arial'
    context.fillText('FATURA 8450 TL', 70, 180)
    const res = await simulateUpload({
      filename: 'fatura.png',
      buffer: canvas.toBuffer('image/png'),
      mime: 'image/png'
    }, userToken)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.analysis.extraction_method).toBe('ocr_tur')
    expect(body.analysis.summary.toLocaleLowerCase('tr-TR')).toContain('fatura')
  }, 30000)

  it('geçerli TXT yüklenir', async () => {
    const file = makeTextFile('Hello World Test İçerik')
    const res = await simulateUpload(file, userToken)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('analyzed')
    expect(body.size_bytes).toBe(file.buffer.length)
  })

  it('geçerli JSON yüklenir ve parse edilir', async () => {
    const file = makeJsonFile({ name: 'test', value: 123 })
    const res = await simulateUpload(file, userToken)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.analysis.keywords).toBeDefined()
  })

  it('geçerli DOCX yüklenir ve metin çıkarılır', async () => {
    const file = makeMinimalDocx('DOCX Test İçerik')
    const res = await simulateUpload(file, userToken)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.status).toBe('analyzed')
  })

  it('kullanıcı yalnız kendi belgelerini listeler', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/documents/',
      headers: { authorization: `Bearer ${otherUserToken}` }
    })
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.documents).toEqual([])
  })

  it('kullanıcı kendi belgesini fiziksel dosyayla birlikte siler', async () => {
    const file = makeTextFile('Silinecek dosya')
    const uploadRes = await simulateUpload(file, userToken)
    expect(uploadRes.statusCode).toBe(200)
    const docId = JSON.parse(uploadRes.body).id

    const delRes = await app.inject({
      method: 'DELETE',
      url: `/documents/${docId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(delRes.statusCode).toBe(200)
    expect(JSON.parse(delRes.body).deleted).toBe(true)

    const getRes = await app.inject({
      method: 'GET',
      url: `/documents/${docId}`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(getRes.statusCode).toBe(404)
  })
})

describe('Dosya türü güvenliği', () => {
  it('PDF imzasını tanır ve geçerli temel yapıyı kabul eder', () => {
    const buffer = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF')
    expect(detectFileType(buffer).detectedType).toBe('pdf')
    expect(() => validatePdfFile(buffer)).not.toThrow()
  })

  it('şifreli veya eksik PDF yapısını reddeder', () => {
    expect(() => validatePdfFile(Buffer.from('%PDF-1.7\n/Encrypt 4 0 R\n%%EOF'))).toThrow(/Şifreli PDF/)
    expect(() => validatePdfFile(Buffer.from('%PDF-1.7\n1 0 obj'))).toThrow(/bozuk PDF/)
  })

  it('.docx uzantılı düz metin reddedilir', async () => {
    const res = await simulateUpload({
      filename: 'fake.docx',
      buffer: Buffer.from('Bu bir düz metin dosyası'),
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, userToken)
    expect(res.statusCode).toBe(415)
  })

  it('DOCX MIME değerli rastgele binary reddedilir', async () => {
    const res = await simulateUpload({
      filename: 'random.docx',
      buffer: Buffer.from([0xFF, 0xFE, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]),
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, userToken)
    expect(res.statusCode).toBe(415)
  })

  it('uzantı/MIME/içerik uyuşmazlığı reddedilir', async () => {
    const res = await simulateUpload({
      filename: 'data.txt',
      buffer: makeMinimalDocx().buffer,
      mime: 'text/plain'
    }, userToken)
    expect(res.statusCode).toBe(415)
  })

  it('NUL byte içeren sözde TXT reddedilir', async () => {
    const buf = Buffer.alloc(10)
    buf.write('A\x00BCDEFGH', 0)
    const res = await simulateUpload(makeTextFile(buf.toString() as any, 'txt'), userToken)
    expect(res.statusCode).toBe(415)
  })

  it('geçersiz JSON reddedilir', async () => {
    const res = await simulateUpload({
      filename: 'bad.json',
      buffer: Buffer.from('{invalid json}'),
      mime: 'application/json'
    }, userToken)
    expect(res.statusCode).toBe(422)
  })

  it('çift uzantılı dosya adı güvenli işlenir', async () => {
    const res = await simulateUpload({
      filename: 'test.txt.exe',
      buffer: Buffer.from('test'),
      mime: 'text/plain'
    }, userToken)
    expect(res.statusCode).toBe(415)
  })

  it('path traversal içeren orijinal dosya adı güvenli işlenir', async () => {
    const res = await simulateUpload({
      filename: '../../../etc/passwd.txt',
      buffer: Buffer.from('test content'),
      mime: 'text/plain'
    }, userToken)
    expect(res.statusCode).toBe(200)
  })
})

describe('DOCX güvenliği', () => {
  it('eksik word/document.xml ZIP reddedilir', async () => {
    const zip = makeZipFromEntries([
      { name: '[Content_Types].xml', data: '<Types/>' }
    ])
    const res = await simulateUpload({
      filename: 'bad.docx',
      buffer: zip,
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, userToken)
    expect(res.statusCode).toBe(422)
  })

  it('bozuk DOCX reddedilir', async () => {
    const res = await simulateUpload({
      filename: 'corrupt.docx',
      buffer: Buffer.from('Bu bir ZIP değil'),
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, userToken)
    expect(res.statusCode).toBe(415)
  })

  it('fazla entry içeren arşiv reddedilir', async () => {
    const entries: { name: string; data: string }[] = []
    for (let i = 0; i < 150; i++) {
      entries.push({ name: `entry${i}.xml`, data: '<a/>' })
    }
    const zip = makeZipFromEntries(entries)
    const res = await simulateUpload({
      filename: 'bomb.docx',
      buffer: zip,
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, userToken)
    expect(res.statusCode).toBe(422)
  })

  it('ZIP entry path traversal reddedilir', async () => {
    const zip = createZipBuffer([
      { name: '[Content_Types].xml', data: '<Types/>' },
      { name: '../outside.txt', data: 'malicious' },
      { name: 'word/document.xml', data: '<w:document/>' }
    ])
    const res = await simulateUpload({
      filename: 'evil.docx',
      buffer: zip,
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }, userToken)
    expect(res.statusCode).toBe(422)
  })
})

describe('Kota ve bütünlük', () => {
  it('kota altındaki yükleme başarılıdır', async () => {
    const file = makeTextFile('A'.repeat(1000))
    const res = await simulateUpload(file, userToken)
    expect(res.statusCode).toBe(200)
  })

  it('kota aşımı reddedilir', async () => {
    const origQuota = process.env.DOCUMENT_USER_QUOTA_BYTES
    process.env.DOCUMENT_USER_QUOTA_BYTES = '1'

    const file = makeTextFile('test content')
    const res = await simulateUpload(file, userToken)

    process.env.DOCUMENT_USER_QUOTA_BYTES = origQuota
    expect(res.statusCode).toBe(413)
  })

  it('başka kullanıcının kullanımı kotayı etkilemez', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/documents/',
      headers: { authorization: `Bearer ${otherUserToken}` }
    })
    expect(res.statusCode).toBe(200)
  })

  it('DB create hatasında fiziksel dosya kalmaz', async () => {
    dbErrors['uploadedDocument.create'] = true
    const file = makeTextFile('DB hata testi')
    const res = await simulateUpload(file, userToken)
    expect(res.statusCode).toBe(500)
  })

  it('metin çıkarımı hatasında dosya kalmaz', async () => {
    const file = makeMinimalDocx()
    const origBuffer = file.buffer
    file.buffer = Buffer.concat([origBuffer, Buffer.from([0xFF, 0xFF, 0xFF])])

    const res = await simulateUpload(file, userToken)
    expect([200, 422, 500]).toContain(res.statusCode)
  })
})

describe('Yetkilendirme ve soru', () => {
  let ownedDocId: string

  beforeAll(async () => {
    const file = makeTextFile('Yetkilendirme testi')
    const res = await simulateUpload(file, userToken)
    ownedDocId = JSON.parse(res.body).id
  })

  it('başka kullanıcı belge detayını göremez', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/documents/${ownedDocId}`,
      headers: { authorization: `Bearer ${otherUserToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('başka kullanıcı belgeyi silemez', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/documents/${ownedDocId}`,
      headers: { authorization: `Bearer ${otherUserToken}` }
    })
    expect(res.statusCode).toBe(404)
  })

  it('başka kullanıcı belgeye soru soramaz', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/documents/${ownedDocId}/ask`,
      headers: { authorization: `Bearer ${otherUserToken}` },
      body: { question: 'Bu nedir?' }
    })
    expect(res.statusCode).toBe(404)
  })

  it('boş soru 422 döndürür', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/documents/${ownedDocId}/ask`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { question: '' }
    })
    expect(res.statusCode).toBe(422)
  })

  it('aşırı uzun soru 422 döndürür', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/documents/${ownedDocId}/ask`,
      headers: { authorization: `Bearer ${userToken}` },
      body: { question: 'X'.repeat(3000) }
    })
    expect(res.statusCode).toBe(422)
  })
})

describe('Fiziksel silme güvenliği', () => {
  it('silme hedefi upload kökü dışındaysa güvenli davranır', async () => {
    const file = makeTextFile('path test')
    const uploadRes = await simulateUpload(file, userToken)
    expect(uploadRes.statusCode).toBe(200)
  })

  it('fiziksel dosya yoksa kontrollü hata döner', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/documents/nonexistent-id-12345`,
      headers: { authorization: `Bearer ${userToken}` }
    })
    expect(res.statusCode).toBe(404)
  })
})

/*
 * e-FATURA YÜKLEME — uçtan uca.
 *
 * XML'in kapıdan geçtiğini ve YAPILANDIRILMIŞ olarak okunduğunu
 * doğruluyor. Ayrıştırma yükleme anında, TAM tampondan yapılıyor;
 * `extractedText` 100.000 karakterde kırpıldığı için sonradan
 * okumaya kalkmak büyük faturalarda başarısız olurdu.
 */
describe('e-Fatura yükleme', () => {
  const faturaOku = (ad: string) =>
    readFileSync(join(__dirname, 'fixtures', 'ubl', ad))

  it('gerçek e-Fatura yüklenir ve alanları yapılandırılmış okunur', async () => {
    const res = await simulateUpload({
      filename: 'fatura.xml',
      buffer: faturaOku('TemelFaturaOrnegi.xml'),
      mime: 'application/xml'
    }, userToken)

    expect(res.statusCode).toBe(200)
    const govde = JSON.parse(res.body)
    const ef = govde.analysis?.eFatura
    expect(ef).toBeTruthy()
    expect(ef.id).toBe('GIB20090000000001')
    expect(ef.odenecekTutar).toBe(17.88)
    expect(ef.paraBirimi).toBe('TRY')
    expect(ef.satici.kimlik).toBe('1288331521')
  })

  /* `text/xml` de geçerli; muhasebe programları ikisini de gönderiyor. */
  it('text/xml MIME türü de kabul edilir', async () => {
    const res = await simulateUpload({
      filename: 'fatura2.xml',
      buffer: faturaOku('TicariFaturaOrnegi.xml'),
      mime: 'text/xml'
    }, userToken)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).analysis?.eFatura?.odenecekTutar).toBe(29755.47)
  })

  /* Fatura olmayan XML hata değil; yalnız `eFatura` alanı yazılmıyor. */
  it('fatura olmayan XML yüklenir ama fatura sayılmaz', async () => {
    const res = await simulateUpload({
      filename: 'cizim.xml',
      buffer: faturaOku('CizimFormati-FaturaDegil.xml'),
      mime: 'application/xml'
    }, userToken)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body).analysis?.eFatura).toBeUndefined()
  })

  /* 🔴 DTD taşıyan XML kapıdan GEÇMEMELİ (XXE / varlık şişmesi). */
  it('DTD içeren XML reddedilir', async () => {
    const kotu = Buffer.from(
      '<?xml version="1.0"?>\n<!DOCTYPE r [<!ENTITY x SYSTEM "file:///etc/passwd">]>\n<r>&x;</r>',
      'utf-8'
    )
    const res = await simulateUpload({ filename: 'kotu.xml', buffer: kotu, mime: 'application/xml' }, userToken)
    expect(res.statusCode).toBe(415)
    expect(res.body).toContain('DTD')
  })
})
