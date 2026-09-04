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
  {
    dosya: 'karar-araclari.png',
    yol: '/app/decision-checks',
    yakin: { dosya: 'karar-araclari-detay.png', metin: /Ürünüm Gerçekten Kârlı mı/ },
  },
  {
    dosya: 'isletme-takibi.png',
    yol: '/app/workspaces/{ws}/overview',
    yakin: { dosya: 'isletme-takibi-detay.png', metin: /Yaklaşan ve gecikenler/ },
  },
  {
    dosya: 'ai-mentor.png',
    yol: '/app/mentor',
    yakin: { dosya: 'ai-mentor-detay.png', metin: /Stok yönetimi|MENTOR YANITI/ },
  },
  {
    dosya: 'hesaplamalar.png',
    yol: '/app/calculations',
    yakin: { dosya: 'hesaplamalar-detay.png', metin: /Fiyat Mimarisi ve Hedef Marj/ },
  },
  {
    dosya: 'kurslar.png',
    yol: '/app/courses',
    yakin: { dosya: 'kurslar-detay.png', metin: /Gerçek Birim Maliyet|Kârlı Fiyat Mimarisi/ },
  },
  {
    dosya: 'topluluk.png',
    yol: '/app/community/topluluk',
    yakin: { dosya: 'topluluk-detay.png', metin: /fire oranını|komisyonu ve kargo|Nakit dayanma/ },
  },
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

/**
 * Cekimden once tarayici durumunu hazirlar.
 *
 * 1. Depolama bildirimi gorulmus sayilir — cerez bandi acilmaz.
 *    🔴 Deger '1' DEGIL 'true' olmali; StorageNotice tam esitlik ariyor
 *    (StorageNotice.test.jsx dogruluyor). '1' yazdigimda bant cikmaya
 *    devam etti.
 *
 * 2. Tema KOYU'ya sabitlenir. Mevcut about-screens dosyalari koyu modda
 *    cekilmisti; acik modda cekilenler yan yana gelince tanitim sayfasi
 *    iki farkli urun gibi gorunuyordu.
 *
 *    Anahtar `localkarar-theme` (context/ThemeContext.jsx). Ayrica
 *    baglamda `colorScheme: 'dark'` veriliyor: kullanici hic secim
 *    yapmamissa ThemeContext sistem tercihine dusuyor.
 */
const TARAYICI_HAZIRLA = () => {
  try {
    localStorage.setItem('localkarar-storage-notice-seen', 'true')
    localStorage.setItem('localkarar-theme', 'dark')
  } catch {}
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

/**
 * Yakın çekim: bir bölümün tek kartını/panelini kırpar.
 *
 * Kolajda tam sayfanın yanına konacak; tek başına tam sayfa görseller
 * yan yana dizilince hepsi aynı gri dikdörtgen gibi duruyordu.
 *
 * ⚠️ SEÇİCİ DEĞİL METİN kullanılıyor. CSS modülü sınıfları her derlemede
 * yeniden hashleniyor (`_ad_hash_satır`); sınıfa dayanan bir seçici bir
 * sonraki derlemede sessizce boş dönerdi. Metin arayüzle birlikte
 * değişir ve değişirse bu betik GÖRÜNÜR şekilde uyarır.
 */
async function yakinCekim(s, yakin, hedefDizin) {
  /*
   * 🔴 ONCE Playwright `.last()` KULLANILIYORDU VE HEP EN ICTEKI ogeyi
   * seciyordu: metnin kendi kapsayicisi, 24-78px yuksekliginde. Bes
   * yakin cekimin besi de olcu kontrolune takilip atlandi.
   *
   * Dogrusu metni bulup YUKARI dogru tirmanmak: kart/panel sinirina
   * denk gelen ilk makul yukseklikteki ata aliniyor.
   */
  /*
   * Once ogeyi GORUNUME KAYDIR: kirpma yalniz gorunen alandan yapilabilir,
   * sayfanin altindaki kartlar aksi halde atlaniyordu (topluluk boyle
   * atlanmisti).
   */
  await s.evaluate((desenKaynak) => {
    const desen = new RegExp(desenKaynak)
    const hepsi = [...document.querySelectorAll("body *")]
    const eslesen = hepsi.filter((e) => desen.test(e.textContent || ""))
    const temiz = eslesen.filter((e) => !e.closest("aside"))
    ;(temiz[temiz.length - 1] || eslesen[eslesen.length - 1])?.scrollIntoView({ block: "center" })
  }, yakin.metin.source)
  await s.waitForTimeout(700)

  const kutu = await s.evaluate((desenKaynak) => {
    const desen = new RegExp(desenKaynak)
    const hepsi = [...document.querySelectorAll("body *")]
    /*
     * 🔴 YAN PANEL DISLANIYOR. Karar Araclari sayfasinda ayni baslik hem
     * ana izgarada hem sagdaki oneri panelinde geciyor; en son eslesme
     * panelde kaliyordu ve onun atalari 1218px yuksekliginde, hicbir
     * aday araliga girmiyordu.
     */
    const eslesen = hepsi
      .filter((e) => desen.test(e.textContent || ""))
      .filter((e) => !e.closest("aside"))
    if (eslesen.length === 0) return null

    /*
     * En ictekinden yukari tirmanip TUM adaylari topla, sonra 320px
     * hedefine en yakinini sec.
     *
     * Once "araliga giren ILK ata" aliniyordu; atalarin yuksekligi
     * kucukten devasa atladigi icin bes cekimden ucu hicbir adaya
     * denk gelmiyordu.
     */
    const adaylar = []
    let n = eslesen[eslesen.length - 1]
    while (n && n !== document.body) {
      const r = n.getBoundingClientRect()
      if (r.height >= 100 && r.height <= 700 && r.width >= 260) {
        adaylar.push({ x: r.x, y: r.y, width: r.width, height: r.height })
      }
      n = n.parentElement
    }
    if (adaylar.length === 0) return null
    adaylar.sort((a, b) => Math.abs(a.height - 320) - Math.abs(b.height - 320))
    return adaylar[0]
  }, yakin.metin.source)
  if (!kutu) {
    console.log(`  UYARI: ${yakin.dosya} için uygun kart bulunamadı, atlandı.`)
    return
  }

  /* Görünümün dışına taşan kısım kırpılamaz; kutuyu görünüme sığdır. */
  const clip = {
    x: Math.max(0, kutu.x),
    y: Math.max(0, kutu.y),
    width: Math.min(kutu.width, GENISLIK - Math.max(0, kutu.x)),
    height: Math.min(kutu.height, YUKSEKLIK - Math.max(0, kutu.y)),
  }
  if (clip.height < 100) {
    console.log(`  UYARI: ${yakin.dosya} görünüme sığmadı, atlandı.`)
    return
  }

  const cikti = path.join(hedefDizin, yakin.dosya)
  await s.screenshot({ path: cikti, clip })
  const kb = (fs.statSync(cikti).size / 1024).toFixed(0)
  console.log(`  ${yakin.dosya.padEnd(28)} ${Math.round(clip.width)}x${Math.round(clip.height)} @2x   ${kb} KB`)
}
/** 2. aşama: 2x headless, çekim. */
async function cekimAsamasi() {
  fs.mkdirSync(HEDEF, { recursive: true })

  const b = await chromium.launchPersistentContext(PROFIL, {
    headless: true,
    viewport: { width: GENISLIK, height: YUKSEKLIK },
    deviceScaleFactor: 2,
    locale: 'tr-TR',
    colorScheme: 'dark',
  })
  await b.addInitScript(TARAYICI_HAZIRLA)
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

    if (ekran.yakin) await yakinCekim(s, ekran.yakin, HEDEF)
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
