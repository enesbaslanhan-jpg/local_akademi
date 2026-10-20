import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const root = process.cwd()
const dist = resolve(root, 'dist')
const sitemap = await readFile(resolve(root, 'public/sitemap.xml'), 'utf8')
const routes = [...sitemap.matchAll(/<loc>https:\/\/localkarar\.com(\/[^<]*)?<\/loc>/g)].map(match => match[1] || '/')
if (!routes.includes('/') || routes.length < 20) throw new Error(`Sitemap route list looks incomplete (${routes.length} routes).`)

const port = Number(process.env.PRERENDER_PORT || 4178)
const preview = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'preview', '--configLoader', 'runner', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
  env: process.env,
  windowsHide: true,
})
let browser

try {
  let ready = false
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited with ${preview.exitCode}`)
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`)
      if (response.ok) { ready = true; break }
    } catch { /* Preview is still starting. */ }
    await delay(250)
  }
  if (!ready) throw new Error('Timed out while starting Vite preview for prerender.')

  const launchOptions = { headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }
  const systemChromium = process.env.CHROMIUM_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync)
  if (systemChromium) launchOptions.executablePath = systemChromium
  browser = await chromium.launch(launchOptions)
  const context = await browser.newContext({ colorScheme: 'light', locale: 'tr-TR' })
  const failed = []

  for (const route of routes) {
    const page = await context.newPage()
    page.on('pageerror', error => failed.push(`${route}: ${error.message}`))
    const response = await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    if (!response?.ok()) throw new Error(`${route} returned HTTP ${response?.status() ?? 'no response'}`)
    await page.locator('#root h1').first().waitFor({ state: 'visible', timeout: 20000 })
    await page.waitForFunction(() => document.title && document.querySelector('link[rel="canonical"]')?.href, { timeout: 5000 })
    const html = await page.content()
    const h1 = (await page.locator('#root h1').first().innerText()).trim()
    if (!h1) throw new Error(`${route} rendered an empty H1.`)

    if (route === '/') await writeFile(resolve(dist, 'index.html'), html)
    else {
      const fileName = `${route.slice(1).replaceAll('/', '--')}.html`
      const target = resolve(dist, 'seo-pages', fileName)
      await mkdir(resolve(dist, 'seo-pages'), { recursive: true })
      await writeFile(target, html)
    }
    if (route.startsWith('/araclar/')) {
      const wordCount = await page.locator('#root').innerText().then(text => text.trim().split(/\s+/).filter(Boolean).length)
      if (wordCount < 500) throw new Error(`${route} has only ${wordCount} rendered words; expected at least 500.`)
    }
    await page.close()
  }

  if (failed.length) throw new Error(`Browser errors during prerender:\n${failed.join('\n')}`)
  await context.close()
  console.log(`Prerendered ${routes.length} public sitemap routes; calculator pages include visible HTML content.`)
} finally {
  await browser?.close()
  preview.kill('SIGTERM')
}
