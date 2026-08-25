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
  ['overview', 'Genel Bakış'],
  ['tracker', 'Kayıtlar'],
  ['orders', 'Siparişler'],
  ['products', 'Ürünler'],
  ['documents', 'Belgeler'],
  ['notifications', 'Bildirimler'],
  ['calendar', 'Takvim'],
  ['team', 'Ekip'],
  ['contacts', 'Kişiler'],
  ['activity', 'Aktiviteler'],
  ['settings', 'Ayarlar']
]

describe('İşletme Takibi navigasyonu (regresyon)', () => {
  it('bölüm sırası ve etiketleri ürün kararına birebir uyar', () => {
    expect(WORKSPACE_NAV_TABS.map(({ id, label }) => [id, label])).toEqual(EXPECTED)
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
