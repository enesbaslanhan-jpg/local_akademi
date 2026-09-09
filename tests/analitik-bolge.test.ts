import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { analitikSunucusuIzinli } from '../src/services/product-analytics.js'

/*
 * ANALİTİK BÖLGESİ, YAZILI BEYANLA AYNI KALMALI.
 *
 * 🔴 Aydınlatma metni analitik verisinin AB'ye aktarıldığını beyan ediyor.
 * `POSTHOG_HOST` bir çevre değişkeni: sunucuda yanlışlıkla ABD bölgesine
 * çevrilirse metin sessizce YANLIŞ BEYAN hâline gelir ve bunu fark
 * ettirecek hiçbir şey olmaz -- veri akmaya devam eder, ekranda bir şey
 * değişmez.
 *
 * Bu test iki tarafı birbirine bağlıyor: kodun kabul ettiği bölge ile
 * metnin beyan ettiği bölge ayrışırsa test düşer.
 */
describe('analitik bölgesi', () => {
  it('AB sunucularını kabul ediyor', () => {
    expect(analitikSunucusuIzinli('eu.i.posthog.com')).toBe(true)
  })

  it('ABD sunucusunu reddediyor', () => {
    /* Beyan AB diyor; ABD bölgesi açılırsa analitik hiç çalışmamalı. */
    expect(analitikSunucusuIzinli('us.i.posthog.com')).toBe(false)
    expect(analitikSunucusuIzinli('app.posthog.com')).toBe(false)
  })

  it('rastgele bir sunucuyu reddediyor', () => {
    expect(analitikSunucusuIzinli('example.com')).toBe(false)
  })

  it('yerel geliştirmeye izin veriyor', () => {
    /* Orada gerçek kullanıcı verisi yok. */
    expect(analitikSunucusuIzinli('localhost')).toBe(true)
  })

  /*
   * 🔴 ASIL KORUMA: metin ile kod aynı şeyi söylüyor mu.
   *
   * Biri diğerinden habersiz değiştirilirse burada yakalanır.
   */
  it('aydınlatma metni analitik aktarımını AB olarak beyan ediyor', () => {
    const metin = readFileSync('frontend/src/content/legal/privacy.js', 'utf8')
    const satir = metin.match(/'PostHog[^']*'[\s\S]{0,400}?\]/)
    expect(satir, 'PostHog satırı aydınlatma metninde yok').not.toBeNull()
    /* Kod yalnız AB kabul ediyor; metin de AB demeli. */
    expect(satir![0]).toMatch(/Almanya|AB\b|Avrupa/)
    expect(satir![0]).not.toMatch(/ABD/)
  })

  it('çerez politikası artık "analitik yok" demiyor', () => {
    /* Analitik açılınca bu cümle yalan olurdu. */
    const tr = readFileSync('frontend/src/content/legal/cookies.js', 'utf8')
    const en = readFileSync('frontend/src/content/legal/cookies.en.js', 'utf8')
    expect(tr).not.toMatch(/analitik aracı, reklam ağı, sosyal medya izleyicisi veya benzeri/)
    expect(en).not.toMatch(/does not run analytics tools/)
  })
})
