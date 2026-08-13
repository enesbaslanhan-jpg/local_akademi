import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api'
import StructuredDecisionTool from './StructuredDecisionTool'

vi.mock('@/services/api', () => ({
  api: { decisionChecks: { saveAnswer: vi.fn(), complete: vi.fn() } }
}))

/* DC-TAX-013 ayri bir bilesen veya route KULLANMAZ. Generic
   /app/decision-checks/:code rotasindan StructuredDecisionTool'a duser;
   bu test o bagin calistigini ve secenekli girdinin render edildigini
   dogrular. */
const taxSession = {
  id: 'tax-session',
  status: 'in_progress',
  decisionCheckCode: 'DC-TAX-013',
  decisionCheckTitle: 'Hangi şirket türü bana uygun?',
  decisionCheckDescription: 'Şirket türü değerlendirmesi',
  answers: [],
  definition: [
    { code: 'estimatedAnnualProfit', label: 'Tahmini yıllık kâr', description: 'Yıllık kâr', type: 'money', suffix: '₺', min: 0, step: 0.01 },
    {
      code: 'profitRetentionIntent', label: 'Kârı ne yapmayı planlıyorsunuz?',
      description: 'Kâr dağıtımı niyeti', type: 'choice', suffix: '', min: 0, max: 2, step: 1,
      options: [
        { value: 0, label: 'Tamamına yakınını kendime dağıtacağım' },
        { value: 1, label: 'Bir kısmını bırakıp bir kısmını dağıtacağım' },
        { value: 2, label: 'Büyük kısmını işletmede bırakacağım' }
      ]
    },
    {
      code: 'liabilitySensitivity', label: 'Kişisel mal varlığı riski sizin için ne kadar önemli?',
      description: 'Sorumluluk hassasiyeti', type: 'choice', suffix: '', min: 0, max: 2, step: 1,
      options: [
        { value: 0, label: 'Düşük önem' },
        { value: 1, label: 'Orta önem' },
        { value: 2, label: 'Yüksek önem' }
      ]
    }
  ],
  toolMeta: {
    intro: 'Bu araç bir vergi veya hukuk danışmanlığı değildir.',
    submitLabel: 'Şirket türü değerlendirmemi göster',
    formulas: ['Kurumsallaşma sinyali = kâr eşiği + kâr bırakma niyeti + ortak sayısı'],
    decisionChecks: ['Sonucu mali müşavir ve hukukçuyla doğruladınız mı?']
  }
}

describe('DC-TAX-013 — şirket türü aracı (frontend)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.decisionChecks.saveAnswer.mockResolvedValue({ success: true })
    api.decisionChecks.complete.mockResolvedValue({ resultId: 'tax-result-1' })
  })

  it('generic structured araç üzerinden açılır, ayrı bir sistem gerektirmez', () => {
    render(<StructuredDecisionTool session={taxSession} navigate={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Hangi şirket türü bana uygun?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Şirket türü değerlendirmemi göster' })).toBeInTheDocument()
  })

  it('seçenekli soruları radyo grubu olarak gösterir', () => {
    render(<StructuredDecisionTool session={taxSession} navigate={vi.fn()} />)
    expect(screen.getByText('Kârı ne yapmayı planlıyorsunuz?')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Büyük kısmını işletmede bırakacağım/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Yüksek önem/ })).toBeInTheDocument()
    // Sayisal soru hala metin kutusu olarak kalir.
    expect(screen.getByLabelText('Tahmini yıllık kâr')).toBeInTheDocument()
  })

  it('vergi danışmanlığı olmadığını kullanıcıya söyler', () => {
    render(<StructuredDecisionTool session={taxSession} navigate={vi.fn()} />)
    expect(screen.getByText(/vergi veya hukuk danışmanlığı değildir/i)).toBeInTheDocument()
  })

  it('seçim yapılmadan gönderimi engeller', () => {
    render(<StructuredDecisionTool session={taxSession} navigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Şirket türü değerlendirmemi göster' }))
    expect(api.decisionChecks.complete).not.toHaveBeenCalled()
  })

  it('seçilen değeri sayı olarak kaydeder ve oturumu tamamlar', async () => {
    render(<StructuredDecisionTool session={taxSession} navigate={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Tahmini yıllık kâr'), { target: { value: '1500000' } })
    fireEvent.click(screen.getByRole('radio', { name: /Büyük kısmını işletmede bırakacağım/ }))
    fireEvent.click(screen.getByRole('radio', { name: /Yüksek önem/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Şirket türü değerlendirmemi göster' }))

    await waitFor(() => expect(api.decisionChecks.saveAnswer).toHaveBeenCalledTimes(3))
    const saved = api.decisionChecks.saveAnswer.mock.calls.map(call => call[1])
    expect(saved.some(a => a.questionCode === 'profitRetentionIntent' && String(a.value) === '2')).toBe(true)
    expect(api.decisionChecks.complete).toHaveBeenCalledWith('tax-session')
  })
})
