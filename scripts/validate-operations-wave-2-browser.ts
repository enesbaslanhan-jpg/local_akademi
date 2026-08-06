import { chromium } from 'playwright'
import { createSigner } from 'fast-jwt'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const BASE_URL = process.env.OPS_WAVE2_BASE_URL || 'http://localhost:5173'
const BACKEND_URL = process.env.OPS_WAVE2_BACKEND_URL || ''
const OUTPUT = join(process.cwd(), 'tmp', 'browser-validation-operations-wave-2')
const JWT_SECRET = process.env.JWT_SECRET || '8dfeec1b46a7a00a703a9dcdd3ebef7125939debf7a93fd14999ac0694fd305b'
const TEST_USER = { id: 39, email: 'browser-test-1785793727800@localakademi.com', role: 'student' }

const lessons = [
  { koId: 636, courseId: 231, lessonId: 999, title: 'Bir Sipariş İşletmenin İçinden Nasıl Geçiyor?', blocks: 5 },
  { koId: 642, courseId: 231, lessonId: 1001, title: 'Herkes Çalışıyor, Siparişler Neden Çıkmıyor?', blocks: 5 },
  { koId: 648, courseId: 231, lessonId: 1003, title: 'Hata Müşteriye Ulaşmadan Nerede Yakalanmalıydı?', blocks: 5 },
  { koId: 651, courseId: 232, lessonId: 1004, title: 'Sorun Neden Tekrar Ediyor?', blocks: 5 },
  { koId: 789, courseId: 241, lessonId: 1050, title: 'En Ucuz Tedarikçi Gerçekten En İyi Seçim mi?', blocks: 6 }
]

if (!existsSync(OUTPUT)) mkdirSync(OUTPUT, { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  if (BACKEND_URL) {
    const frontendOrigin = new URL(BASE_URL).origin
    await context.route(`${frontendOrigin}/**`, async route => {
      const requestUrl = new URL(route.request().url())
      const backendPrefixes = [
        '/api/', '/auth', '/courses', '/enrollments', '/knowledge', '/lessons',
        '/tasks', '/quizzes', '/flashcards', '/videos', '/learning', '/dashboard'
      ]
      if (!backendPrefixes.some(prefix => requestUrl.pathname.startsWith(prefix))) {
        await route.continue()
        return
      }
      const backendPath = requestUrl.pathname.startsWith('/api/')
        ? requestUrl.pathname.replace(/^\/api/, '')
        : requestUrl.pathname
      const response = await route.fetch({
        url: `${BACKEND_URL}${backendPath}${requestUrl.search}`
      })
      await route.fulfill({ response })
    })
  }
  const page = await context.newPage()
  const token = createSigner({ key: JWT_SECRET, expiresIn: 28800000 })(TEST_USER)
  const results: Array<Record<string, unknown>> = []

  try {
    await page.goto(`${BASE_URL}/login`)
    await page.evaluate(value => localStorage.setItem('token', value), token)
    for (const courseId of [...new Set(lessons.map(lesson => lesson.courseId))]) {
      await page.evaluate(async id => {
        const currentToken = localStorage.getItem('token')
        const response = await fetch('/api/enrollments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentToken}` },
          body: JSON.stringify({ courseId: id })
        })
        if (!response.ok && response.status !== 409) throw new Error(`enrollment ${id}: ${response.status}`)
      }, courseId)
    }

    for (const lesson of lessons) {
      const url = `${BASE_URL}/app/courses/${lesson.courseId}/learn/${lesson.lessonId}`
      await page.setViewportSize({ width: 1280, height: 800 })
      await page.goto(url)
      await page.getByText(lesson.title, { exact: true }).first().waitFor({ timeout: 20000 })
      const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth)
      const blockCount = await page.locator('[data-testid^="practice-block-"]').count()
      const toolCount = await page.getByRole('button', { name: /İlgili Karar Aracı/ }).count()
      const rawText = await page.locator('body').innerText()
      const tableCount = await page.locator('main table').count()

      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await page.getByText(lesson.title, { exact: true }).first().waitFor({ timeout: 20000 })
      const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth || document.body.scrollWidth > window.innerWidth)

      if (lesson.koId === 636 || lesson.koId === 789) {
        await page.screenshot({ path: join(OUTPUT, `ko-${lesson.koId}-mobile.png`), fullPage: true })
        await page.setViewportSize({ width: 1280, height: 800 })
        await page.reload()
        await page.getByText(lesson.title, { exact: true }).first().waitFor({ timeout: 20000 })
        await page.screenshot({ path: join(OUTPUT, `ko-${lesson.koId}-desktop.png`), fullPage: true })
      }

      const forbidden = /\.docx|docxdocx|plaintext|\$\$|\\text\s*\{|##\s*metadata/i.test(rawText)
      const result = {
        koId: lesson.koId,
        desktopOverflow,
        mobileOverflow,
        blockCount,
        expectedBlocks: lesson.blocks,
        toolCount,
        tableCount,
        forbiddenVisibleText: forbidden
      }
      results.push(result)
      if (desktopOverflow || mobileOverflow || blockCount !== lesson.blocks || toolCount !== 0 || tableCount !== 0 || forbidden) {
        throw new Error(`KO ${lesson.koId} browser validation failed: ${JSON.stringify(result)}`)
      }
      console.log(JSON.stringify(result))
    }
    console.log(`SCREENSHOTS=${OUTPUT}`)
    console.log('=== BROWSER DONE: 5 OK, 0 failed ===')
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error('FATAL:', error.message)
  process.exit(1)
})
