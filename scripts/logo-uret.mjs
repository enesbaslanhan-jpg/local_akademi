/*
 * LOGO PNG ÜRETİCİSİ
 *
 * Kaynak tek: `frontend/src/components/ui/BrandMark.jsx` içindeki
 * çizim. Burada SVG olarak yeniden kuruluyor çünkü React bileşeni
 * build çıktısına giriyor, dosya olarak dışa açılmıyor.
 *
 * 🔴 BRANDMARK DEĞİŞİRSE BURASI DA ELLE GÜNCELLENMELİ.
 * `frontend/public/favicon.svg` de aynı kısıtı taşıyor ve kendi
 * başlığında bunu yazıyor; üç kopya bilerek var, çünkü üçü farklı
 * tüketiciye hizmet ediyor (React, statik favicon, harici panel).
 *
 * Renkler bilerek SABİT: marka işareti tema ile dönmemeli.
 *
 * Çalıştırma:  node scripts/logo-uret.mjs
 * Çıktı:       C:/.../scratchpad/logo/*.png
 */
import fs from 'node:fs'
import path from 'node:path'
import { Resvg } from '@resvg/resvg-js'

/** Marka işaretinin çizimi — 40×40 kutu içinde. */
function isaret(idOnek) {
  return `
  <defs>
    <linearGradient id="${idOnek}-govde" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#28616F"/>
      <stop offset="1" stop-color="#14384A"/>
    </linearGradient>
    <linearGradient id="${idOnek}-kenar" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.92"/>
      <stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#94CEED" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <rect width="40" height="40" rx="11" fill="url(#${idOnek}-govde)"/>
  <rect x="0.9" y="0.9" width="38.2" height="38.2" rx="10.2" fill="none"
        stroke="url(#${idOnek}-kenar)" stroke-width="1.4"/>
  <path d="M28.5 12.5a11 11 0 1 0 0 15" stroke="#F4FAFC" stroke-width="2.4"
        stroke-linecap="round" fill="none"/>
  <path d="M20 11.5 24.5 20 20 28.5 15.5 20Z" fill="#E0A455"/>
  <circle cx="20" cy="20" r="2.1" fill="#F4FAFC"/>`
}

/** Yalnız ikon — kare, saydam zemin. */
const IKON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" fill="none">${isaret('ik')}</svg>`

/*
 * Yatay logo — ikon + kelime işareti.
 *
 * 300×100 PayTR'nin üst sınırı. İkon 64px, sola 18px boşluk; yazı
 * optik olarak ortalanıyor (harflerin görsel ağırlığı çizgisel
 * ortadan biraz yukarıda kalıyor).
 *
 * ⚠️ Yazı tipi GÖMÜLÜ DEĞİL: resvg sistemdeki fontları kullanıyor.
 * Sans-serif yığını veriliyor; harici panelde tam aynı görünmesi
 * gerekiyorsa yazı outline'a çevrilmeli. Bugünkü ihtiyaç (mağaza
 * paneli logosu) için gerekli değil.
 */
function yatay({ yaziRengi }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100" width="300" height="100" fill="none">
  <g transform="translate(18,18) scale(1.6)">${isaret('yt')}</g>
  <text x="100" y="58" font-family="Segoe UI, Inter, Helvetica, Arial, sans-serif"
        font-size="30" font-weight="600" fill="${yaziRengi}" letter-spacing="-0.4">LocalKarar</text>
</svg>`
}

const CIKTI = 'C:/Users/bugrz/AppData/Local/Temp/claude/C--Users-bugrz/3f8be9dc-10a2-46b6-b0d9-f9ad6342e8ed/scratchpad/logo'
fs.mkdirSync(CIKTI, { recursive: true })

function yaz(ad, svg, genislik) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: genislik } }).render().asPng()
  const yol = path.join(CIKTI, ad)
  fs.writeFileSync(yol, png)
  console.log(`${ad.padEnd(28)} ${String(png.length).padStart(7)} bayt`)
  return yol
}

yaz('localkarar-ikon-512.png', IKON, 512)
yaz('localkarar-ikon-1024.png', IKON, 1024)
/* Koyu zeminli panellerde okunması için açık yazılı sürüm de var. */
yaz('localkarar-logo-300x100.png', yatay({ yaziRengi: '#14384A' }), 300)
yaz('localkarar-logo-300x100-koyu-zemin.png', yatay({ yaziRengi: '#F4FAFC' }), 300)

console.log('\nklasör:', CIKTI)
