import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AuthPage from '@/pages/AuthPage'
import { sosyalYapilandirmayiSifirla } from '@/components/auth/SosyalGiris'

/*
 * SOSYAL GİRİŞ — arayüz (16.09.2026).
 * - Sunucu sağlayıcıyı kapalı bildirirse düğme ve "veya" ayırıcısı YOK
 *   ("yakında" gibi pasif düğme yok).
 * - Apple açıkken düğme var; sağlayıcıdan gelen kimlik sunucuya gider.
 * - İlk girişte 409 CONSENT_REQUIRED → onay kutusu; onaylayınca aynı
 *   belirteç acceptedLegal:true ile yeniden gönderilir.
 */
const mocks = vi.hoisted(() => ({ socialLogin: vi.fn(), navigate: vi.fn(), config: { google: { enabled: false }, apple: { enabled: false } } }))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn(), register: vi.fn(), socialLogin: mocks.socialLogin })
}))
vi.mock('react-router-dom', async () => {
  const gercek = await vi.importActual('react-router-dom')
  return { ...gercek, useNavigate: () => mocks.navigate }
})
vi.mock('@/pages/AuthThemeToggle', () => ({ default: () => null }))

function ciz() {
  return render(<MemoryRouter><AuthPage mode="login" /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  sosyalYapilandirmayiSifirla()
  globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ socialLogin: mocks.config }) }))
  /* Apple JS betiği testte yüklenmez; sahte AppleID nesnesi ve betik yükleyici. */
  window.AppleID = { auth: { init: vi.fn(), signIn: vi.fn() } }
  vi.spyOn(document.head, 'appendChild').mockImplementation(el => { setTimeout(() => el.onload?.(), 0); return el })
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); delete window.AppleID })

describe('AuthPage sosyal giriş', () => {
  it('iki sağlayıcı da kapalıysa düğme ve ayırıcı çizilmez', async () => {
    mocks.config = { google: { enabled: false, webClientId: null }, apple: { enabled: false, webServicesId: null } }
    ciz()
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: /Apple/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Google/ })).toBeNull()
    expect(screen.queryByText('veya')).toBeNull()
    expect(screen.getByRole('link', { name: 'Fiyatlar ve Kurucu Üye kampanyası' })).toHaveAttribute('href', '/fiyatlar')
  })

  it('Apple açık: düğme var, kimlik sunucuya gider, başarıda panoya yönlenir', async () => {
    mocks.config = { google: { enabled: false, webClientId: null }, apple: { enabled: true, webServicesId: 'com.localkarar.web' } }
    window.AppleID.auth.signIn.mockResolvedValue({ authorization: { id_token: 'apple-jwt', code: 'kod' }, user: { name: { firstName: 'Ayşe', lastName: 'K' } } })
    mocks.socialLogin.mockResolvedValue({ isNewUser: false, user: {} })
    ciz()
    const dugme = await screen.findByRole('button', { name: /Apple/ })
    await waitFor(() => expect(dugme).toBeEnabled())
    await userEvent.setup().click(dugme)
    await waitFor(() => expect(mocks.socialLogin).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'apple', idToken: 'apple-jwt', authorizationCode: 'kod', name: 'Ayşe K', acceptedLegal: undefined })
    ))
    expect(mocks.navigate).toHaveBeenCalledWith('/app/dashboard', { replace: true })
  })

  it('ilk girişte onay istenir; onaylayınca aynı belirteç acceptedLegal:true ile gider ve karşılamaya yönlenir', async () => {
    mocks.config = { google: { enabled: false, webClientId: null }, apple: { enabled: true, webServicesId: 'com.localkarar.web' } }
    window.AppleID.auth.signIn.mockResolvedValue({ authorization: { id_token: 'yeni-jwt', code: 'kod2' } })
    const onayHatasi = Object.assign(new Error('CONSENT_REQUIRED'), { status: 409, apiMessage: 'CONSENT_REQUIRED' })
    mocks.socialLogin.mockRejectedValueOnce(onayHatasi).mockResolvedValueOnce({ isNewUser: true, user: {} })
    ciz()
    const user = userEvent.setup()
    const dugme = await screen.findByRole('button', { name: /Apple/ })
    await waitFor(() => expect(dugme).toBeEnabled())
    await user.click(dugme)

    expect(await screen.findByText(/Yeni hesap oluşturuluyor/)).toBeInTheDocument()
    const devam = screen.getByRole('button', { name: 'Onayla ve devam et' })
    expect(devam).toBeDisabled()
    await user.click(screen.getByRole('checkbox'))
    await user.click(devam)
    await waitFor(() => expect(mocks.socialLogin).toHaveBeenLastCalledWith(
      expect.objectContaining({ provider: 'apple', idToken: 'yeni-jwt', acceptedLegal: true })
    ))
    expect(mocks.navigate).toHaveBeenCalledWith('/app/hosgeldin', { replace: true })
  })
})
