import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Documents from '@/pages/Workspaces/Documents'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  upload: vi.fn(),
  archive: vi.fn(),
  acceptSuggestion: vi.fn(),
  rejectSuggestion: vi.fn(),
  /* Varsayılan: kanal sunucuda yapılandırılmamış. Böylece mevcut
     testler e-posta bloğunu hiç görmüyor ve beklentileri değişmiyor;
     bloğun kendisi aşağıda ayrıca sınanıyor. */
  inboxGet: vi.fn(() => Promise.resolve({ acik: false, adres: null, kanalHazir: false })),
  toast: { success: vi.fn(), error: vi.fn() }
}))

vi.mock('@/services/api', () => ({
  api: {
    workspace: {
      documents: {
        list: mocks.list,
        upload: mocks.upload,
        archive: mocks.archive,
        acceptSuggestion: mocks.acceptSuggestion,
        rejectSuggestion: mocks.rejectSuggestion
      },
      /* Belgeler ekranı gelen kutusu adresini de okuyor: e-postayla
         göndermek bir belge ekleme yolu ve adres artık burada
         gösteriliyor. Sahte eksik kalırsa bileşen açılışta düşüyor. */
      inbox: { get: mocks.inboxGet }
    }
  }
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => mocks.toast
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/workspaces/workspace-1/documents']}>
      <Routes>
        <Route path="/app/workspaces/:workspaceId/documents" element={<Documents />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Workspace documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue({ documents: [] })
    mocks.upload.mockResolvedValue({ id: 'document-1' })
    /* clearAllMocks varsayilan uygulamayi da siliyor; kanal kapali
       hali her testte yeniden kuruluyor. */
    mocks.inboxGet.mockResolvedValue({ acik: false, adres: null, kanalHazir: false })
  })

  it('shows file, gallery and camera upload choices', async () => {
    const { container } = renderPage()

    expect(await screen.findByText('Belge veya fotoğraf ekleyin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dosya seç/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fotoğraf seç/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fotoğraf çek/i })).toBeInTheDocument()
    expect(container.querySelector('input[capture="environment"]')).toBeInTheDocument()
  })

  it('uploads a selected document for automatic analysis', async () => {
    const { container } = renderPage()
    await screen.findByText('Belge veya fotoğraf ekleyin')
    const input = container.querySelector('input[accept*=".pdf"]')
    const file = new File(['fatura son ödeme 31.12.2026 1.250,00 TL'], 'fatura.pdf', { type: 'application/pdf' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('workspace-1', file, { category: 'other' }))
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith(expect.stringMatching(/algılanan takip bilgilerini/i)))
  })
})

/*
 * e-FATURA ÖNERİSİNİN GÖSTERİMİ.
 *
 * 🔴 BU BLOK GERÇEK BİR KUSURU KAPATIYOR (23.08.2026).
 *
 * Sunucu, yönü belirlenemeyen faturada `direction: 'neutral'`
 * döndürüyor. Ama `payload.type` alanında "belirsiz" diye bir değer
 * YOK; tür zorunlu olarak 'payment'a düşüyor. Arayüz de yalnız türe
 * baktığı için ekranda **"Ödeme"** yazıyordu.
 *
 * Yani kullanıcıya, aslında ALACAĞI olabilecek bir fatura için "bu
 * senin borcun" deniyordu. Sunucu tarafı dürüsttü, görünen etiket
 * yalan söylüyordu -- ve bu yalnız tarayıcıda bakınca göründü.
 */
describe('e-Fatura önerisi gösterimi', () => {
  const belge = (payload) => ({
    id: 'doc-1',
    originalName: 'fatura.xml',
    sizeBytes: 6556,
    category: 'other',
    analysisStatus: 'review_required',
    recordCount: 0,
    suggestions: [{ id: 's1', status: 'proposed', confidence: 1, payload }]
  })

  it('yön belirsizken tür etiketi GÖSTERİLMEZ', async () => {
    mocks.list.mockResolvedValue({ documents: [belge({
      type: 'payment',
      direction: 'neutral',
      amount: 17.88,
      currency: 'TRY',
      dueAt: null,
      description: 'e-Fatura okundu. Bu faturanın gelen mi giden mi olduğu belirlenemedi — işletme ayarlarında vergi numaranızı girerseniz otomatik ayrılır.'
    })] })
    renderPage()

    expect(await screen.findByText(/Gelen mi giden mi belirlenemedi/)).toBeInTheDocument()
    /* Asıl iddia: yanıltıcı etiket ekranda OLMAMALI. */
    expect(screen.queryByText(/^Ödeme/)).not.toBeInTheDocument()
  })

  it('yön belirsizken kullanıcıya ne yapması gerektiği yazılır', async () => {
    mocks.list.mockResolvedValue({ documents: [belge({
      type: 'payment', direction: 'neutral', amount: 17.88, currency: 'TRY', dueAt: null,
      description: 'e-Fatura okundu. Bu faturanın gelen mi giden mi olduğu belirlenemedi — işletme ayarlarında vergi numaranızı girerseniz otomatik ayrılır.'
    })] })
    renderPage()

    expect(await screen.findByText(/vergi numaranızı girerseniz/)).toBeInTheDocument()
  })

  it('yön belliyken doğru tür etiketi gösterilir', async () => {
    mocks.list.mockResolvedValue({ documents: [belge({
      type: 'receivable', direction: 'receivable', amount: 17.88, currency: 'TRY',
      dueAt: '2009-01-20T00:00:00.000Z', description: 'e-Fatura okundu.'
    })] })
    renderPage()

    expect(await screen.findByText(/Tahsilat/)).toBeInTheDocument()
    expect(screen.queryByText(/belirlenemedi/)).not.toBeInTheDocument()
  })
})

/*
 * E-POSTA KANALI BELGELER EKRANINDA.
 *
 * Adres Ayarların dibinde duruyordu ve ürün sahibi bulamadı
 * ("yeri kötü"). Belge eklemenin diğer yolları bu paneldeyken
 * e-postayla göndermek ayrı bir sayfada olamaz.
 */
describe('e-posta ile gönderme seçeneği', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue({ documents: [] })
  })

  it('kanal sunucuda yapılandırılmamışsa seçenek HİÇ gösterilmez', async () => {
    /* Adres göstermek posta gelmeyeceği hâlde çalışıyor izlenimi
       verirdi -- sessiz başarısızlığın kötü türü. */
    mocks.inboxGet.mockResolvedValue({ acik: true, adres: 'x@y.test', kanalHazir: false })
    renderPage()

    await screen.findByText(/Belge veya fotoğraf ekleyin/)
    expect(screen.queryByRole('button', { name: /E-posta ile gönder/ })).not.toBeInTheDocument()
  })

  it('kanal hazırken adres açılıp gösteriliyor', async () => {
    mocks.inboxGet.mockResolvedValue({
      acik: true, adres: 'olcum-isletmesi-a7k3@localkarar.com', kanalHazir: true
    })
    renderPage()

    const dugme = await screen.findByRole('button', { name: /E-posta ile gönder/ })
    /* Adres AÇILMADAN görünmemeli: panel zaten kalabalık. */
    expect(screen.queryByText(/olcum-isletmesi-a7k3/)).not.toBeInTheDocument()

    fireEvent.click(dugme)
    expect(await screen.findByText(/olcum-isletmesi-a7k3@localkarar.com/)).toBeInTheDocument()
  })

  it('kutu açılmamışsa kullanıcı Ayarlara yönlendiriliyor', async () => {
    /* Boş ekran ne yapacağını söylemeli; "adres yok" tek başına
       kullanıcıyı çıkmaza sokar. */
    mocks.inboxGet.mockResolvedValue({ acik: false, adres: null, kanalHazir: true })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /E-posta ile gönder/ }))
    expect(await screen.findByText(/henüz oluşturulmadı/)).toBeInTheDocument()
  })
})
