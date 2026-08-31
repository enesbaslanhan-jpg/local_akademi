import { describe, it, expect, afterEach } from 'vitest'
import { acilisBolumu, BOLUMLER } from '@/pages/SettingsPage'

/*
 * AYARLAR AÇILIŞ BÖLÜMÜ.
 *
 * 🔴 ÖLÇÜLMÜŞ ARIZA (31.08.2026): kod yalnız "?bolum=" sorgu
 * parametresini okuyordu ve izin listesinde 'uyelik' yoktu. Sonuç:
 * "/app/settings#uyelik" adresine giden HERKES "Profil ve işletme"
 * bölümüne düşüyordu.
 *
 * Bu tek hata dört ayrı yolu birden bozuyordu:
 *   - Fiyatlar sayfasındaki "Üyeliğim" düğmesi
 *   - Ödeme sonucu sayfasındaki "Üyelik ayarlarına dön"
 *   - "Ödemeniz alındı" bildiriminin bağlantısı
 *   - Ödeme e-postasındaki bağlantı
 *
 * 🦷 Bu testler o yolları koruyor. Hash okuması kaldırılırsa ya da
 * 'uyelik' listeden düşerse düşerler.
 */

function adresiKur(arama, hash) {
  /* jsdom'da `window.location` doğrudan yazılamıyor; sorgu ve hash
     `history` üzerinden kuruluyor. */
  window.history.replaceState({}, '', `/app/settings${arama}${hash}`)
}

afterEach(() => {
  window.history.replaceState({}, '', '/app/settings')
})

describe('ayarlar açılış bölümü', () => {
  it('🦷 #uyelik hash\'i ÜYELİK bölümünü açıyor', () => {
    adresiKur('', '#uyelik')
    expect(acilisBolumu(), 'hash okunmazsa profile döner').toBe('uyelik')
  })

  it('?bolum= sorgusu çalışmaya devam ediyor', () => {
    /* Dört yerde kullanılıyor (pazaryeri akışı); kırılmamalı. */
    adresiKur('?bolum=integrations', '')
    expect(acilisBolumu()).toBe('integrations')
  })

  it('sorgu, hash\'ten öncelikli', () => {
    adresiKur('?bolum=integrations', '#uyelik')
    expect(acilisBolumu()).toBe('integrations')
  })

  it('tanınmayan değer profile düşüyor', () => {
    adresiKur('?bolum=yokboyle', '#deolmayan')
    expect(acilisBolumu()).toBe('profile')
  })

  it('adres boşken profile açılıyor', () => {
    adresiKur('', '')
    expect(acilisBolumu()).toBe('profile')
  })

  it('sol gezinmedeki her bölüm listede', () => {
    /* Liste ile gezinme ayrışırsa, o bölüme giden bağlantı sessizce
       profile düşer — arızanın tam olarak çıkış sebebi buydu. */
    for (const bolum of ['profile', 'integrations', 'notifications', 'uyelik', 'appearance', 'security', 'privacy']) {
      expect(BOLUMLER, `${bolum} listede olmalı`).toContain(bolum)
    }
  })
})
