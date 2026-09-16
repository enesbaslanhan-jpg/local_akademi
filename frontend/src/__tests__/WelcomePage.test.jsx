import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WelcomePage from '@/pages/WelcomePage'

/*
 * KARŞILAMA (16.09.2026): "ekran bomboş, sadece fiyatlar" şikâyeti sonrası.
 * Kilitlenen: ürünün ne olduğunu anlatan yedi bölüm; fiyat tek satır;
 * "Başlayalım" → anket (/app/onboarding), "Şimdilik geç" → pano.
 */
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), capture: vi.fn(), auth: { user: { name: 'Enes Buğra Aslanhan' } } }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/services/analytics', () => ({ captureAnalytics: mocks.capture }))
vi.mock('react-router-dom', async () => {
  const gercek = await vi.importActual('react-router-dom')
  return { ...gercek, useNavigate: () => mocks.navigate }
})

beforeEach(() => vi.clearAllMocks())
afterEach(() => cleanup())

function ciz() { return render(<MemoryRouter><WelcomePage /></MemoryRouter>) }

describe('karşılama ekranı — tanıtım', () => {
  it('ada göre selamlar ve yedi bölümü anlatır', () => {
    ciz()
    expect(screen.getByRole('heading', { level: 1, name: 'Hoş geldin, Enes' })).toBeInTheDocument()
    const liste = screen.getByRole('list', { name: 'LocalKarar bölümleri' })
    expect(liste.querySelectorAll('li')).toHaveLength(7)
    for (const baslik of ['Kontrol Merkezi', 'Hesaplamalar', 'Kurslar']) {
      expect(screen.getByRole('heading', { level: 2, name: baslik })).toBeInTheDocument()
    }
  })

  it('fiyat tek satır: ücretsiz ay + sonraki fiyatlar; kart alanı yok', () => {
    ciz()
    expect(screen.getByText(/İlk 1 ay ücretsiz, kart bilgisi yok\. Sonrası ₺149 \/ ₺299\/ay/)).toBeInTheDocument()
    expect(screen.queryByText(/kart numaras/i)).not.toBeInTheDocument()
  })

  it('"Başlayalım" ankete, "Şimdilik geç" panoya götürür ve olayları yazar', async () => {
    const user = userEvent.setup()
    ciz()
    await user.click(screen.getByRole('button', { name: /Başlayalım/ }))
    expect(mocks.navigate).toHaveBeenCalledWith('/app/onboarding', { replace: true })
    expect(mocks.capture).toHaveBeenCalledWith('welcome_started', { platform: 'web' })

    await user.click(screen.getByRole('button', { name: 'Şimdilik geç' }))
    expect(mocks.navigate).toHaveBeenCalledWith('/app/dashboard', { replace: true })
    expect(mocks.capture).toHaveBeenCalledWith('welcome_skipped', { platform: 'web' })
  })

  it('ad yoksa genel başlık', () => {
    mocks.auth = { user: null }
    ciz()
    expect(screen.getByRole('heading', { level: 1, name: 'Aramıza hoş geldin' })).toBeInTheDocument()
    mocks.auth = { user: { name: 'Enes Buğra Aslanhan' } }
  })
})
