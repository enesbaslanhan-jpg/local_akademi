/* English counterpart of licenses.js — keep the two lists identical. */

const item = (name, license, note) => (note ? `${name} — ${license} (${note})` : `${name} — ${license}`)

export default {
  giris:
    'LocalKarar uses the open-source software listed below. Each is distributed under its own ' +
    'license; the license texts live in the respective project repositories. This page discloses ' +
    'the components in use and their licenses.',

  bolumler: [
    {
      id: 'mobil',
      baslik: '1. Mobile app (Android / iOS)',
      paragraflar: [
        item('Kotlin, kotlinx.coroutines, kotlinx.serialization, kotlinx-datetime (JetBrains)', 'Apache-2.0'),
        item('Compose Multiplatform, AndroidX (Activity, Lifecycle, Core, AppCompat, Security-Crypto)', 'Apache-2.0'),
        item('Ktor client (core, Android, Darwin, auth, content-negotiation, logging)', 'Apache-2.0'),
        item('Coil 3', 'Apache-2.0'),
        item('Material Components for Android', 'Apache-2.0'),
        item('multiplatform-markdown-renderer (Mike Penz)', 'Apache-2.0')
      ]
    },
    {
      id: 'web',
      baslik: '2. Web app',
      paragraflar: [
        item('React, React DOM, React Router', 'MIT'),
        item('i18next, react-i18next', 'MIT'),
        item('react-markdown, remark-gfm, remark-math, rehype-katex', 'MIT'),
        item('KaTeX', 'MIT'),
        item('Lucide (icons)', 'ISC'),
        item('PostHog JS', 'MIT', 'loaded only with explicit consent'),
        item('Manrope typeface (@fontsource/manrope)', 'SIL Open Font License 1.1')
      ]
    },
    {
      id: 'sunucu',
      baslik: '3. Server',
      paragraflar: [
        item('Fastify and plugins (cors, jwt, multipart, rate-limit, static)', 'MIT'),
        item('Prisma ORM and Prisma Client', 'Apache-2.0'),
        item('Zod', 'MIT'),
        item('bcryptjs', 'MIT'),
        item('fast-xml-parser', 'MIT'),
        item('pdfkit, pdf-parse', 'MIT'),
        item('ExcelJS', 'MIT'),
        item('mammoth', 'BSD-2-Clause'),
        item('archiver', 'MIT'),
        item('Tesseract.js and Turkish language data', 'Apache-2.0'),
        item('DejaVu fonts', 'Bitstream Vera / DejaVu license'),
        item('PostHog Node', 'MIT')
      ]
    },
    {
      id: 'iletisim',
      baslik: '4. Notices',
      paragraflar: [
        'If you believe a license notice is missing or incorrect, contact us through the support ' +
        'channel; we will verify the source and update this page.'
      ]
    }
  ]
}
