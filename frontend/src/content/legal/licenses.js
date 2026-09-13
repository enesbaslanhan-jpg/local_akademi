/*
 * AÇIK KAYNAK LİSANSLARI
 *
 * 🔴 NEDEN VAR: Mobil uygulamanın Ayarlar → Hakkında ekranı
 * `/licenses` adresine bağlanıyordu ve web'de böyle bir sayfa yoktu;
 * kullanıcı 404 görüyordu (ürün sahibi, 13.09.2026). Mağaza incelemesi
 * de üçüncü taraf lisans bildirimini arar.
 *
 * Liste ŞABLON DEĞİL: package.json (API + web) ve
 * gradle/libs.versions.toml (mobil) okunarak yazıldı. Bağımlılık
 * eklenince burası da güncellenmeli; sürüm numarası yazılmıyor, sürüm
 * değiştikçe metin eskimesin.
 *
 * Lisans adları kütüphanelerin kendi bildirimlerinden. Hepsi izin
 * verici (MIT, Apache-2.0, BSD, ISC, OFL); GPL türü kopya-sol lisans
 * kullanılmıyor — bu bilinçli, ürün kapalı kaynak.
 */

const kalem = (ad, lisans, not) => (not ? `${ad} — ${lisans} (${not})` : `${ad} — ${lisans}`)

export default {
  giris:
    'LocalKarar, aşağıda listelenen açık kaynak yazılımları kullanır. Her biri kendi ' +
    'lisansı altında dağıtılır; lisans metinleri ilgili projelerin depolarında yer alır. ' +
    'Bu sayfa, kullanılan bileşenleri ve lisanslarını bildirir.',

  bolumler: [
    {
      id: 'mobil',
      baslik: '1. Mobil uygulama (Android / iOS)',
      paragraflar: [
        kalem('Kotlin, kotlinx.coroutines, kotlinx.serialization, kotlinx-datetime (JetBrains)', 'Apache-2.0'),
        kalem('Compose Multiplatform, AndroidX (Activity, Lifecycle, Core, AppCompat, Security-Crypto)', 'Apache-2.0'),
        kalem('Ktor istemcisi (core, Android, Darwin, auth, content-negotiation, logging)', 'Apache-2.0'),
        kalem('Coil 3', 'Apache-2.0'),
        kalem('Material Components for Android', 'Apache-2.0'),
        kalem('multiplatform-markdown-renderer (Mike Penz)', 'Apache-2.0')
      ]
    },
    {
      id: 'web',
      baslik: '2. Web uygulaması',
      paragraflar: [
        kalem('React, React DOM, React Router', 'MIT'),
        kalem('i18next, react-i18next', 'MIT'),
        kalem('react-markdown, remark-gfm, remark-math, rehype-katex', 'MIT'),
        kalem('KaTeX', 'MIT'),
        kalem('Lucide (simgeler)', 'ISC'),
        kalem('PostHog JS', 'MIT', 'yalnız açık rıza verildiğinde yüklenir'),
        kalem('Manrope yazı tipi (@fontsource/manrope)', 'SIL Open Font License 1.1')
      ]
    },
    {
      id: 'sunucu',
      baslik: '3. Sunucu',
      paragraflar: [
        kalem('Fastify ve eklentileri (cors, jwt, multipart, rate-limit, static)', 'MIT'),
        kalem('Prisma ORM ve Prisma Client', 'Apache-2.0'),
        kalem('Zod', 'MIT'),
        kalem('bcryptjs', 'MIT'),
        kalem('fast-xml-parser', 'MIT'),
        kalem('pdfkit, pdf-parse', 'MIT'),
        kalem('ExcelJS', 'MIT'),
        kalem('mammoth', 'BSD-2-Clause'),
        kalem('archiver', 'MIT'),
        kalem('Tesseract.js ve Türkçe dil verisi', 'Apache-2.0'),
        kalem('DejaVu yazı tipleri', 'Bitstream Vera / DejaVu lisansı'),
        kalem('PostHog Node', 'MIT')
      ]
    },
    {
      id: 'iletisim',
      baslik: '4. Bildirim ve iletişim',
      paragraflar: [
        'Bir lisans bildiriminin eksik veya hatalı olduğunu düşünüyorsanız destek kanalından ' +
        'bize yazın; kaynağı doğrulayıp bu sayfayı güncelleriz.'
      ]
    }
  ]
}
