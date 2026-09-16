import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import WelcomePage from '@/pages/WelcomePage'

/* İlk temas tek vaat, canlı ürün önizlemesi ve iki açık yol sunar. */
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), capture: vi.fn(), complete: vi.fn(), auth: { user: { name: 'Enes Buğra Aslanhan' }, completeOnboarding: vi.fn() } }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('@/services/analytics', () => ({ captureAnalytics: mocks.capture }))
vi.mock('react-router-dom', async () => {
  const gercek = await vi.importActual('react-router-dom')
  return { ...gercek, useNavigate: () => mocks.navigate }
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.completeOnboarding = mocks.complete.mockResolvedValue({ onboardingCompleted: true })
})
afterEach(() => cleanup())

function ciz() { return render(<MemoryRouter><WelcomePage /></MemoryRouter>) }

describe('karşılama ekranı — tanıtım', () => {
  it('ada göre selamlar ve ürünün değerini tek sahnede anlatır', () => {
    ciz()
    expect(screen.getByRole('heading', { level: 1, name: /Enes, işletmen için daha net kararlar/ })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'LocalKarar ürün önizlemesi' })).toBeInTheDocument()
    expect(screen.getByText('Önemli olanı gör, güvenle ilerle.')).toBeInTheDocument()
  })

  it('ilk ekranda ödeme istemez, kurucu avantajını ikincil bağlantıda tutar', () => {
    ciz()
    expect(screen.queryByText(/kart numaras/i)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Kurucu üye avantajını incele' })).toHaveAttribute('href', '/fiyatlar')
    expect(screen.getByText(/sonraki 3 ay.*149.*ardından.*299/i)).toBeInTheDocument()
  })

  it('"Başlayalım" ankete, "Şimdilik geç" panoya götürür ve olayları yazar', async () => {
    const user = userEvent.setup()
    ciz()
    await user.click(screen.getByRole('button', { name: /İşletmemi kişiselleştir/ }))
    expect(mocks.navigate).toHaveBeenCalledWith('/app/onboarding', { replace: true })
    expect(mocks.capture).toHaveBeenCalledWith('welcome_started', { platform: 'web' })

    await user.click(screen.getByRole('button', { name: 'Şimdilik geç, uygulamayı keşfet' }))
    expect(mocks.complete).toHaveBeenCalledWith({ skipped: true })
    expect(mocks.navigate).toHaveBeenCalledWith('/app/dashboard', { replace: true })
    expect(mocks.capture).toHaveBeenCalledWith('welcome_skipped', { platform: 'web' })
  })

  it('ad yoksa genel başlık', () => {
    mocks.auth = { user: null, completeOnboarding: mocks.complete }
    ciz()
    expect(screen.getByRole('heading', { level: 1, name: 'İşletmen için daha net kararlar burada başlar.' })).toBeInTheDocument()
    mocks.auth = { user: { name: 'Enes Buğra Aslanhan' }, completeOnboarding: mocks.complete }
  })
})
