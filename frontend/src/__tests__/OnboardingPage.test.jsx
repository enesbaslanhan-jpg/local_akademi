import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import OnboardingPage from '@/pages/OnboardingPage'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  complete: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  capture: vi.fn()
}))

vi.mock('react-router-dom', async () => {
  const real = await vi.importActual('react-router-dom')
  return { ...real, useNavigate: () => mocks.navigate }
})
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ completeOnboarding: mocks.complete }) }))
vi.mock('@/services/api', () => ({ api: { onboarding: { getProfile: mocks.getProfile, updateProfile: mocks.updateProfile } } }))
vi.mock('@/services/analytics', () => ({ captureAnalytics: mocks.capture }))

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  mocks.getProfile.mockResolvedValue({ sector: '', primaryGoal: '', challenges: [] })
  mocks.updateProfile.mockResolvedValue({})
  mocks.complete.mockResolvedValue({ onboardingCompleted: true })
})

function draw() {
  return render(<MemoryRouter><OnboardingPage /></MemoryRouter>)
}

describe('kısa ve opsiyonel onboarding', () => {
  it('üç cevapla profili kaydeder ve panoya gider', async () => {
    const user = userEvent.setup()
    draw()
    await user.click(await screen.findByRole('radio', { name: 'Perakende / Mağaza' }))
    await user.click(screen.getByRole('button', { name: /Devam/ }))
    await user.click(screen.getByRole('radio', { name: 'Satışları artırmak' }))
    await user.click(screen.getByRole('button', { name: /Devam/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Bütçe ve nakit akışı' }))
    await user.click(screen.getByRole('button', { name: /Bana özel alanı hazırla/ }))

    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith({
      sector: 'retail',
      primaryGoal: 'increase_sales',
      challenges: ['cash_flow']
    }))
    expect(mocks.complete).toHaveBeenCalledWith()
    expect(mocks.navigate).toHaveBeenCalledWith('/app/dashboard', { replace: true })
  })

  it('her adımda atlanır ve profil zorunluluğu istemez', async () => {
    const user = userEvent.setup()
    draw()
    await user.click(await screen.findByRole('button', { name: 'Şimdilik geç' }))
    await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith({ skipped: true }))
    expect(mocks.updateProfile).not.toHaveBeenCalled()
    expect(mocks.navigate).toHaveBeenCalledWith('/app/dashboard', { replace: true })
  })

  it('profil kaydı başarısızsa teknik hata kodu yerine kurtarma sunar', async () => {
    const user = userEvent.setup()
    mocks.updateProfile.mockRejectedValue(Object.assign(new Error('API_ERROR'), { code: 'API_ERROR' }))
    draw()
    await user.click(await screen.findByRole('radio', { name: 'Perakende / Mağaza' }))
    await user.click(screen.getByRole('button', { name: /Devam/ }))
    await user.click(screen.getByRole('radio', { name: 'Satışları artırmak' }))
    await user.click(screen.getByRole('button', { name: /Devam/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Bütçe ve nakit akışı' }))
    await user.click(screen.getByRole('button', { name: /Bana özel alanı hazırla/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Seçimlerin kaydedilemedi')
    expect(screen.queryByText('API_ERROR')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Kaydetmeden uygulamaya devam et' })).toBeInTheDocument()
  })
})
