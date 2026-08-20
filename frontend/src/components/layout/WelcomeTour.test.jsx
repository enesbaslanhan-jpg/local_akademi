import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

/*
 * Turun iki kritik davranışı var:
 *
 * 1. GÖRÜNME KOŞULU — yanlış tarafa düşerse ya turu bitirmiş kullanıcıya
 *    tekrar gösterilir ya da hiç gösterilmez. İkisi de sessiz hatadır.
 * 2. GEZİNME — turun bütün değeri kullanıcıyı bölümlerin içine
 *    götürmesinde. İlk sürüm bunu yapmıyordu: ana sayfadan hiç çıkmadan
 *    kenar çubuğunu işaret ediyordu, yani bir menü turuydu. Aşağıdaki
 *    testler her adımın gerçekten o yola gittiğini doğruluyor.
 */

const navigate = vi.fn()
let konum = { pathname: '/app/dashboard' }

vi.mock('react-router-dom', async () => {
  const gercek = await vi.importActual('react-router-dom')
  return { ...gercek, useNavigate: () => navigate, useLocation: () => konum }
})

const getStatus = vi.fn()
const completeTour = vi.fn()
vi.mock('@/services/api', () => ({
  api: {
    onboarding: {
      getStatus: () => getStatus(),
      completeTour: () => completeTour()
    }
  }
}))

const { default: WelcomeTour } = await import('./WelcomeTour')

const TUR = { name: 'Karşılama turu' }

beforeEach(() => {
  navigate.mockReset()
  konum = { pathname: '/app/dashboard' }
  getStatus.mockReset()
  completeTour.mockReset().mockResolvedValue({ tourCompleted: true })
  document.body.innerHTML = ''
})

afterEach(() => { document.body.innerHTML = '' })

async function ciz(durum) {
  getStatus.mockResolvedValue(durum)
  const sonuc = render(<MemoryRouter><WelcomeTour /></MemoryRouter>)
  await waitFor(() => expect(getStatus).toHaveBeenCalled())
  return sonuc
}

const ACIK = { onboardingCompleted: true, tourCompleted: false }

describe('WelcomeTour — görünme koşulu', () => {
  it('anket bitmiş + tur bitmemişse açılır', async () => {
    await ciz(ACIK)
    expect(await screen.findByRole('dialog', TUR)).toBeInTheDocument()
  })

  it('tur zaten bitmişse açılmaz', async () => {
    await ciz({ onboardingCompleted: true, tourCompleted: true })
    await waitFor(() => expect(screen.queryByRole('dialog', TUR)).not.toBeInTheDocument())
  })

  it('🔴 ANKET bitmemişse açılmaz — iki karşılama üst üste binmesin', async () => {
    await ciz({ onboardingCompleted: false, tourCompleted: false })
    await waitFor(() => expect(screen.queryByRole('dialog', TUR)).not.toBeInTheDocument())
  })

  it('durum okunamazsa açılmaz', async () => {
    getStatus.mockRejectedValue(new Error('ağ hatası'))
    render(<MemoryRouter><WelcomeTour /></MemoryRouter>)
    await waitFor(() => expect(getStatus).toHaveBeenCalled())
    expect(screen.queryByRole('dialog', TUR)).not.toBeInTheDocument()
  })
})

describe('WelcomeTour — bölümlere gezinme', () => {
  it('🔴 her adım kendi sayfasına gider', async () => {
    await ciz(ACIK)
    await screen.findByRole('dialog', TUR)

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
      /* Gerçek uygulamada rota değişince `useLocation` da değişir;
         testte elle yansıtılıyor ki sonraki adım tetiklensin. */
      konum = { pathname: yol }
    }
  })

  it('zaten o yoldaysa tekrar gezinmez', async () => {
    /* İlk adımın yolu başlangıç konumuyla aynı; gereksiz bir navigate
       geçmiş yığınına çöp bırakırdı. */
    await ciz(ACIK)
    await screen.findByRole('dialog', TUR)
    expect(navigate).not.toHaveBeenCalledWith('/app/dashboard')
  })

  it('tur bitince başlangıç sayfasına döner', async () => {
    await ciz(ACIK)
    await screen.findByRole('dialog', TUR)
    await userEvent.click(screen.getByRole('button', { name: 'Turu atla' }))
    expect(navigate).toHaveBeenCalledWith('/app/dashboard')
  })
})

describe('WelcomeTour — ilerleme ve bitirme', () => {
  it('adımlar sırayla ilerler ve sayaç güncellenir', async () => {
    await ciz(ACIK)
    await screen.findByRole('dialog', TUR)
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'İleri' }))
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Geri' }))
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('son adımda düğme "Başlayalım" olur ve turu bitirir', async () => {
    await ciz(ACIK)
    await screen.findByRole('dialog', TUR)
    for (let i = 0; i < 4; i++) {
      await userEvent.click(screen.getByRole('button', { name: 'İleri' }))
    }
    expect(screen.getByText('5 / 5')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Başlayalım' }))
    await waitFor(() => expect(completeTour).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog', TUR)).not.toBeInTheDocument()
  })

  it('"Turu atla" ilk adımda da bitirir', async () => {
    await ciz(ACIK)
    await screen.findByRole('dialog', TUR)
    await userEvent.click(screen.getByRole('button', { name: 'Turu atla' }))
    await waitFor(() => expect(completeTour).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog', TUR)).not.toBeInTheDocument()
  })

  it('Escape turu kapatır', async () => {
    await ciz(ACIK)
    await screen.findByRole('dialog', TUR)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog', TUR)).not.toBeInTheDocument())
  })

  it('🔴 sunucuya yazmak başarısız olsa da tur KAPANIR', async () => {
    /* Kullanıcıyı ağ hatası yüzünden karşılama ekranında tutmak kabul
       edilemez; en kötü ihtimalle bir sonraki oturumda tekrar açılır. */
    completeTour.mockRejectedValue(new Error('ağ hatası'))
    await ciz(ACIK)
    await screen.findByRole('dialog', TUR)
    await userEvent.click(screen.getByRole('button', { name: 'Turu atla' }))
    await waitFor(() => expect(screen.queryByRole('dialog', TUR)).not.toBeInTheDocument())
  })

  it('hedef DOM’da yoksa çökmez, balon yine çizilir', async () => {
    /* Testte sayfa içeriği yok — hiçbir `data-tour` öğesi bulunmuyor.
       Tur bu durumda konumdan vazgeçip ortalanmalı, hata vermemeli. */
    await ciz(ACIK)
    expect(await screen.findByText('Kontrol Merkezi')).toBeInTheDocument()
  })
})
