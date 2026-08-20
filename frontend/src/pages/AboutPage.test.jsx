import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/*
 * Hakkında sayfası, giriş yapmamış ziyaretçinin gördüğü İLK sayfa.
 * Testler iki şeyi koruyor:
 *
 * 1. Giriş/kayıt yollarının varlığı — bunlar kopunca ziyaretçinin
 *    hesap açmasının yolu kalmaz ve bunu kimse fark etmez.
 * 2. "Neyi yapmaz?" bölümü — ürünün sınırlarını açıkça yazmak Kullanım
 *    Koşulları'yla tutarlılık meselesi, süsleme değil. Sessizce
 *    silinmemeli.
 */

vi.mock('@/context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn(), setTheme: vi.fn() })
}))

const { default: AboutPage } = await import('./AboutPage')

function ciz() {
  return render(<MemoryRouter><AboutPage /></MemoryRouter>)
}

describe('AboutPage', () => {
  it('ürünü tanıtan başlığı gösterir', () => {
    ciz()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('İşletmen için doğru kararlar')
  })

  it('altı modülü de anlatır', () => {
    ciz()
    for (const baslik of ['Karar Araçları', 'İşletme Takibi', 'AI Mentor', 'Hesaplamalar', 'Kurslar', 'Topluluk']) {
      expect(screen.getByRole('heading', { name: baslik, level: 3 })).toBeInTheDocument()
    }
  })

  it('🔴 giriş ve kayıt yolları bulunur', () => {
    ciz()
    const hedefler = screen.getAllByRole('link').map(a => a.getAttribute('href'))
    expect(hedefler).toContain('/login')
    expect(hedefler).toContain('/register')
  })

  it('🔴 ürünün sınırlarını açıkça yazar', () => {
    ciz()
    expect(screen.getByRole('heading', { name: 'Neyi yapmaz?' })).toBeInTheDocument()
    expect(screen.getByText(/danışmanlığının yerine geçmez/)).toBeInTheDocument()
  })

  it('yasal metinlere bağlantı verir', () => {
    ciz()
    const hedefler = screen.getAllByRole('link').map(a => a.getAttribute('href'))
    for (const yol of ['/privacy', '/terms', '/cookies']) {
      expect(hedefler).toContain(yol)
    }
  })

  it('tema düğmesi bulunur — ziyaretçi giriş yapmadan modu değiştirebilir', () => {
    ciz()
    expect(screen.getByRole('button', { name: /moda geç/i })).toBeInTheDocument()
  })
})
