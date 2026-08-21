import { describe, it, expect, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/*
 * Hakkında sayfasına eklenen GERÇEK MODÜL EKRANLARI.
 *
 * "Neyi yapmaz?" bölümü ve giriş/kayıt bağlantıları burada TEST
 * EDİLMİYOR — onları `pages/AboutPage.test.jsx` zaten koruyor. Aynı şeyi
 * iki dosyada tutmak, birini güncelleyip diğerini unutmaya davet.
 *
 * Buradaki asıl risk sessiz: `EkranCizimi` tanımadığı bir `tur` için
 * null döner. Modül listesindeki tek harflik bir yazım hatası, o modülün
 * görüntüsünü hiçbir hata vermeden yok eder — sayfa çalışmaya devam eder,
 * yalnız görsel eksilir. Gözle yakalamak için altı modülü tek tek
 * açmak gerekir.
 */

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn(), setTheme: vi.fn() })
}))

const { default: AboutPage } = await import('@/pages/AboutPage')
const { default: EkranCizimi } = await import('@/components/about/EkranCizimi')

function ciz() {
  return render(<MemoryRouter><AboutPage /></MemoryRouter>)
}

describe('Hakkında — modül ekranları', () => {
  it('altı modülün HER BİRİ gerçek ekran görüntüsü gösterir', () => {
    const { container } = ciz()
    const moduller = container.querySelectorAll('article')
    expect(moduller.length).toBe(6)

    for (const modul of moduller) {
      const baslik = modul.querySelector('h3')?.textContent
      const ekran = modul.querySelector('img[src^="/about-screens/"]')
      expect(ekran, `"${baslik}" modülünün ekran görüntüsü yok`).not.toBeNull()
      expect(ekran.getAttribute('src')).toMatch(/\.png\?v=\d+$/)
    }
  })

  it('bilinmeyen tür sessizce hiçbir görsel göstermez — yukarıdaki testin dayandığı davranış', () => {
    const { container } = render(<EkranCizimi tur="olmayan-bir-tur" />)
    expect(container.querySelector('img')).toBeNull()
  })

  it('ekran görüntüsü büyütülüp kapatılabilir', () => {
    render(<EkranCizimi tur="hesaplamalar" />)
    fireEvent.click(screen.getByRole('button', { name: 'Hesaplamalar ekran görüntüsünü büyüt' }))
    expect(screen.getByRole('dialog', { name: 'Hesaplamalar ekran görüntüsü' })).toBeTruthy()
    expect(screen.getByAltText('Hesaplamalar ekranının büyük görünümü')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Görseli kapat' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('her modül en az üç somut madde taşır', () => {
    const { container } = ciz()
    for (const modul of container.querySelectorAll('article')) {
      const baslik = modul.querySelector('h3')?.textContent
      const maddeler = modul.querySelectorAll('ul li')
      expect(maddeler.length, `"${baslik}" maddesiz`).toBeGreaterThanOrEqual(3)
    }
  })

  it('yardım sayfasına bağlantı var', () => {
    const { container } = ciz()
    const yollar = [...container.querySelectorAll('a')].map(a => a.getAttribute('href'))
    expect(yollar).toContain('/yardim')
  })
})
