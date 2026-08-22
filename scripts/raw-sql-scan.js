/*
 * HAM SQL BEKÇİSİ
 *
 * 22.08.2026 denetiminde ölçüldü: `src/` altında `$queryRaw` /
 * `$executeRaw` kullanımı SIFIR. Prisma her sorguyu parametreleştirdiği
 * için uygulamada SQL injection yüzeyi yok.
 *
 * Bugün temiz olması yarın da temiz kalacağı anlamına GELMİYOR. Tek bir
 * `$queryRawUnsafe` çağrısı bu güvenceyi sessizce bitirir ve kod
 * incelemesinde gözden kaçması çok kolaydır — çünkü çalışır, test
 * geçer, hiçbir şey uyarmaz.
 *
 * Bu betik CI'da çalışıyor ve o çağrıyı yakalıyor.
 *
 * NEDEN "Unsafe" OLANLAR YASAK, DİĞERLERİ UYARI:
 *   `$queryRaw` etiketli şablon (tagged template) ile çağrılır ve
 *   Prisma değerleri PARAMETRE olarak gönderir — güvenlidir.
 *   `$queryRawUnsafe` ise düz string alır; içine kullanıcı verisi
 *   birleştirilirse injection doğrudan mümkündür. Ayrım budur.
 *
 * Kapsam `src/` ile SINIRLI. `scripts/` altındaki işletim betikleri
 * (yedekleme, göç, rol kurulumu) ham SQL kullanıyor ve kullanmak
 * zorunda; onlar kullanıcı girdisi almıyor, yönetici tarafından elle
 * çalıştırılıyor.
 */
const { readFileSync, readdirSync, statSync } = require('fs')
const { join, resolve, relative } = require('path')

const KOK = resolve(__dirname, '..')
const TARANAN = join(KOK, 'src')

/* Bu ikisi düz string alır: kullanıcı verisi birleştirilirse injection. */
const YASAK = [
  { kalip: /\$queryRawUnsafe\s*\(/g, ad: '$queryRawUnsafe' },
  { kalip: /\$executeRawUnsafe\s*\(/g, ad: '$executeRawUnsafe' },
]

/* Bunlar etiketli şablonla parametreleşir; yine de gözden geçirilsin. */
const UYARI = [
  { kalip: /\$queryRaw\s*[`(]/g, ad: '$queryRaw' },
  { kalip: /\$executeRaw\s*[`(]/g, ad: '$executeRaw' },
]

const bulgular = []
const uyarilar = []

function tara(dizin) {
  for (const ad of readdirSync(dizin)) {
    const yol = join(dizin, ad)
    const bilgi = statSync(yol)
    if (bilgi.isDirectory()) {
      if (ad === 'node_modules' || ad === 'dist') continue
      tara(yol)
      continue
    }
    if (!/\.(ts|js|mjs)$/.test(ad)) continue

    const metin = readFileSync(yol, 'utf8')
    const goreli = relative(KOK, yol).replace(/\\/g, '/')

    for (const { kalip, ad: cagri } of YASAK) {
      for (const eslesme of metin.matchAll(kalip)) {
        const satir = metin.slice(0, eslesme.index).split('\n').length
        bulgular.push({ yol: goreli, satir, cagri })
      }
    }
    for (const { kalip, ad: cagri } of UYARI) {
      for (const eslesme of metin.matchAll(kalip)) {
        const satir = metin.slice(0, eslesme.index).split('\n').length
        uyarilar.push({ yol: goreli, satir, cagri })
      }
    }
  }
}

tara(TARANAN)

for (const u of uyarilar) {
  console.log(`UYARI: ${u.yol}:${u.satir} — ${u.cagri} (etiketli şablonla kullanıldığı doğrulanmalı)`)
}

if (bulgular.length > 0) {
  console.error('\nHAM SQL TARAMASI BAŞARISIZ\n')
  for (const b of bulgular) {
    console.error(`  ${b.yol}:${b.satir} — ${b.cagri}`)
  }
  console.error(
    '\nBu çağrılar düz string alır; içine kullanıcı verisi birleştirilirse\n' +
    'SQL injection doğrudan mümkün olur. Prisma\'nın normal sorgu\n' +
    'yöntemlerini ya da etiketli şablonlu $queryRaw`...` biçimini kullanın.\n' +
    'Gerçekten zorunluysa bu betikte gerekçesiyle birlikte istisna tanımlayın.\n'
  )
  process.exit(1)
}

console.log(`Ham SQL taraması TEMİZ — src/ altında ${YASAK.map(y => y.ad).join(', ')} kullanımı yok`)
