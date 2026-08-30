import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ConsentBanner from '@/components/layout/ConsentBanner'

/*
 * YENİDEN ONAY ŞERİDİ testleri.
 *
 * Kritik sözleşme: şerit KAPATILAMAZ (kapatma düğmesi yok) — kapatan
 * kullanıcı bir daha göremezdi ve onay hiç alınamazdı. Ayrıca onay,
 * metin uygulama içinde AÇILABİLMEDEN sunulamaz.
 */

const mocks = vi.hoisted(() => ({
  getConsents: vi.fn(),
  acceptConsents: vi.fn()
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 7, name: 'Test Kullanıcı' } })
}))

vi.mock('@/services/api', () => ({
  api: {
    auth: {
      getConsents: mocks.getConsents,
      acceptConsents: mocks.acceptConsents
    }
  }
}))

const EKSIK = [
  { type: 'privacy', title: 'Gizlilik ve KVKK Aydınlatma Metni', version: '2026-08-25' },
  { type: 'terms', title: 'Kullanım Koşulları', version: '2026-08-25' }
]

const GUNCEL = [
  { documentType: 'privacy', version: '2026-08-25' },
  { documentType: 'terms', version: '2026-08-25' }
]

function ciz() {
  return render(<ConsentBanner />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ConsentBanner', () => {
  it('eksik onay yokken çizilmez', async () => {
    mocks.getConsents.mockResolvedValue({ accepted: GUNCEL, missing: [] })
    ciz()
    await waitFor(() => expect(mocks.getConsents).toHaveBeenCalled())
    expect(screen.queryByText(/Yasal metinler güncellendi/)).not.toBeInTheDocument()
  })

  it('eksik onay varsa her eksik metin için “oku” bağlantısı çıkar', async () => {
    mocks.getConsents.mockResolvedValue({ accepted: [], missing: EKSIK })
    ciz()
    expect(await screen.findByText(/Yasal metinler güncellendi/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Gizlilik ve KVKK Aydınlatma Metni belgesini oku/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kullanım Koşulları belgesini oku/ })).toBeInTheDocument()
  })

  /* VerificationBanner'daki oturum bazlı kapatma burada YANLIŞ olurdu:
     kapatma düğmesi hiç olmamalı. */
  it('KAPATMA düğmesi yoktur — şerit kapatılamaz', async () => {
    mocks.getConsents.mockResolvedValue({ accepted: [], missing: EKSIK })
    ciz()
    await screen.findByText(/Yasal metinler güncellendi/)
    expect(screen.queryByLabelText(/gizle/i)).toBeNull()
    expect(screen.queryByLabelText('Kapat')).toBeNull()
  })

  it('“oku” bağlantısı yasal metni uygulamadan çıkmadan açar', async () => {
    const user = userEvent.setup()
    mocks.getConsents.mockResolvedValue({ accepted: [], missing: [EKSIK[0]] })
    ciz()

    await user.click(await screen.findByRole('button', { name: /Aydınlatma Metni belgesini oku/ }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Gizlilik ve KVKK Aydınlatma Metni')).toBeInTheDocument()
  })

  it('onaylayınca sunucuya yazar, taze durumla şerit kaldırılır', async () => {
    const user = userEvent.setup()
    mocks.getConsents
      .mockResolvedValueOnce({ accepted: [], missing: EKSIK })
      .mockResolvedValueOnce({ accepted: GUNCEL, missing: [] })
    mocks.acceptConsents.mockResolvedValue({ success: true })
    ciz()

    await user.click(await screen.findByRole('button', { name: /Okudum, onaylıyorum/ }))

    await waitFor(() => expect(mocks.acceptConsents).toHaveBeenCalledTimes(1))
    /* Şerit ancak TAZE konsensüs yanıtı eksik gösterince kalkar. */
    await waitFor(() => expect(screen.queryByText(/Yasal metinler güncellendi/)).not.toBeInTheDocument())
  })

  it('onay başarısızsa şerit kalır ve hata gösterilir', async () => {
    const user = userEvent.setup()
    mocks.getConsents.mockResolvedValue({ accepted: [], missing: EKSIK })
    mocks.acceptConsents.mockRejectedValue(new Error('Onay kaydedilemedi.'))
    ciz()

    await user.click(await screen.findByRole('button', { name: /Okudum, onaylıyorum/ }))

    expect(await screen.findByText('Onay kaydedilemedi.')).toBeInTheDocument()
    expect(screen.getByText(/Yasal metinler güncellendi/)).toBeInTheDocument()
  })

  it('konsensüs isteği başarısız olursa şerit YANLIŞ uyarıyla çıkmaz', async () => {
    mocks.getConsents.mockRejectedValue(new Error('ağ hatası'))
    ciz()
    await waitFor(() => expect(mocks.getConsents).toHaveBeenCalled())
    expect(screen.queryByText(/Yasal metinler güncellendi/)).not.toBeInTheDocument()
  })
})
