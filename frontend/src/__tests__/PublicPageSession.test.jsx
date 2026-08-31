import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PricingPage from '@/pages/PricingPage'
import AboutPage from '@/pages/AboutPage'
import { useGirisli } from '@/hooks/useGirisli'

/*
 * HERKESE AÇIK SAYFALAR OTURUMU BİLMELİ.
 *
 * 🔴 Bu gerileme CANLIYA ÇIKTI (30.08.2026). Ürün sahibi giriş
 * yaptıktan sonra Ayarlar → "Fiyatları gör" bağlantısından fiyat
 * sayfasına gitti, "Ücretsiz başla"ya bastı ve HESAP OLUŞTURMA
 * formuna düştü — zaten hesabı olduğu hâlde.
 *
 * Sebep: `/fiyatlar` ve `/hakkinda` herkese açık sayfalar oldukları
 * için oturumu hiç dikkate almıyor, bütün eylemleri `/register` ve
 * `/login`e bağlıyorlardı.
 *
 * Bu testlerin koruduğu tek şey: girişli kullanıcı KAYIT ya da GİRİŞ
 * formuna yönlendirilmez.
 */

const oturum = vi.hoisted(() => ({ girisli: false }))
vi.mock('@/hooks/useGirisli', () => ({ useGirisli: () => oturum.girisli }))

/* Tema düğmesi `useTheme()` üzerinden ThemeProvider istiyor ve
   sağlayıcı yoksa fırlatıyor — orada bu doğru, tema gerçekten
   gerekli. Bu testin konusu bağlantı hedefleri; süsü taklit edip
   sağlayıcı ağacı kurmakla uğraşmıyoruz. */
vi.mock('@/pages/AuthThemeToggle', () => ({ default: () => null }))

function sar(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

/** Sayfadaki bütün uygulama içi bağlantı hedefleri. */
function hedefler() {
  return screen.getAllByRole('link').map(a => a.getAttribute('href'))
}

afterEach(() => {
  cleanup()
  oturum.girisli = false
})

describe('fiyat sayfası', () => {
  it('GİRİŞSİZ: kayıt ve giriş bağlantıları var', () => {
    sar(<PricingPage />)
    const h = hedefler()
    expect(h).toContain('/register')
    expect(h).toContain('/login')
  })

  it('🦷 GİRİŞLİ: kayıt/giriş formuna HİÇ bağlantı yok', () => {
    oturum.girisli = true
    sar(<PricingPage />)

    const h = hedefler()
    expect(h, 'girişli kullanıcı kayıt formuna yollanmaz').not.toContain('/register')
    expect(h, 'girişli kullanıcı giriş formuna yollanmaz').not.toContain('/login')
  })

  it('GİRİŞLİ: bunun yerine kendi üyelik ayarlarına götürür', () => {
    oturum.girisli = true
    sar(<PricingPage />)

    /*
     * ⚠️ Biçime DEĞİL hedefe bakılıyor.
     *
     * Depoda iki gelenek yan yana yaşıyor: `?bolum=uyelik` ve
     * `#uyelik`. İkisi de `acilisBolumu()` tarafından okunuyor
     * (SettingsBolum testleri bunu ayrıca koruyor). Testi tek bir
     * yazıma çakmak, çalışan bir bağlantı yüzünden düşen bir teste
     * yol açardı — korunması gereken şey kullanıcının ÜYELİK
     * bölümüne varması.
     */
    const uyelige = hedefler().filter(h => /\/app\/settings[?#].*uyelik/.test(h))
    expect(uyelige.length, 'üyelik bölümüne giden bir bağlantı olmalı').toBeGreaterThan(0)
  })
})

describe('hakkında sayfası', () => {
  it('GİRİŞSİZ: kayıt ve giriş bağlantıları var', () => {
    sar(<AboutPage />)
    const h = hedefler()
    expect(h).toContain('/register')
    expect(h).toContain('/login')
  })

  it('🦷 GİRİŞLİ: kayıt/giriş formuna HİÇ bağlantı yok', () => {
    oturum.girisli = true
    sar(<AboutPage />)

    const h = hedefler()
    expect(h).not.toContain('/register')
    expect(h).not.toContain('/login')
    /* Üç ayrı yerde CTA var (üst gezinme, kahraman, kapanış);
       üçü de uygulamaya dönmeli. */
    expect(h.filter(x => x === '/app/dashboard').length).toBeGreaterThanOrEqual(3)
  })
})

describe('useGirisli kancası', () => {
  it('sağlayıcı yokken FIRLATMAZ, false döner', async () => {
    /* Gerçek kancayı yükle — yukarıdaki mock yalnız sayfalar için.
       `useAuth()` kullanılsaydı burada fırlatır ve sağlayıcısız her
       testi düşürürdü; `FounderBadge` bu dersi bir kez verdi. */
    vi.doUnmock('@/hooks/useGirisli')
    const { useGirisli: gercek } = await vi.importActual('@/hooks/useGirisli')

    function Deneme() {
      return <span data-testid="sonuc">{String(gercek())}</span>
    }

    render(<Deneme />)
    expect(screen.getByTestId('sonuc')).toHaveTextContent('false')
  })
})

/* Mock'un gerçekten devrede olduğunun kanıtı — yoksa yukarıdaki
   bütün testler yanlışlıkla gerçek kancayla çalışır ve hep `false`
   görüp sessizce "geçer". */
describe('test kurulumu', () => {
  it('oturum mock`u sayfaları etkiliyor', () => {
    oturum.girisli = true
    expect(useGirisli()).toBe(true)
    oturum.girisli = false
    expect(useGirisli()).toBe(false)
  })
})
