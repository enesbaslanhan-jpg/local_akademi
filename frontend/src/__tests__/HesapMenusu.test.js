import { describe, expect, it } from 'vitest'
import { HESAP_MENUSU } from '@/components/layout/Header'
import { BOLUMLER, bolumSec } from '@/pages/SettingsPage'

/*
 * HESAP MENÜSÜNDE İKİ SATIR AYNI YERE GİTMEZ.
 *
 * 🔴 Ürün sahibi bu sınıf hatayı AYNI TURDA İKİ KEZ yakaladı:
 *
 *   1. "fiyatlandırmanın tamamını gör ve fiyatlandırmayı incele aynı
 *      yere gidiyor"
 *   2. "profil ve işletme ile ayarlar aynı yere gidiyor"
 *
 * İkincisi sinsiydi çünkü adresler FARKLI görünüyordu:
 * `/app/settings` ile `/app/settings?bolum=profile`. Ama bölüm
 * verilmeyen her adres `profile`a düşüyor, yani ikisi aynı ekranı
 * açıyordu. Metinsel karşılaştırma bunu YAKALAMAZ — bu yüzden test
 * adresleri değil, ÇÖZÜLEN BÖLÜMÜ karşılaştırıyor.
 *
 * ⚠️ Kural kopyalanmıyor: `bolumSec` uygulamanın kendi işlevi. Testin
 * içine "bölüm yoksa profile" mantığını yeniden yazsaydım, uygulama
 * kuralı değiştiğinde test yine geçer ve hiçbir şey korumazdı.
 */

/** Menü hedefindeki sorgu ve hash parçalarını ayırır. */
function parcala(yol) {
  const [gerisi, hash = ''] = yol.split('#')
  const [, search = ''] = gerisi.split('?')
  return { search, hash }
}

describe('hesap menüsü', () => {
  it('boş değil ve üyelik kısayolunu taşıyor', () => {
    /* Menünün var olma sebebi buydu: üyelik ekranı üç tık uzaktaydı. */
    expect(HESAP_MENUSU.length).toBeGreaterThan(0)
    expect(HESAP_MENUSU.some(o => o.yol.includes('uyelik'))).toBe(true)
  })

  /*
   * ⚠️ MENÜ ARTIK YALNIZ AYARLAR BÖLÜMLERİNE GİTMİYOR.
   *
   * `/app/bildirimler` eklendi (03.09.2026): bildirimler sayfasına tek
   * giriş üst çubuktaki zildi, zili fark etmeyen kullanıcı üyelik ve
   * ödeme bildirimlerini hiç göremiyordu.
   *
   * Bu yüzden bölüm kuralları YALNIZ ayarlara giden satırlara
   * uygulanıyor. Kuralın kendisi zayıflamadı — aşağıdaki iki test hâlâ
   * "iki ayar satırı aynı bölümü açamaz" ve "bölüm açıkça yazılmalı"
   * diyor; üstüne bir de "hiçbir iki satır aynı adrese gitmez" geldi.
   */
  const ayarSatirlari = HESAP_MENUSU.filter(o => o.yol.startsWith('/app/settings'))
  const digerSatirlar = HESAP_MENUSU.filter(o => !o.yol.startsWith('/app/settings'))

  it('🦷 hiçbir iki satır AYNI adrese gitmiyor', () => {
    const yollar = HESAP_MENUSU.map(o => o.yol)
    expect(new Set(yollar).size, `çakışan adresler: ${yollar.join(', ')}`).toBe(yollar.length)
  })

  it('🦷 hiçbir iki AYAR satırı AYNI bölüme gitmiyor', () => {
    const bolumler = ayarSatirlari.map(o => {
      const { search, hash } = parcala(o.yol)
      return bolumSec(search, hash)
    })

    expect(new Set(bolumler).size, `çakışan hedefler: ${bolumler.join(', ')}`).toBe(bolumler.length)
  })

  it('🦷 her AYAR hedefi GERÇEK bir bölüm açıyor — sessizce profile düşmüyor', () => {
    /*
     * Avatar önceden `/app/settings#hesap`e gidiyordu ve "hesap"
     * `BOLUMLER` listesinde yok; `bolumSec` onu tanımayıp sessizce
     * profile düşürüyordu. Yani düğme yanlış adrese gidiyor ama
     * hiçbir yerde hata görünmüyordu.
     *
     * Bu test o sessizliği kapatıyor: menüdeki bir hedefin bölümü
     * açıkça yazılmış olmalı.
     */
    expect(ayarSatirlari.length, 'ayarlara giden satır kalmamış').toBeGreaterThan(0)

    for (const { yol } of ayarSatirlari) {
      const { search, hash } = parcala(yol)
      const istenen = new URLSearchParams(search).get('bolum') || hash.replace(/^#/, '')

      expect(istenen, `${yol} hiç bölüm belirtmiyor`).toBeTruthy()
      expect(BOLUMLER, `${yol} tanınmayan bir bölüm istiyor: ${istenen}`).toContain(istenen)
      expect(bolumSec(search, hash)).toBe(istenen)
    }
  })

  it('🦷 ayarlar dışındaki hedefler uygulama içi mutlak adres', () => {
    /*
     * Bu satırlar `bolumSec`ten geçmiyor, yani yukarıdaki bekçilerin
     * hiçbiri onlara bakmıyor. En azından biçimleri doğrulanıyor:
     * göreli ya da dış bir adres menüye sızarsa yakalanır.
     */
    for (const { yol } of digerSatirlar) {
      expect(yol, `${yol} /app/ ile başlamıyor`).toMatch(/^\/app\/[a-z0-9-]/i)
      expect(yol, `${yol} sorgu/hash taşıyor — ayar satırı mı?`).not.toMatch(/[?#]/)
    }
  })

  it('her satırın etiketi ve ikonu var', () => {
    for (const oge of HESAP_MENUSU) {
      expect(oge.etiket, `${oge.yol} etiketsiz`).toMatch(/^[a-z]/i)
      /* ⚠️ `typeof === 'function'` DEĞİL: lucide ikonları `forwardRef`
         ile sarılı NESNELER. İlk yazdığımda test bu yüzden düştü. */
      expect(oge.Ikon, `${oge.yol} ikonsuz`).toBeTruthy()
    }
  })
})
