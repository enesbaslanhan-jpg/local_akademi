import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { statikOnbellekBasligi, DEGISMEZ_ONBELLEK } from '../src/lib/statik-onbellek.js'

/*
 * İçerik özetli /assets dosyaları bir yıl önbellekte tutulur; adı değişmeden içeriği
 * değişebilen dosyalar (index.html, about-screens/*, sitemap.xml) TUTULMAZ.
 * Yanlış yöne hata (index.html'i uzun önbelleğe almak) kullanıcıyı eski sürümde bırakır.
 */

describe('statikOnbellekBasligi', () => {
  it('içerik özetli /assets dosyalarına bir yıllık değişmez önbellek verir', () => {
    for (const f of [
      '/srv/public/assets/index-CYKxVhSj.js',
      '/srv/public/assets/index-CKOBo-7H.css',
      '/srv/public/assets/manrope-latin-400-normal-PaqtzbVb.woff2',
      'C:\\app\\public\\assets\\AboutPage-B0fJFtLb.js',
    ]) {
      expect(statikOnbellekBasligi(f), f).toBe(DEGISMEZ_ONBELLEK)
    }
    expect(DEGISMEZ_ONBELLEK).toContain('immutable')
    expect(DEGISMEZ_ONBELLEK).toContain('max-age=31536000')
  })

  it('sabit adlı dosyalara DOKUNMAZ', () => {
    for (const f of [
      '/srv/public/index.html',
      '/srv/public/sitemap.xml',
      '/srv/public/robots.txt',
      '/srv/public/about-screens/hesaplamalar.webp',
      '/srv/public/favicon.svg',
      '/srv/public/assets/logo.svg', // /assets içinde ama özet YOK
    ]) {
      expect(statikOnbellekBasligi(f), f).toBeNull()
    }
  })
})

describe('Fastify yanıtında başlık', () => {
  it('/assets özetli dosya immutable, index.html ve sabit ad değil', async () => {
    const kok = mkdtempSync(path.join(tmpdir(), 'statik-'))
    try {
      mkdirSync(path.join(kok, 'assets'))
      writeFileSync(path.join(kok, 'assets', 'index-CYKxVhSj.js'), 'console.log(1)')
      writeFileSync(path.join(kok, 'index.html'), '<html></html>')
      writeFileSync(path.join(kok, 'sitemap.xml'), '<urlset/>')

      const app = Fastify()
      await app.register(fastifyStatic, {
        root: kok,
        prefix: '/',
        index: 'index.html',
        setHeaders: (res, dosyaYolu) => {
          const b = statikOnbellekBasligi(dosyaYolu)
          if (b) res.header('Cache-Control', b)
        },
      })

      const js = await app.inject({ method: 'GET', url: '/assets/index-CYKxVhSj.js' })
      expect(js.statusCode).toBe(200)
      expect(js.headers['cache-control']).toBe(DEGISMEZ_ONBELLEK)

      const html = await app.inject({ method: 'GET', url: '/index.html' })
      expect(html.headers['cache-control']).not.toContain('immutable')
      const xml = await app.inject({ method: 'GET', url: '/sitemap.xml' })
      expect(xml.headers['cache-control']).not.toContain('immutable')
      await app.close()
    } finally {
      rmSync(kok, { recursive: true, force: true })
    }
  })
})
