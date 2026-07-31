import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FinancialModelLibrary from '../pages/FinancialModelLibrary'

vi.mock('@/context/WorkspaceContext', () => ({
  useWorkspace: () => ({ activeWorkspace: null })
}))

const list = vi.hoisted(() => vi.fn())

vi.mock('@/services/api', () => ({
  api: {
    financialModels: { list }
  }
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <FinancialModelLibrary />
    </MemoryRouter>
  )
}

const sampleModels = Array.from({ length: 24 }).map((_, i) => ({
  code: `MODEL-${i}`,
  name: `Model ${i}`,
  purpose: `Amaç ${i}`,
  description: `Açıklama ${i}`,
  category: i % 2 === 0 ? 'liquidity' : 'profitability',
  level: 'basic',
  engineVersion: 1,
  inputs: [],
  requirementCount: 2
}))

describe('FinancialModelLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'test-token')
  })

  it('renders 24 models on successful fetch', async () => {
    list.mockResolvedValue({ models: sampleModels, total: 24 })
    renderPage()
    await waitFor(() => expect(screen.getByText('24')).toBeInTheDocument())
    expect(screen.getByText('Model 0')).toBeInTheDocument()
    expect(screen.getByText('Model 23')).toBeInTheDocument()
  })

  it('shows empty library message when backend returns no models', async () => {
    list.mockResolvedValue({ models: [], total: 0 })
    renderPage()
    await waitFor(() => expect(screen.getByText('Henüz kullanılabilir model bulunmuyor.')).toBeInTheDocument())
  })

  it('shows search empty message when filter returns nothing', async () => {
    list.mockResolvedValue({ models: sampleModels, total: 24 })
    renderPage()
    await waitFor(() => expect(screen.getByText('Model 0')).toBeInTheDocument())

    const input = screen.getByPlaceholderText('Nakit, sipariş, CAC, yatırım veya DCF ara...')
    fireEvent.change(input, { target: { value: 'xyz-nonexistent' } })

    await waitFor(() => expect(screen.getByText('Bu arama için model bulunamadı.')).toBeInTheDocument())
  })

  it('shows error state and retry button when API fails', async () => {
    list.mockRejectedValue(new Error('API sunucusuna ulaşılamadı veya beklenmeyen bir yanıt alındı.'))
    renderPage()
    await waitFor(() => expect(screen.getByText('API sunucusuna ulaşılamadı veya beklenmeyen bir yanıt alındı.')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument()
  })

  it('retries on button click', async () => {
    list.mockRejectedValueOnce(new Error('API sunucusuna ulaşılamadı veya beklenmeyen bir yanıt alındı.'))
    list.mockResolvedValueOnce({ models: sampleModels, total: 24 })
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }))
    await waitFor(() => expect(screen.getByText('Model 0')).toBeInTheDocument())
    expect(list).toHaveBeenCalledTimes(2)
  })
})
