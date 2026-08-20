import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

/*
 * Şerit "yumuşak kapı"nın görünen yüzü. Kritik davranış: DOĞRULANMIŞ
 * kullanıcıya asla çıkmamalı, doğrulanmamışa çıkmalı. Yanlış tarafa
 * düşerse ya kullanıcı boşuna uyarılır ya da hiç uyarılmaz.
 */

const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const gercek = await vi.importActual('react-router-dom')
  return { ...gercek, useNavigate: () => navigate }
})

const updateUser = vi.fn()
let sahteKullanici = null
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: sahteKullanici, updateUser })
}))

const requestEmailVerification = vi.fn()
vi.mock('@/services/api', () => ({
  api: { auth: { requestEmailVerification: () => requestEmailVerification() } }
}))

const { default: VerificationBanner } = await import('./VerificationBanner')

function ciz() {
  return render(<MemoryRouter><VerificationBanner /></MemoryRouter>)
}

beforeEach(() => {
  window.sessionStorage.clear()
  navigate.mockReset()
  updateUser.mockReset()
  requestEmailVerification.mockReset().mockResolvedValue({ success: true })
  sahteKullanici = { id: 1, email: 'a@b.test', emailVerified: false }
})

afterEach(() => { document.body.innerHTML = '' })

describe('VerificationBanner', () => {
  it('doğrulanmamış kullanıcıya görünür', () => {
    ciz()
    expect(screen.getByText(/doğrulanmadı/i)).toBeInTheDocument()
  })

  it('doğrulanmış kullanıcıya GÖRÜNMEZ', () => {
    sahteKullanici = { id: 1, email: 'a@b.test', emailVerified: true }
    const { container } = ciz()
    expect(container).toBeEmptyDOMElement()
  })

  it('oturum açılmamışsa görünmez', () => {
    sahteKullanici = null
    const { container } = ciz()
    expect(container).toBeEmptyDOMElement()
  })

  it('alan hiç gelmemişse görünmez — yanlış uyarı vermez', () => {
    /* Eski sunucu `emailVerified` döndürmezse alan `undefined` olur.
       Bunu "doğrulanmamış" saymak, doğrulamış kullanıcıyı boşuna
       uyarmak demektir. */
    sahteKullanici = { id: 1, email: 'a@b.test' }
    const { container } = ciz()
    expect(container).toBeEmptyDOMElement()
  })

  it('kapatılınca gizlenir ve sessionStorage işaretlenir', async () => {
    ciz()
    await userEvent.click(screen.getByRole('button', { name: /gizle/i }))
    expect(screen.queryByText(/doğrulanmadı/i)).not.toBeInTheDocument()
    expect(window.sessionStorage.getItem('localkarar-verify-banner-dismissed')).toBe('true')
  })

  it('önceden kapatılmışsa hiç çizilmez', () => {
    window.sessionStorage.setItem('localkarar-verify-banner-dismissed', 'true')
    const { container } = ciz()
    expect(container).toBeEmptyDOMElement()
  })

  it('Doğrula kod ister ve doğrulama sayfasına götürür', async () => {
    ciz()
    await userEvent.click(screen.getByRole('button', { name: /doğrula/i }))
    await waitFor(() => expect(requestEmailVerification).toHaveBeenCalled())
    expect(navigate).toHaveBeenCalledWith('/verify-email')
  })

  it('sunucu zaten doğrulanmış derse yönlendirmez, oturumu günceller', async () => {
    requestEmailVerification.mockResolvedValue({ alreadyVerified: true })
    ciz()
    await userEvent.click(screen.getByRole('button', { name: /doğrula/i }))
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ emailVerified: true }))
    expect(navigate).not.toHaveBeenCalled()
  })

  it('kod gönderilemezse hata gösterir, şerit kalır', async () => {
    requestEmailVerification.mockRejectedValue(new Error('Sunucuya ulaşılamadı'))
    ciz()
    await userEvent.click(screen.getByRole('button', { name: /doğrula/i }))
    expect(await screen.findByText(/Sunucuya ulaşılamadı/)).toBeInTheDocument()
    expect(screen.getByText(/doğrulanmadı/i)).toBeInTheDocument()
  })
})
