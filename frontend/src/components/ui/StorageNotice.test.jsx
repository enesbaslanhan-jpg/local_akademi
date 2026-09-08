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
})
