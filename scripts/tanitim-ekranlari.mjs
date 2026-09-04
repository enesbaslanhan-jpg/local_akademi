import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

/*
 * TANITIM SAYFASI EKRAN GÖRÜNTÜLERİNİ ÇEKER.
 *
 * Mevcut dosyalar 3200x2000 (16:10, 2x). Aynı ölçüyü koruyoruz; oran
 * değişirse `/hakkinda` modül kartlarında yükseklik sıçraması olur.
 *
 * ⚠️ PAROLA BU BETİĞE GİRİLMEZ VE SAKLANMAZ.
 * Kalıcı bir tarayıcı profili açılır, GİRİŞİ SEN yaparsın, betik girişi
 * bekler. Profil `.playwright-profil/` altında kalır; ikinci çalıştırmada
 * oturum açık olduğu için giriş beklemeden doğrudan çeker.
 *
 * Kullanım:
 *   node scripts/tanitim-ekranlari.mjs
 *   node scripts/tanitim-ekranlari.mjs --adres=http://localhost:5173
 */

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PROFIL = path.join(kok, '.playwright-profil')
const HEDEF = path.join(kok, 'frontend', 'public', 'about-screens')

const adresArg = process.argv.find((a) => a.startsWith('--adres='))?.split('=')[1]
const TABAN = adresArg ?? 'http://localhost:5173'

/* Genişlik/yükseklik CSS pikseli; `deviceScaleFactor: 2` ile 3200x2000
   çıkar. Mevcut dosyaların ölçüsü bu. */
const GENISLIK = 1600
const YUKSEKLIK = 1000

const EKRANLAR = [
  { dosya: 'karar-araclari.png', yol: '/app/decision-checks' },
  { dosya: 'isletme-takibi.png', yol: '/app/workspaces' },
  { dosya: 'ai-mentor.png', yol: '/app/mentor' },
  { dosya: 'hesaplamalar.png', yol: '/app/calculations' },
  { dosya: 'kurslar.png', yol: '/app/courses' },
  { dosya: 'topluluk.png', yol: '/app/community/topluluk' },
]

/*
 * Çekimden önce gizlenecek öğeler.
 *
 * Doğrulama şeridi ve çerez bandı tanıtım görselinde gürültü; ürünün
 * kendisiyle ilgisi yok. Mentor balonu her ekranın sağ altında duruyor ve
 * altı görselde de aynı yerde tekrarlanınca kolajda göze batıyor.
 */
const GIZLE = `
  [class*="verifyBanner"], [class*="dogrulaBanner"],
  [class*="cookie"], [class*="cerez"],
  [class*="mentorLauncher"], [class*="mentorFab"] { display: none !important; }
`

async function bekleGiris(sayfa) {
  if (sayfa.url().includes('/app/')) return
  console.log('\n  Tarayıcı açıldı. GİRİŞ YAP, sonra bu pencereyi açık bırak.')
  console.log('  Giriş algılanınca çekim kendiliğinden başlayacak (10 dk bekler).\n')
  await sayfa.waitForURL(/\/app\//, { timeout: 10 * 60 * 1000 })
  console.log('  Giriş algılandı.\n')
}

async function main() {
  fs.mkdirSync(HEDEF, { recursive: true })

  const baglam = await chromium.launchPersistentContext(PROFIL, {
    headless: false,
    viewport: { width: GENISLIK, height: YUKSEKLIK },
    deviceScaleFactor: 2,
    locale: 'tr-TR',
  })

  const sayfa = baglam.pages()[0] ?? (await baglam.newPage())
  await sayfa.goto(`${TABAN}/app/dashboard`, { waitUntil: 'domcontentloaded' })
  await bekleGiris(sayfa)

  for (const ekran of EKRANLAR) {
    await sayfa.goto(TABAN + ekran.yol, { waitUntil: 'networkidle' })
    await sayfa.addStyleTag({ content: GIZLE })
    /* Ağ boşa çıksa da liste ve grafikler bir kare sonra yerleşiyor. */
    await sayfa.waitForTimeout(1500)

    const cikti = path.join(HEDEF, ekran.dosya)
    await sayfa.screenshot({ path: cikti })
    const boyut = fs.statSync(cikti).size
    console.log(`  ${ekran.dosya.padEnd(22)} ${ekran.yol.padEnd(30)} ${(boyut / 1024).toFixed(0)} KB`)
  }

  await baglam.close()
  console.log(`\nBitti. Dosyalar: ${HEDEF}`)
  console.log('Önbellek damgasını yükseltmeyi unutma (EkranCizimi.jsx içindeki ?v=).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
