import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

/*
 * 🔴 ÇAĞRILAN OLAY, İZİN LİSTESİNDE DE OLMALI.
 *
 * `captureAnalytics` bir izin listesi kullanıyor: listede olmayan olayı
 * SESSİZCE düşürüyor. Liste bilerek var -- yanlışlıkla kişisel veri
 * taşıyan bir olay eklenmesin diye.
 *
 * Ama tuzağı da var: olayı çağrı yerine ekleyip listeye yazmayı
 * unutursan hiçbir şey patlamaz, veri sadece hiç gelmez. 09.09.2026'da
 * tam bu oldu -- `workspace_created` ve `record_created` eklendi,
 * listeye yazılmadı, PostHog'da yalnız `page_view` göründü ve bunu
 * ancak ürün sahibi fark etti.
 *
 * Bu test iki tarafı bağlıyor: kodda çağrılan her olay listede olmalı.
 */

const KAYNAK = join(__dirname, '..')

function jsDosyalari(dizin, toplam = []) {
  for (const ad of readdirSync(dizin)) {
    /* Testler kendi sahte olaylarını kurabilir; taramaya girmiyorlar. */
    if (ad === '__tests__' || ad === 'node_modules') continue
    const yol = join(dizin, ad)
    if (statSync(yol).isDirectory()) jsDosyalari(yol, toplam)
    else if (/\.(js|jsx)$/.test(ad) && !/\.test\.(js|jsx)$/.test(ad)) toplam.push(yol)
  }
  return toplam
}

const analitikKaynagi = readFileSync(join(KAYNAK, 'services', 'analytics.js'), 'utf8')

function listeyiOku(ad) {
  const blok = new RegExp(`const ${ad} = new Set\\(\\[([\\s\\S]*?)\\]\\)`).exec(analitikKaynagi)
  if (!blok) throw new Error(`${ad} bulunamadı`)
  /* Yorumlar ayıklanıyor: içlerinde tırnaklı olay adları geçiyor. */
  const govde = blok[1].replace(/\/\*[\s\S]*?\*\//g, '')
  return new Set([...govde.matchAll(/'([^']+)'/g)].map(m => m[1]))
}

describe('analitik izin listesi', () => {
  const izinliOlaylar = listeyiOku('ALLOWED_EVENTS')
  const izinliOzellikler = listeyiOku('SAFE_PROPERTIES')

  it('çağrılan her olay izin listesinde', () => {
    const eksik = []
    for (const dosya of jsDosyalari(KAYNAK)) {
      const govde = readFileSync(dosya, 'utf8')
      for (const eslesme of govde.matchAll(/captureAnalytics\(\s*'([a-z_]+)'/g)) {
        if (!izinliOlaylar.has(eslesme[1])) {
          eksik.push(`${eslesme[1]} @ ${dosya.replace(KAYNAK, 'src')}`)
        }
      }
    }
    /* Düşerse: olay ALLOWED_EVENTS'e eklenmeli, yoksa hiç gönderilmiyor. */
    expect(eksik).toEqual([])
  })

  it('aktivasyon olayları listede', () => {
    /* Huninin en kritik iki basamağı; ayrıca kilitleniyor. */
    expect(izinliOlaylar.has('workspace_created')).toBe(true)
    expect(izinliOlaylar.has('record_created')).toBe(true)
  })

  it('aktivasyon özellikleri listede', () => {
    for (const ozellik of ['sector', 'workspace_index', 'record_type', 'direction', 'is_first_record']) {
      expect(izinliOzellikler.has(ozellik), `${ozellik} SAFE_PROPERTIES'te yok`).toBe(true)
    }
  })

  /*
   * ⚠️ Ticari veri taşıyabilecek alan adları listeye GİRMEMELİ.
   *
   * İzin listesinin var oluş sebebi bu; genişletirken sınırın
   * korunduğu da kontrol edilmeli.
   */
  it('ticari veri alanları izinli değil', () => {
    for (const yasak of ['title', 'amount', 'name', 'email', 'workspace_name', 'record_title']) {
      expect(izinliOzellikler.has(yasak), `${yasak} SAFE_PROPERTIES'e girmiş`).toBe(false)
    }
  })
})
