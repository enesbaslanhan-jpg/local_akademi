import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

const navigate = vi.fn()
let konum = { pathname: '/app/dashboard' }

vi.mock('react-router-dom', async () => {
  const gercek = await vi.importActual('react-router-dom')
  return { ...gercek, useNavigate: () => navigate, useLocation: () => konum }
})

const completeTour = vi.fn()
vi.mock('@/services/api', () => ({ api: { onboarding: { completeTour: () => completeTour() } } }))

const { default: WelcomeTour } = await import('./WelcomeTour')
const TUR = { name: 'Karşılama turu' }

beforeEach(() => {
  navigate.mockReset()
  konum = { pathname: '/app/dashboard' }
  completeTour.mockReset().mockResolvedValue({ tourCompleted: true })
  document.body.innerHTML = ''
})

afterEach(() => { document.body.innerHTML = '' })

async function cizVeBaslat() {
  const sonuc = render(<MemoryRouter><WelcomeTour /></MemoryRouter>)
  act(() => window.dispatchEvent(new CustomEvent('localkarar:start-tour')))
  await screen.findByRole('dialog', TUR)
  return sonuc
}

describe('WelcomeTour — isteğe bağlı açılış', () => {
  it('kendiliğinden açılmaz', () => {
    render(<MemoryRouter><WelcomeTour /></MemoryRouter>)
    expect(screen.queryByRole('dialog', TUR)).not.toBeInTheDocument()
  })

  it('açık kullanıcı eylemiyle başlar', async () => {
    await cizVeBaslat()
    expect(screen.getByRole('dialog', TUR)).toBeInTheDocument()
  })
})

describe('WelcomeTour — bölümlere gezinme', () => {
  it('her adım kendi sayfasına gider', async () => {
    await cizVeBaslat()
    const beklenen = [
      ['Karar Araçları', '/app/decision-checks'],
      ['İşletme Takibi', '/app/workspaces'],
      ['AI Mentor', '/app/mentor'],
      ['Topluluk', '/app/community/topluluk']
    ]
    for (const [baslik, yol] of beklenen) {
      await userEvent.click(screen.getByRole('button', { name: 'İleri' }))
      expect(screen.getByText(baslik)).toBeInTheDocument()
      await waitFor(() => expect(navigate).toHaveBeenCalledWith(yol))
      konum = { pathname: yol }
    }
  })

  it('tur bitince panoya döner ve bitiş olayını yayınlar', async () => {
    const finished = vi.fn()
    window.addEventListener('localkarar:tour-finished', finished, { once: true })
    await cizVeBaslat()
    await userEvent.click(screen.getByRole('button', { name: 'Turu atla' }))
    expect(navigate).toHaveBeenCalledWith('/app/dashboard')
    expect(finished).toHaveBeenCalledTimes(1)
  })
})

describe('WelcomeTour — ilerleme ve bitirme', () => {
  it('adımlar sırayla ilerler ve sayaç güncellenir', async () => {
    await cizVeBaslat()
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'İleri' }))
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Geri' }))
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('son adımda tamamlanır', async () => {
    await cizVeBaslat()
    for (let i = 0; i < 4; i++) await userEvent.click(screen.getByRole('button', { name: 'İleri' }))
    await userEvent.click(screen.getByRole('button', { name: 'Başlayalım' }))
    await waitFor(() => expect(completeTour).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog', TUR)).not.toBeInTheDocument()
  })

  it('sunucu hatasında da kapanır', async () => {
    completeTour.mockRejectedValue(new Error('ağ hatası'))
    await cizVeBaslat()
    await userEvent.click(screen.getByRole('button', { name: 'Turu atla' }))
    await waitFor(() => expect(screen.queryByRole('dialog', TUR)).not.toBeInTheDocument())
  })

  it('hedef DOM’da yoksa ortalanmış balonu gösterir', async () => {
    await cizVeBaslat()
    expect(screen.getByText('Kontrol Merkezi')).toBeInTheDocument()
  })
})
