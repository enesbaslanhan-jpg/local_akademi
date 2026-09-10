/*
 * YAZILIP OKUNMAYAN VERİ TARAMASI (şema-doğru sürüm).
 *
 * İlk sürüm ilişki adını modelden TAHMİN ediyordu (modelAssumption) ama
 * şemadaki alan çoğuldu (modelAssumptions) ve yedi model yanlışlıkla
 * "okunmuyor" göründü. Bu sürüm ilişki adlarını şemadan OKUYOR.
 */
const fs = require('fs')
const path = require('path')

function tsDosyalari(dizin, toplam = []) {
  for (const ad of fs.readdirSync(dizin)) {
    if (ad === 'node_modules') continue
    const yol = path.join(dizin, ad)
    if (fs.statSync(yol).isDirectory()) tsDosyalari(yol, toplam)
    else if (ad.endsWith('.ts')) toplam.push(yol)
  }
  return toplam
}

const sema = fs.readFileSync('prisma/schema.prisma', 'utf8')

/* Model gövdelerini ayır. */
const govdeler = new Map()
for (const m of sema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
  govdeler.set(m[1], m[2])
}
const modeller = [...govdeler.keys()]

/*
 * Her model için, ONA İŞARET EDEN ilişki alan adlarını topla: başka bir
 * modelde `alanAdi  BuModel` ya da `alanAdi  BuModel[]` biçiminde geçen
 * her alan, o modeli `include`la okumanın yoludur.
 */
const iliskiAdlari = new Map(modeller.map(m => [m, new Set()]))
for (const [, govde] of govdeler) {
  for (const satir of govde.split('\n')) {
    const alan = /^\s*(\w+)\s+(\w+)(\[\])?\s*(@|$)/.exec(satir)
    if (!alan) continue
    const [, alanAdi, tip] = alan
    if (iliskiAdlari.has(tip)) iliskiAdlari.get(tip).add(alanAdi)
  }
}

const kucuk = ad => ad.charAt(0).toLowerCase() + ad.slice(1)
const YAZMA = ['create', 'createMany', 'update', 'updateMany', 'upsert']
const OKUMA = ['findMany', 'findUnique', 'findFirst', 'findUniqueOrThrow', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy']

const kaynak = tsDosyalari('src').map(y => fs.readFileSync(y, 'utf8')).join('\n')

const bulgular = []
for (const model of modeller) {
  const ad = kucuk(model)
  if (!YAZMA.some(op => kaynak.includes(`${ad}.${op}(`))) continue
  if (OKUMA.some(op => kaynak.includes(`${ad}.${op}(`))) continue

  /* include/select üzerinden okunuyor mu — GERÇEK ilişki adlarıyla. */
  const yollar = [...iliskiAdlari.get(model)]
  const icerenYol = yollar.find(y => new RegExp(`\\b${y}\\s*:\\s*(true|\\{)`).test(kaynak))
  if (icerenYol) continue

  bulgular.push({ model, yollar })
}

if (bulgular.length === 0) {
  console.log('Yazılıp hiçbir yolla okunmayan model YOK.')
} else {
  console.log('YAZILIYOR AMA HİÇ OKUNMUYOR:\n')
  for (const b of bulgular) {
    console.log(`  ${b.model}`)
    console.log(`      okunabileceği ilişki adları: ${b.yollar.join(', ') || '(yok)'}`)
  }
}
