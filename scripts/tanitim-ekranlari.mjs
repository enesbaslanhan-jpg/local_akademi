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
 * Kalıcı bir tarayıcı profili açılır, GİRİŞİ SEN yaparsın. Profil
 * `.playwright-profil/` altında kalır; sonraki çalıştırmalarda oturum
 * açık olduğu için giriş adımı atlanır.
 *
 * 🔴 İKİ AŞAMA — VE SEBEBİ ÖNEMLİ.
 *
 * `deviceScaleFactor: 2` yalnız çıktıyı değil PENCEREYİ de 2x büyütüyor:
 * 1600x1000'lik sayfa ekranda 3200x2000 gibi çiziliyor ve kullanıcı
 * sayfanın yalnız sol üst çeyreğini dev boyutta görüyor. O pencerede
 * giriş yapmak mümkün değil (ölçüldü).
 *
 * Bu yüzden:
 *   1. aşama — normal ölçekte (1x) pencere açılır, giriş yapılır, kapanır.
 *   2. aşama — aynı profille headless + 2x bağlam açılır, çekim yapılır.
 * Oturum profilde durduğu için ikinci aşama giriş istemez.
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

const GENISLIK = 1600
const YUKSEKLIK = 1000

/*
 * `{ws}` calisma anini secilen ornek isletmenin id'siyle degistirilir.
 *
 * 🔴 ONCE `/app/workspaces` (liste ekrani) cekiliyordu ve tanitimda
 * yalnizca isletme adlari goruluyordu: kayitlar, urunler, siparisler,
 * entegrasyon -- hicbiri o ekranda yok. Asil veri isletme ICI
 * sayfalarinda; `isletme-takibi.png` artik Genel Bakis'tan cekiliyor.
 */
const EKRANLAR = [
  { dosya: 'karar-araclari.png', yol: '/app/decision-checks' },
  { dosya: 'isletme-takibi.png', yol: '/app/workspaces/{ws}/overview' },
  { dosya: 'ai-mentor.png', yol: '/app/mentor' },
  { dosya: 'hesaplamalar.png', yol: '/app/calculations' },
  { dosya: 'kurslar.png', yol: '/app/courses' },
  { dosya: 'topluluk.png', yol: '/app/community/topluluk' },
]

/*
 * Çekimden önce gizlenecek öğeler: doğrulama şeridi ve çerez bandı
 * ürünle ilgisiz gürültü; mentor balonu altı görselde de aynı köşede
 * tekrarlanıp kolajda göze batıyor.
 */
/*
 * 🔴 ILK SURUMDE SECICILER TAHMINDI VE HICBIRI TUTMADI — cekilen alti
 * gorselde de dogrulama seridi, cerez bandi ve mentor balonu duruyordu.
 *
 * Gercek adlar canli DOM'dan okundu. CSS modulu deseni: `_ad_hash_satir`.
 *   VerificationBanner.jsx -> styles.banner   -> [class*="_banner_"]
 *   MentorLauncher.jsx     -> styles.launcher -> [class*="_launcher_"]
 *
 * Cerez bandi CSS ile degil, gosterimini kontrol eden localStorage
 * anahtariyla bastiriliyor (asagida `addInitScript`): bant kapatildiginda
 * zaten o anahtar yaziliyor, biz de cekimden once yaziyoruz.
 */
const GIZLE = `
  [class*="_banner_"], [class*="_launcher_"] { display: none !important; }
`

/** Depolama bildirimini gorulmus say — cerez bandi acilmaz.
 *  🔴 Deger '1' DEGIL 'true' olmali; StorageNotice tam esitlik ariyor
 *  (StorageNotice.test.jsx bunu dogruluyor). '1' yazdigimda bant
 *  cikmaya devam etti. */
const BILDIRIM_BASTIR = () => {
  try { localStorage.setItem('localkarar-storage-notice-seen', 'true') } catch {}
}

/** Profilde geçerli oturum var mı? Headless deneyip URL'ye bakıyoruz. */
async function oturumVar() {
  const b = await chromium.launchPersistentContext(PROFIL, {
    headless: true,
    viewport: { width: GENISLIK, height: YUKSEKLIK },
    locale: 'tr-TR',
  })
  try {
    const s = b.pages()[0] ?? (await b.newPage())
    await s.goto(`${TABAN}/app/dashboard`, { waitUntil: 'domcontentloaded' })
    await s.waitForTimeout(1200)
    return s.url().includes('/app/')
  } finally {
    await b.close()
  }
}

/** 1. aşama: normal ölçekte pencere, kullanıcı giriş yapar. */
async function girisAsamasi() {
  const b = await chromium.launchPersistentContext(PROFIL, {
    headless: false,
    /* 1x — pencere okunur boyutta olsun diye. */
    viewport: null,
    locale: 'tr-TR',
    args: ['--window-size=1400,900'],
  })
  const s = b.pages()[0] ?? (await b.newPage())
  await s.goto(`${TABAN}/login`, { waitUntil: 'domcontentloaded' })

  console.log('\n  Tarayıcı açıldı. GİRİŞ YAP.')
  console.log('  Giriş algılanınca pencere kapanacak ve çekim başlayacak.')
  console.log('  (10 dakika bekler)\n')

  await s.waitForURL(/\/app\//, { timeout: 10 * 60 * 1000 })
  await s.waitForTimeout(1500) /* Oturum diske yazılsın. */
  await b.close()
  console.log('  Giriş alındı, pencere kapatıldı.\n')
}

/**
 * En dolu ornek isletmenin id'sini bulur.
 *
 * Id'ler her `seed-tanitim` calismasinda degistigi icin sabit yazilamaz.
 * API sozlesmesi yerine ARAYUZ uzerinden bulunuyor: liste ekranindaki ilk
 * isletmeye tiklanip olusan adresten okunuyor. Boylece uc degisse bile
 * betik calismaya devam eder.
 */
async function isletmeIdBul(s) {
  await s.goto(`${TABAN}/app/workspaces`, { waitUntil: 'domcontentloaded' })
  await s.waitForTimeout(2500)

  const bag = s.locator('a[href*="/app/workspaces/"]').first()
  if ((await bag.count()) > 0) {
    const href = await bag.getAttribute('href')
    const m = href?.match(/\/app\/workspaces\/([^/?#]+)/)
    if (m) return m[1]
  }

  /* Bagalanti yoksa kart tiklanabilir olabilir. */
  const kart = s.locator('[class*="_card_"], article, li').filter({ hasText: /üye/ }).first()
  if ((await kart.count()) > 0) {
    await kart.click()
    await s.waitForURL(/\/app\/workspaces\/[^/]+/, { timeout: 15000 })
    const m = s.url().match(/\/app\/workspaces\/([^/?#]+)/)
    if (m) return m[1]
  }
  return null
}

/** 2. aşama: 2x headless, çekim. */
async function cekimAsamasi() {
  fs.mkdirSync(HEDEF, { recursive: true })

  const b = await chromium.launchPersistentContext(PROFIL, {
    headless: true,
    viewport: { width: GENISLIK, height: YUKSEKLIK },
    deviceScaleFactor: 2,
    locale: 'tr-TR',
  })
  await b.addInitScript(BILDIRIM_BASTIR)
  const s = b.pages()[0] ?? (await b.newPage())

  const wsId = await isletmeIdBul(s)
  if (!wsId) console.log("  UYARI: ornek isletme bulunamadi, liste ekrani cekilecek.")

  for (const ekran of EKRANLAR) {
    const yol = wsId
      ? ekran.yol.replace("{ws}", wsId)
      : ekran.yol.replace("/{ws}/overview", "")
    /* 🔴 `networkidle` KULLANILMIYOR: Topluluk akisinda surekli bir
     * baglanti var, ag hicbir zaman bosa cikmiyor ve 30sn sonra zaman
     * asimina dusuyordu (olculdu). `domcontentloaded` + sabit bekleme
     * hem o rotada hem digerlerinde calisiyor. */
    await s.goto(TABAN + yol, { waitUntil: 'domcontentloaded' })
    await s.addStyleTag({ content: GIZLE })
    /* Ağ boşa çıksa da liste ve grafikler bir kare sonra yerleşiyor. */
    await s.waitForTimeout(3200)

    const cikti = path.join(HEDEF, ekran.dosya)
    await s.screenshot({ path: cikti })
    const kb = (fs.statSync(cikti).size / 1024).toFixed(0)
    console.log(`  ${ekran.dosya.padEnd(22)} ${yol.padEnd(42)} ${kb} KB`)
  }

  await b.close()
}

async function main() {
  if (await oturumVar()) console.log('\n  Profilde oturum açık, giriş adımı atlanıyor.\n')
  else await girisAsamasi()

  await cekimAsamasi()

  console.log(`\nBitti. Dosyalar: ${HEDEF}`)
  console.log('Önbellek damgasını yükselt: EkranCizimi.jsx içindeki ?v=')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
