import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StorageNotice from './StorageNotice'

const analytics = vi.hoisted(() => ({
  configured: false,
  consent: 'unknown',
  setConsent: vi.fn(async consent => { analytics.consent = consent })
}))

vi.mock('@/services/analytics', () => ({
  ANALYTICS_CONSENT_EVENT: 'localkarar:analytics-consent',
  getAnalyticsConsent: () => analytics.consent,
  isAnalyticsConfigured: async () => analytics.configured,
  setAnalyticsConsent: analytics.setConsent
}))

describe('StorageNotice', () => {
  beforeEach(() => {
    window.localStorage.clear()
    analytics.configured = false
    analytics.consent = 'unknown'
    analytics.setConsent.mockClear()
  })

  it('login ekranında sabit bildirimi gizler', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <StorageNotice />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.queryByRole('note')).not.toBeInTheDocument()
    })
  })

  it('akış içindeki bildirimi kapatır ve tercihi saklar', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <StorageNotice inline />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Bildirimi kapat' }))

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('localkarar-storage-notice-seen')).toBe('true')
  })

  it('analitik yapılandırıldığında açık onay ister ve reddi uygular', async () => {
    analytics.configured = true
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <StorageNotice />
      </MemoryRouter>
    )

    const reject = await screen.findByRole('button', { name: 'Reddet' })
    fireEvent.click(reject)

    await waitFor(() => expect(analytics.setConsent).toHaveBeenCalledWith('denied'))
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  /*
   * 🔴 ÜRÜN SAHİBİ BİLDİRDİ (10.09.2026): "onayladım ama tekrar çıktı".
   *
   * Tarayıcıda doğrulandı: ana sayfada İKİ bant vardı (main.jsx'teki
   * genel örnek + PublicFooter'daki satır içi örnek). Birine "İzin ver"
   * denince localStorage 'granted' oluyor ama öteki ekranda kalıyordu --
   * her örnek durumunu yalnız mount anında okuyordu.
   */
  it('bir örnekte verilen rıza öteki örneği de kapatıyor', async () => {
    analytics.configured = true
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <StorageNotice />
      </MemoryRouter>
    )
    await screen.findByRole('region')

    /* Başka bir örnek karar vermiş gibi: servis olayı yayınlıyor. */
    analytics.consent = 'granted'
    fireEvent(window, new CustomEvent('localkarar:analytics-consent', {
      detail: { consent: 'granted' }
    }))

    await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument())
  })

  /*
   * Aynı soruyu iki kez sormak, kullanıcıya "kaydedilmedi" hissi veriyor.
   * Rıza kipinde sayfada TEK bant olmalı.
   */
  it('rıza kipinde satır içi örnek genel bandı tekrarlamıyor', async () => {
    analytics.configured = true
    render(
      <MemoryRouter initialEntries={['/']}>
        <StorageNotice inline />
      </MemoryRouter>
    )
    /* Genel örnek bu rotada görünür; satır içi olan çekiliyor. */
    await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument())
  })

  it('genel örneğin gizlendiği rotada satır içi olan devralıyor', async () => {
    analytics.configured = true
    render(
      <MemoryRouter initialEntries={['/login']}>
        <StorageNotice inline />
      </MemoryRouter>
    )
    /* Giriş ekranında genel örnek gizli; soruyu soran bu olmalı. */
    expect(await screen.findByRole('button', { name: 'Analitiğe izin ver' })).toBeInTheDocument()
  })
})