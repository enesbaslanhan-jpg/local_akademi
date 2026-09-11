import { describe, expect, it } from 'vitest'
import { WORKSPACE_NAV_TABS } from '@/pages/Workspaces/navigation'

/*
 * NAVIGASYON REGRESYON KORUMASI.
 *
 * Isletme Takibi bolumleri kaldirilamaz, yeniden adlandirilamaz veya
 * birlestirilemez. "Urunler" Siparisler ile Belgeler arasinda olmak
 * uzere beklenen sira asagidaki listedir. Sidebar ve ContextPanel
 * ayni diziyi paylasir; bu test tek kaynagi korur.
 */
const EXPECTED = [
  ['overview', 'workspace:nav.overview'],
  ['tracker', 'workspace:nav.records'],
  ['orders', 'workspace:nav.orders'],
  ['products', 'workspace:nav.products'],
  ['documents', 'workspace:nav.documents'],
  ['notifications', 'workspace:nav.notifications'],
  ['calendar', 'workspace:nav.calendar'],
  /* 09.09.2026'da eklendi: karar raporu. Bu liste bölümlerin sessizce
     kaybolmasını/yer değiştirmesini engelliyor; yeni bölüm eklemek
     bilinçli bir ürün kararı ve burada da yazılıyor. */
  ['decisions', 'workspace:nav.decisions'],
  ['loans', 'workspace:nav.loans'],
  ['accounts', 'workspace:nav.accounts'],
  ['employees', 'workspace:nav.employees'],
  ['team', 'workspace:nav.team'],
  ['contacts', 'workspace:nav.contacts'],
  ['activity', 'workspace:nav.activity'],
  ['settings', 'workspace:nav.settings']
]

describe('İşletme Takibi navigasyonu (regresyon)', () => {
  it('bölüm sırası ve etiketleri ürün kararına birebir uyar', () => {
    expect(WORKSPACE_NAV_TABS.map(({ id, i18nKey }) => [id, i18nKey])).toEqual(EXPECTED)
  })

  it('yollar sekmelerle tutarlıdır', () => {
    for (const tab of WORKSPACE_NAV_TABS) {
      expect(tab.path).toBe(tab.id)
    }
  })

  it('kopya id içermez', () => {
    const ids = WORKSPACE_NAV_TABS.map(tab => tab.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
