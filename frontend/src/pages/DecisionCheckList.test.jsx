import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api'
import DecisionCheckList from './DecisionCheckList'

vi.mock('@/services/api', () => ({
  api: {
    decisionChecks: {
      list: vi.fn(),
      listSessions: vi.fn(),
      start: vi.fn()
    }
  }
}))

const profitabilityCheck = {
  code: 'DC-PROFIT-001',
  title: 'Ürünüm Gerçekten Kârlı mı?',
  description: 'Bir ürünün satış fiyatından tüm temel maliyetler düşüldüğünde gerçekte ne kadar kazandırdığını kontrol eder.',
  category: 'Finans'
}

function renderList() {
  return render(
    <MemoryRouter>
      <DecisionCheckList />
    </MemoryRouter>
  )
}

describe('DecisionCheckList', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.decisionChecks.listSessions.mockResolvedValue([])
  })

  it('renders the heading, description, card content and default CTA without technical code', async () => {
    api.decisionChecks.list.mockResolvedValue([profitabilityCheck])
    const { container } = renderList()

    expect(screen.getByText('Araçlar hazırlanıyor')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Karar Kontrolleri' })).toBeInTheDocument()
    expect(screen.getByText(/Önemli iş kararlarını vermeden önce/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ürünüm Gerçekten Kârlı mı?' })).toBeInTheDocument()
    expect(screen.getByText(profitabilityCheck.description)).toBeInTheDocument()
    expect(screen.getByText('Finans')).toBeInTheDocument()
    expect(screen.getByText('Başlanmadı')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aracı Aç' })).toBeInTheDocument()
    expect(screen.queryByText('DC-PROFIT-001')).not.toBeInTheDocument()
    expect(container.textContent).not.toContain('FinansAracı Aç')
  })

  it.each([
    ['in_progress', 'Devam ediyor', 'Devam Et'],
    ['completed', 'Tamamlandı', 'Sonucu Gör']
  ])('renders the %s state and correct CTA', async (status, label, cta) => {
    api.decisionChecks.list.mockResolvedValue([{ ...profitabilityCheck, status }])
    renderList()

    expect(await screen.findByText(label)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: cta })).toBeInTheDocument()
  })

  it('matches the latest user session to its card', async () => {
    api.decisionChecks.list.mockResolvedValue([profitabilityCheck])
    api.decisionChecks.listSessions.mockResolvedValue([{
      id: 'session-1',
      decisionCheckCode: 'DC-PROFIT-001',
      status: 'in_progress'
    }])
    renderList()

    expect(await screen.findByText('Devam ediyor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Devam Et' })).toBeInTheDocument()
  })

  it('starts a new check through the existing API action', async () => {
    api.decisionChecks.list.mockResolvedValue([profitabilityCheck])
    api.decisionChecks.start.mockResolvedValue({ sessionId: 'session-1' })
    renderList()

    fireEvent.click(await screen.findByRole('button', { name: 'Aracı Aç' }))
    await waitFor(() => expect(api.decisionChecks.start).toHaveBeenCalledWith('DC-PROFIT-001'))
  })

  it('renders an empty state', async () => {
    api.decisionChecks.list.mockResolvedValue([])
    renderList()

    expect(await screen.findByRole('heading', { name: 'Henüz araç bulunmuyor' })).toBeInTheDocument()
    expect(screen.getByText('Yayınlanan yeni karar kontrolleri burada görünecek.')).toBeInTheDocument()
  })

  it('renders an error state and retries loading', async () => {
    api.decisionChecks.list
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([profitabilityCheck])
    renderList()

    fireEvent.click(await screen.findByRole('button', { name: 'Yeniden dene' }))

    expect(await screen.findByRole('heading', { name: 'Ürünüm Gerçekten Kârlı mı?' })).toBeInTheDocument()
    expect(api.decisionChecks.list).toHaveBeenCalledTimes(2)
  })

  it('includes the responsive grid rules required for a 375 px viewport', async () => {
    api.decisionChecks.list.mockResolvedValue([profitabilityCheck])
    const { container } = renderList()

    await screen.findByRole('heading', { name: 'Ürünüm Gerçekten Kârlı mı?' })
    expect(container.querySelector('.decision-list-grid')).toBeInTheDocument()
    expect(container.querySelector('.decision-card-cta')).toBeInTheDocument()
  })
})
