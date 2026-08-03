import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api'
import StructuredDecisionTool from './StructuredDecisionTool'

vi.mock('@/services/api', () => ({
  api: { decisionChecks: { saveAnswer: vi.fn(), complete: vi.fn() } }
}))

const field = (code, label, description, suffix = '₺', min = 0, max) => ({ code, label, description, suffix, min, max, step: 0.01 })
const discountSession = {
  id: 'discount-session', status: 'in_progress', decisionCheckCode: 'DC-DISCOUNT-002',
  decisionCheckTitle: 'Bu indirimi yapabilir miyim?', decisionCheckDescription: 'İndirim testi', answers: [],
  definition: [
    field('salePrice', 'Mevcut satış fiyatı', 'İndirim öncesi fiyat', '₺', 0.01),
    field('unitCost', 'Ürün başı toplam maliyet', 'Toplam değişken maliyet'),
    field('plannedDiscountRate', 'Planlanan indirim', 'Uygulanacak indirim', '%', 0, 99)
  ],
  toolMeta: {
    intro: 'İndirim öncesi ve sonrası katkıyı karşılaştırın.', submitLabel: 'İndirim sınırımı hesapla',
    formulas: ['İndirimli fiyat = Mevcut fiyat × (1 − indirim oranı)'],
    decisionChecks: ['İndirim sonrası katkı pozitif mi?']
  }
}

describe('StructuredDecisionTool', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.decisionChecks.saveAnswer.mockResolvedValue({ success: true })
    api.decisionChecks.complete.mockResolvedValue({ resultId: 'result-1' })
  })

  it('renders business-specific fields, formulas and CTA instead of a generic questionnaire', () => {
    render(<StructuredDecisionTool session={discountSession} navigate={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Bu indirimi yapabilir miyim?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Mevcut satış fiyatı')).toBeInTheDocument()
    expect(screen.getByLabelText('Ürün başı toplam maliyet')).toBeInTheDocument()
    expect(screen.getByLabelText('Planlanan indirim')).toBeInTheDocument()
    expect(screen.getByText(/İndirimli fiyat =/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'İndirim sınırımı hesapla' })).toBeInTheDocument()
  })

  it('blocks submission and shows field-level frontend validation', () => {
    render(<StructuredDecisionTool session={discountSession} navigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'İndirim sınırımı hesapla' }))
    expect(screen.getAllByText(/geçerli bir değer girin/)).toHaveLength(3)
    expect(api.decisionChecks.complete).not.toHaveBeenCalled()
  })

  it('saves every typed field before completing the existing session', async () => {
    render(<StructuredDecisionTool session={discountSession} navigate={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Mevcut satış fiyatı'), { target: { value: '1000' } })
    fireEvent.change(screen.getByLabelText('Ürün başı toplam maliyet'), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText('Planlanan indirim'), { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: 'İndirim sınırımı hesapla' }))
    await waitFor(() => expect(api.decisionChecks.saveAnswer).toHaveBeenCalledTimes(3))
    expect(api.decisionChecks.complete).toHaveBeenCalledWith('discount-session')
  })

  it('renders a saved explainable result with metrics, scenarios, warnings and safe steps', () => {
    const completed = { ...discountSession, status: 'completed' }
    const result = { id: 'result-1', snapshot: { calculationOutput: {
      decisionLabel: 'UYGUN', decisionTone: 'good', summary: 'Beklenen satış artışı katkıyı karşılıyor.',
      metrics: [{ key: 'discountedPrice', label: 'İndirimli fiyat', value: 850, format: 'money' }],
      scenarios: [{ label: 'Kampanya aylık katkısı', value: 34450, format: 'money', detail: '130 beklenen adet', tone: 'good' }],
      formulas: ['Katkı = Fiyat − maliyet'], riskWarnings: ['Marjı günlük izleyin.'], safeNextSteps: ['Durdurma eşiği belirleyin.']
    } } }
    render(<StructuredDecisionTool session={completed} result={result} navigate={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'UYGUN' })).toBeInTheDocument()
    expect(screen.getByText('İndirimli fiyat')).toBeInTheDocument()
    expect(screen.getByText('Kampanya aylık katkısı')).toBeInTheDocument()
    expect(screen.getByText('Marjı günlük izleyin.')).toBeInTheDocument()
    expect(screen.getByText('Durdurma eşiği belirleyin.')).toBeInTheDocument()
  })
})
