import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/*
 * Alt çubuk mobilde ana gezinme yolu. İki şey sessizce bozulabilir:
 *
 *   1. SIRA. Ürün sahibinin kararıyla (21.08.2026) mobil sıra masaüstünden
 *      ayrıldı: Kurslar ve AI Mentor çıktı, Topluluk ve Haberler girdi.
 *      Sidebar ile MobileTabBar tek diziyi paylaştığı için bu ayrım
 *      "sadeleştirme" niyetiyle kolayca geri birleştirilebilir. Test bunu
 *      yakalar.
 *
 *   2. ETKİN MADDE. Haberler `/app/community` kökünde, forum onun ALTINDA
 *      (`/app/community/topluluk`). Önek eşleşmesi kullanılırsa forumdayken
 *      ikisi birden etkin görünür — gözle bakınca fark edilmesi zor,
 *      kullanıcı için kafa karıştırıcı.
 */

const navigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const gercek = await vi.importActual('react-router-dom')
  return { ...gercek, useNavigate: () => navigate }
})

const { default: MobileTabBar } = await import('./MobileTabBar')

function ciz(yol) {
  return render(
    <MemoryRouter initialEntries={[yol]}>
      <MobileTabBar />
    </MemoryRouter>
  )
}

const etiketler = () =>
  screen.getAllByRole('button').map(dugme => dugme.textContent.trim())

describe('MobileTabBar', () => {
  beforeEach(() => navigate.mockClear())

  it('mobil sırayı taşır: Kurslar ve AI Mentor çubukta DEĞİL', () => {
    ciz('/app/dashboard')
    expect(etiketler()).toEqual([
      'Ana Sayfa', 'Topluluk', 'Karar Araçları', 'Hesaplamalar', 'Haberler'
    ])
  })

  it('forumdayken Haberler etkin görünmez', () => {
    ciz('/app/community/topluluk')

    const forum = screen.getByRole('button', { name: /Topluluk/ })
    const haberler = screen.getByRole('button', { name: /Haberler/ })

    expect(forum).toHaveAttribute('aria-current', 'page')
    expect(haberler).not.toHaveAttribute('aria-current')
  })

  it('Haberler kökündeyken Haberler etkin olur', () => {
    ciz('/app/community')
    expect(screen.getByRole('button', { name: /Haberler/ })).toHaveAttribute('aria-current', 'page')
  })

  it('Ana Sayfa yalnız tam eşleşmede etkin', () => {
    ciz('/app/dashboard/detay')
    expect(screen.getByRole('button', { name: /Ana Sayfa/ })).not.toHaveAttribute('aria-current')
  })

  it('tıklayınca ilgili yola gider', async () => {
    const { default: userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    ciz('/app/dashboard')

    await user.click(screen.getByRole('button', { name: /Haberler/ }))
    expect(navigate).toHaveBeenCalledWith('/app/community')
  })
})
