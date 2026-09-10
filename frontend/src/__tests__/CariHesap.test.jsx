import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CariHesap from '@/pages/Workspaces/CariHesap'

/*
 * CARİ HESAP PANELİ.
 *
 * 🔴 Buradaki asıl kural: PARA BİRİMLERİ TOPLANMIYOR. Kur bilgisi
 * sistemde yok; 5.000 TL ile 200 USD'yi tek sayıda toplamak uydurma
 * bir rakam üretirdi. Test bunu kilitliyor.
 */
const mocks = vi.hoisted(() => ({
  hesap: vi.fn(),
  ekstre: vi.fn()
}))

vi.mock('@/services/api', () => ({
  api: {
    workspace: {
      contacts: { hesap: mocks.hesap },
      exports: { downloadContactStatement: mocks.ekstre }
    }
  }
}))

const VERI = {
  contact: { id: 'k1', name: 'Ahmet Usta', type: 'supplier' },
  bakiyeler: [
    { currency: 'TRY', alacak: 250, borc: 1000, bakiye: -750 },
    { currency: 'USD', alacak: 0, borc: 200, bakiye: -200 }
  ],
  hareketler: [
    { id: 'h1', title: 'Açık borç', direction: 'payable', status: 'open', amount: 1000, currency: 'TRY', dueAt: null, createdAt: '2026-09-01T00:00:00.000Z' },
    { id: 'h2', title: 'Kapanmış ödeme', direction: 'payable', status: 'completed', amount: 7777, currency: 'TRY', dueAt: null, createdAt: '2026-08-01T00:00:00.000Z' }
  ],
  kirpildi: false
}

function ekranaBas() {
  return render(
    <CariHesap workspaceId="ws-1" contactId="k1" contactName="Ahmet Usta" onClose={() => {}} />
  )
}

describe('Cari hesap paneli', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.hesap.mockResolvedValue(VERI)
    mocks.ekstre.mockResolvedValue({ filename: 'ahmet-usta-ekstre-2026-09-10.pdf' })
  })

  it('her para birimi kendi kartında gösteriliyor', async () => {
    ekranaBas()
    /* İki ayrı bakiye kartı: tek bir toplam sayı YOK. */
    await waitFor(() => expect(screen.getAllByText(/Net borç/i).length).toBe(2))
  })

  it('kapanmış hareket de listeleniyor', async () => {
    ekranaBas()
    /* Bakiye bugünü, ekstre geçmişi anlatır: kapanan kayıt gizlenmiyor. */
    await waitFor(() => expect(screen.getByText('Kapanmış ödeme')).toBeInTheDocument())
  })

  /*
   * ⚠️ Ekstre indirmesi başlarken düğme kilitleniyor; iki kez basmak
   * iki dosya indirirdi.
   */
  it('ekstre düğmesi PDF ucunu çağırıyor', async () => {
    ekranaBas()
    const dugme = await screen.findByRole('button', { name: /Ekstre/i })
    await waitFor(() => expect(dugme).not.toBeDisabled())
    fireEvent.click(dugme)
    await waitFor(() => expect(mocks.ekstre).toHaveBeenCalledWith('ws-1', 'k1'))
  })

  it('ekstre indirilemezse hata görünüyor, panel açık kalıyor', async () => {
    mocks.ekstre.mockRejectedValue(new Error('Ekstre indirilemedi.'))
    ekranaBas()
    const dugme = await screen.findByRole('button', { name: /Ekstre/i })
    await waitFor(() => expect(dugme).not.toBeDisabled())
    fireEvent.click(dugme)
    /* Sessiz başarısızlık, kullanıcıya "indi" izlenimi verirdi. */
    await waitFor(() => expect(screen.getByText('Ekstre indirilemedi.')).toBeInTheDocument())
    expect(screen.getByText('Kapanmış ödeme')).toBeInTheDocument()
  })
})
