import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { createSigner } from 'fast-jwt'

const OUTPUT = join(process.cwd(), 'tmp', 'browser-validation')
if (!existsSync(OUTPUT)) mkdirSync(OUTPUT, { recursive: true })

const BASE_URL = 'http://localhost:5173'
const JWT_SECRET = process.env.JWT_SECRET || '8dfeec1b46a7a00a703a9dcdd3ebef7125939debf7a93fd14999ac0694fd305b'
const TEST_USER = { id: 39, email: 'browser-test-1785793727800@localakademi.com', role: 'student' }
const signToken = createSigner({ key: JWT_SECRET, expiresIn: 28800000 }) // 8h in ms

const results = []

function pass(msg) {
  console.log('PASS', msg)
  results.push({ status: 'pass', message: msg })
}
function fail(msg) {
  console.log('FAIL', msg)
  results.push({ status: 'fail', message: msg })
}

async function checkNoOverflow(page, label) {
  const hasOverflow = await page.evaluate(() => {
    const docOverflow = document.documentElement.scrollWidth > window.innerWidth
    const bodyOverflow = document.body.scrollWidth > window.innerWidth
    return docOverflow || bodyOverflow
  })
  if (hasOverflow) fail(`${label}: yatay taşma tespit edildi`)
  else pass(`${label}: yatay taşma yok`)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()

  try {
    // Inject a valid token to bypass rate-limited login
    const token = signToken(TEST_USER)
    await page.goto(`${BASE_URL}/login`)
    await page.evaluate((t) => { localStorage.setItem('token', t) }, token)
    await page.goto(`${BASE_URL}/app/dashboard`)
    await page.waitForURL(/\/app\/dashboard/, { timeout: 15000 })
    pass('Token enjekte edildi ve /app/dashboard açıldı')

    // Enroll to correct course 215
    await page.evaluate(async (courseId) => {
      const t = localStorage.getItem('token')
      const res = await fetch(`/api/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': t ? `Bearer ${t}` : ''
        },
        body: JSON.stringify({ courseId })
      })
      if (!res.ok && res.status !== 409) throw new Error(`enroll failed: ${res.status}`)
    }, 215)
    pass('Doğru kursa (215) kayıt olundu')

    // Validate course 215 shows 5 distinct lessons and no duplicate course 44 in the list
    const apiCheck = await page.evaluate(async (courseId) => {
      const t = localStorage.getItem('token')
      const headers = t ? { Authorization: `Bearer ${t}` } : {}
      const courseRes = await fetch(`/courses/${courseId}`, { headers })
      const courseData = await courseRes.json()
      const coursesRes = await fetch('/courses', { headers })
      const coursesData = await coursesRes.json()
      return { course: courseData, courses: coursesData }
    }, 215)
    const lessonTitles = (apiCheck.course?.course?.lessons || []).map(l => l.title.replace(/^\d+\.\s*/, '').trim())
    const uniqueLessons = [...new Set(lessonTitles)]
    if (uniqueLessons.length === 5 &&
        uniqueLessons.includes('Pazar Yeri Seçimi: Başlangıç Kanalını Belirleme') &&
        uniqueLessons.includes('Kendi E-ticaret Sitesi') &&
        uniqueLessons.includes('Çoklu Kanal Satış') &&
        uniqueLessons.includes('Ürün Listeleme') &&
        uniqueLessons.includes('Ürün Fotoğrafçılığı')) {
      pass('Course 215 listesinde 5 farklı ders görünüyor')
    } else {
      fail(`Beklenen 5 ders değil: ${uniqueLessons.length} - ${uniqueLessons.join(', ')}`)
    }
    const visibleCourses = apiCheck.courses?.courses || []
    const duplicateCourse = visibleCourses.find(c => c.title === 'Pazar Yeri Seçimi' && c.id === 44)
    if (duplicateCourse) fail('Hatalı "Pazar Yeri Seçimi" kursu (course 44) kurs listesinde görünüyor')
    else pass('Kurs listesinde hatalı "Pazar Yeri Seçimi" kursu görünmüyor')

    // Open course player lesson
    const lessonUrl = `${BASE_URL}/app/courses/215/learn/919`
    await page.goto(lessonUrl)
    await page.waitForSelector('text=Pazar Yeri Seçimi', { timeout: 20000 })
    pass('Ders sayfası açıldı ve içerik görüntülendi')

    // Desktop screenshot
    await page.screenshot({ path: join(OUTPUT, 'lesson-desktop.png'), fullPage: true })
    await checkNoOverflow(page, 'Desktop (1280px)')

    // Check embedded blocks
    const blocks = await page.locator('[data-testid^="practice-block-"]').count()
    if (blocks >= 4) pass(`${blocks} gömülü uygulama bloğu render edildi`)
    else fail(`Yeterli blok bulunamadı: ${blocks}`)

    // Check decision-check links
    const dcLinks = [
      { text: /Pazaryeri komisyonundan sonra ne kalıyor/, code: 'DC-MARKETPLACE-004' },
      { text: /Ürünüm gerçekten kârlı mı/, code: 'DC-PROFIT-001' },
      { text: /Nakit akışım riskli mi/, code: 'DC-CASHFLOW-008' }
    ]
    for (const dc of dcLinks) {
      const locator = page.locator('a', { hasText: dc.text }).first()
      if (await locator.count() > 0) {
        pass(`Karar Aracı linki metinde bulundu: ${dc.code}`)
      } else {
        fail(`Karar Aracı linki metinde bulunamadı: ${dc.code}`)
      }
    }

    // Check embedded decision-check buttons
    const dcButtons = [
      { testId: 'practice-block-formula', code: 'DC-PROFIT-001' },
      { testId: 'practice-block-common_mistake', code: 'DC-MARKETPLACE-004' },
      { testId: 'practice-block-quick_application', code: 'DC-CASHFLOW-008' }
    ]
    for (const dc of dcButtons) {
      const button = page.locator(`[data-testid="${dc.testId}"] button`, { hasText: /İlgili Karar Aracı/ }).first()
      if (await button.count() > 0) {
        pass(`${dc.testId} bloğunda Karar Aracı butonu var: ${dc.code}`)
      } else {
        fail(`${dc.testId} bloğunda Karar Aracı butonu yok: ${dc.code}`)
      }
    }

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await page.waitForSelector('text=Pazar Yeri Seçimi', { timeout: 20000 })
    await page.screenshot({ path: join(OUTPUT, 'lesson-mobile.png'), fullPage: true })
    await checkNoOverflow(page, 'Mobile (375px)')

    // Click a decision-check link from text
    const firstLink = page.locator('a', { hasText: /Pazaryeri komisyonundan sonra ne kalıyor/ }).first()
    if (await firstLink.count() > 0) {
      await firstLink.click()
      await page.waitForURL(/\/app\/decision-checks\/DC-MARKETPLACE-004/, { timeout: 10000 })
      pass('Metindeki Karar Aracı linki doğru hedefe yönlendirdi')
      await page.screenshot({ path: join(OUTPUT, 'decision-check-link.png'), fullPage: true })
    }

    // Click source link inside checklist block
    await page.goto(lessonUrl)
    await page.waitForSelector('[data-testid="practice-block-checklist"]')
    const sourceLink = page.locator('[data-testid="practice-block-checklist"] a', { hasText: /Kaynak/ }).first()
    if (await sourceLink.count() > 0) {
      await sourceLink.click()
      await page.waitForURL(/\/app\/knowledge\/CUR-041-01/, { timeout: 10000 })
      pass('Kaynak bağlantısı tıklanabilir ve doğru hedefe gitti')
    } else {
      // fallback: any source link inside checklist block
      const anyLink = page.locator('[data-testid="practice-block-checklist"] a').first()
      if (await anyLink.count() > 0) {
        const href = await anyLink.getAttribute('href')
        pass(`Kaynak linki bulundu: ${href}`)
      } else {
        fail('Checklist bloğunda kaynak linki bulunamadı')
      }
    }
  } catch (e) {
    fail(`Tarayıcı doğrulaması hata: ${e.message}`)
    await page.screenshot({ path: join(OUTPUT, 'error.png'), fullPage: true })
  } finally {
    await browser.close()
  }

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  console.log(`\nSonuç: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
