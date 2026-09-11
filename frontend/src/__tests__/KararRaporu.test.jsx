import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import KararRaporu from '@/pages/Workspaces/KararRaporu'

/*
 * KARAR RAPORU.
 *
 * 🔴 Bu ekran, veriyi YAZIP OKUMAYAN iki akışın karşılığı: karar aracı
 * takipleri ve finansal model karar günlüğü. İkisinde de beklenen ve
 * gerçekleşen sonuç kaydediliyordu, hiçbir yerde karşılaştırılmıyordu.
 *
 * En kritik iddia: uydurma sayı YOK. Ne "sapma yüzdesi" ne de "karar
 * başarısı oranı" üretiliyor — ikisi de serbest metinden çıkarılamaz.
 */

vi.mock('@/services/api', () => ({
  api: {
    request: vi.fn().mockResolvedValue({ current: { currencies: {}, categories: [] }, previous: { currencies: {}, categories: [] } }),
    workspace: { tracker: { list: vi.fn(), analysis: vi.fn() } },
    financialModels: { decisionJournal: vi.fn() }
  }
}))

vi.mock('react-router-dom', async () => {
  const gercek = await vi.importActual('react-router-dom')
  return { ...gercek, useParams: () => ({ workspaceId: 'ws-1' }), useNavigate: () => vi.fn() }
})

vi.mock('@/context/LocalizationContext', () => ({
  useLocalization: () => ({ formatLocale: 'tr-TR' })
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: anahtar => anahtar, i18n: { language: 'tr' } })
}))

const { api } = await import('@/services/api')

const TAKIP = {
  id: 'rec-1',
  title: 'Tedarikçiyle yeniden pazarlık',
  status: 'completed',
  createdAt: '2026-08-01T10:00:00.000Z',
  dueAt: '2026-08-10T10:00:00.000Z',
  overdue: false,
  metadata: {
    decisionFollowUp: {
      decisionTitle: 'Alım fiyatını düşür',
      expectedOutcome: 'Birim maliyet %8 düşsün',
      actualOutcome: 'Birim maliyet %5 düştü',
      lessonLearned: 'Hacim taahhüdü olmadan indirim sınırlı'
    }
  }
}

const BEKLEYEN = {
  id: 'rec-2',
  title: 'Vitrin düzenini değiştir',
  status: 'open',
  createdAt: '2026-08-05T10:00:00.000Z',
  dueAt: null,
  overdue: false,
  metadata: { decisionFollowUp: { decisionTitle: 'Vitrini yenile', expectedOutcome: 'Günlük giriş 20 artsın' } }
}

const GUNLUK = {
  id: 'dj-1',
  decision: 'Tahsilat planını sıkılaştır',
  expectedOutcome: 'Cari oran 2,2 olsun',
  actualOutcome: null,
  variance: null,
  lessonLearned: null,
  createdAt: '2026-08-03T10:00:00.000Z',
  reviewedAt: null,
  modelRun: { id: 'run-1', model: { code: 'liquidity', name: 'Likidite modeli' } }
}

function ciz() {
  return render(<MemoryRouter><KararRaporu /></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  api.workspace.tracker.list.mockResolvedValue({ records: [TAKIP, BEKLEYEN] })
  api.financialModels.decisionJournal.mockResolvedValue({ entries: [GUNLUK] })
  api.workspace.tracker.analysis.mockRejectedValue(new Error('403'))
})

describe('Karar Raporu', () => {
  it('hedeflenen ve gerçekleşen sonucu birlikte gösteriyor', async () => {
    ciz()
    await waitFor(() => expect(screen.getByText('Alım fiyatını düşür')).toBeInTheDocument())
    expect(screen.getByText('Birim maliyet %8 düşsün')).toBeInTheDocument()
    expect(screen.getByText('Birim maliyet %5 düştü')).toBeInTheDocument()
  })

  it('iki kaynağı tek listede topluyor', async () => {
    ciz()
    /* Kullanıcı için ikisi de "verdiğim karar"; hangi tablodan geldiği
       onun sorunu değil. */
    await waitFor(() => expect(screen.getByText('Alım fiyatını düşür')).toBeInTheDocument())
    expect(screen.getByText('Tahsilat planını sıkılaştır')).toBeInTheDocument()
  })

  it('sonucu yazılmamış kararı boş bırakmıyor, açıkça söylüyor', async () => {
    ciz()
    await waitFor(() => expect(screen.getByText('Tahsilat planını sıkılaştır')).toBeInTheDocument())
    /* İki kayıt sonucu bekliyor: BEKLEYEN ve GUNLUK. */
    expect(screen.getAllByText('workspace:decisionReport.notYet')).toHaveLength(2)
  })

  it('süzgeç değişse de toplam sayı düşmüyor', async () => {
    const kullanici = userEvent.setup()
    ciz()
    await waitFor(() => expect(screen.getByText('Alım fiyatını düşür')).toBeInTheDocument())

    const toplamOnce = screen.getByText('workspace:decisionReport.total').nextSibling.textContent
    await kullanici.click(screen.getByRole('button', { name: 'workspace:decisionReport.filter.bekleyen' }))

    await waitFor(() => expect(screen.queryByText('Alım fiyatını düşür')).not.toBeInTheDocument())
    /* "3 karardan 1'i değerlendirildi" cümlesi süzgeçle yanlışa
       dönmemeli: özet süzgeçten önce hesaplanıyor. */
    expect(screen.getByText('workspace:decisionReport.total').nextSibling.textContent).toBe(toplamOnce)
  })

  /* 🔴 Serbest metinden sayı üretilmiyor. */
  it('uydurma sapma yüzdesi göstermiyor', async () => {
    ciz()
    await waitFor(() => expect(screen.getByText('Alım fiyatını düşür')).toBeInTheDocument())
    expect(screen.queryByText('workspace:decisionReport.variance')).not.toBeInTheDocument()
  })

  it('yetkisi olmayan rolde yönetici analizi hiç çizilmiyor', async () => {
    ciz()
    await waitFor(() => expect(screen.getByText('Alım fiyatını düşür')).toBeInTheDocument())
    /* 403 yutuluyor: erişemeyeceği bir şeyi hatırlatan uyarı basmak
       kullanıcıya bir şey kazandırmıyor. */
    expect(screen.queryByText('workspace:decisionReport.analysis.title')).not.toBeInTheDocument()
    expect(screen.queryByText('workspace:decisionReport.loadError')).not.toBeInTheDocument()
  })

  it('yöneticide kişi kişi tamamlama tablosu çiziliyor', async () => {
    api.workspace.tracker.analysis.mockResolvedValue({
      gorevler: {
        toplam: 4, atanmamis: 1,
        kisiler: [{ userId: 7, name: 'Ayşe', toplam: 3, tamamlanan: 2, zamaninda: 1, geciken: 1 }]
      },
      kararlar: { toplam: 3, takipEdilen: 1, bekleyen: 2 }
    })
    ciz()
    await waitFor(() => expect(screen.getByText('workspace:decisionReport.analysis.title')).toBeInTheDocument())
    expect(screen.getByRole('rowheader', { name: 'Ayşe' })).toBeInTheDocument()
    /* Ölçülemeyeni ölçüyormuş gibi yapmadığını ekranda da söylüyor. */
    expect(screen.getByText('workspace:decisionReport.analysis.note')).toBeInTheDocument()
  })

  it('karar günlüğü ucu patlarsa takipler yine gösteriliyor', async () => {
    api.financialModels.decisionJournal.mockRejectedValue(new Error('bozuk'))
    ciz()
    await waitFor(() => expect(screen.getByText('Alım fiyatını düşür')).toBeInTheDocument())
    expect(screen.queryByText('workspace:decisionReport.loadError')).not.toBeInTheDocument()
  })
})
