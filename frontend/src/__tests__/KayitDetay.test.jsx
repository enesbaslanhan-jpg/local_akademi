import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import KayitDetay from '@/pages/Workspaces/KayitDetay'

/*
 * KAYIT DETAYI.
 *
 * 🔴 BU EKRAN HİÇ YOKTU. Takip listesindeki her satırın sonunda bir ok
 * (>) duruyordu ama tıklayınca hiçbir şey olmuyordu -- detay görünümü
 * planlanmış, yazılmamıştı. Ürün sahibinin tespiti: "kayıt tamam ama
 * üstüne basınca ne olduğunu göstermiyor".
 *
 * Ekranın cevaplaması gereken soru: "bu kayıt nereden geldi, neye
 * dayanıyor?" Testler tam olarak bunu koruyor.
 */

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  belgeListesi: vi.fn(),
  bagla: vi.fn(),
  bagKopar: vi.fn()
}))

vi.mock('@/services/api', () => ({
  api: {
    workspace: {
      tracker: { get: mocks.get, attachDocument: mocks.bagla, detachDocument: mocks.bagKopar },
      documents: { list: mocks.belgeListesi }
    }
  }
}))

/* Düzenle/sil akışı bildirim kutusunu kullanıyor; bu testler onu
   değil EKRANI koruyor -- sağlayıcı kurulmadan sessiz bir ikaz ile
   geçiliyor. */
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() })
}))

const eFaturaAnalizi = JSON.stringify({
  eFatura: {
    id: 'GIB20090000000001',
    duzenlemeTarihi: '2009-01-05',
    vadeTarihi: '2009-01-20',
    odenecekTutar: 17.88,
    paraBirimi: 'TRY',
    satici: { unvan: 'AAA Anonim Şirketi', kimlik: '1288331521', kimlikTuru: 'VKN' },
    alici: { unvan: 'Ali YILMAZ', kimlik: '1234567890', kimlikTuru: 'TCKN' }
  }
})

const kayit = (ek = {}) => ({
  id: 'r1',
  title: 'AAA Anonim Şirketi — Fatura GIB20090000000001',
  type: 'payment',
  status: 'open',
  direction: 'payable',
  amount: 17.88,
  currency: 'TRY',
  dueAt: '2009-01-20T00:00:00.000Z',
  createdAt: '2026-08-23T00:00:00.000Z',
  overdue: false,
  documents: [],
  reminders: [],
  history: [],
  ...ek
})

function ciz() {
  return render(<KayitDetay workspaceId="w1" recordId="r1" onClose={() => {}} />)
}

describe('Kayıt detayı', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tutar, yön ve vadeyi gösterir', async () => {
    mocks.get.mockResolvedValue(kayit())
    ciz()
    expect(await screen.findByText(/₺17,88/)).toBeInTheDocument()
    expect(screen.getByText(/Ödenecek \(borç\)/)).toBeInTheDocument()
  })

  /*
   * Geçmiş vade uyarısı. e-Fatura yüklenince kayıt faturanın KENDİ
   * vadesini alıyor; eski bir fatura kaydı takvimde bu ayın sayfasında
   * hiç görünmüyor. Sessiz kalmak yerine söyleniyor.
   */
  it('vadesi geçmiş kayıtta nerede görüneceğini söyler', async () => {
    mocks.get.mockResolvedValue(kayit({ overdue: true }))
    ciz()
    expect(await screen.findByText('Vadesi geçmiş')).toBeInTheDocument()
    /* Kullanıcıya kaydın NEREDE görüneceği söylenmeli. */
    expect(screen.getByText(/Takvimde o ayda görünür/)).toBeInTheDocument()
  })

  it('vadesi geçmemiş kayıtta uyarı çıkmaz', async () => {
    mocks.get.mockResolvedValue(kayit({ overdue: false }))
    ciz()
    await screen.findByText(/₺17,88/)
    expect(screen.queryByText('Vadesi geçmiş')).not.toBeInTheDocument()
  })

  /*
   * 🔴 Yönü belirsiz kayıt toplamlara girmiyor. Kullanıcının bunu
   * bilmesi şart, yoksa "tutarım neden görünmüyor" der.
   */
  it('yön belirsizken toplamlara girmediğini açıkça yazar', async () => {
    mocks.get.mockResolvedValue(kayit({ direction: 'neutral' }))
    ciz()
    expect(await screen.findByText('Yön belirlenemedi')).toBeInTheDocument()
    /* Toplamlara girmediği AÇIKÇA yazmalı; kullanıcı "tutarım neden
       görünmüyor" dememeli. */
    expect(screen.getByText(/toplamlarına dahil edilmiyor/)).toBeInTheDocument()
  })

  /*
   * DAYANAK. "Bu rakam nereden geldi" sorusunun cevabı; kullanıcı
   * rakama körlemesine güvenmek zorunda kalmasın.
   */
  it('e-Fatura eki varsa faturanın kendi alanlarını gösterir', async () => {
    mocks.get.mockResolvedValue(kayit({
      documents: [{ id: 'b1', document: { id: 'd1', originalName: 'fatura.xml', sizeBytes: 6556, analysis: eFaturaAnalizi } }]
    }))
    ciz()
    expect(await screen.findByText('Dayanak belge')).toBeInTheDocument()
    expect(screen.getByText(/alanlar tahmin edilmedi/)).toBeInTheDocument()
    expect(screen.getByText('GIB20090000000001')).toBeInTheDocument()
    expect(screen.getByText(/VKN 1288331521/)).toBeInTheDocument()
  })

  /* e-Fatura olmayan ekte yanıltıcı "okundu" rozeti çıkmamalı. */
  it('e-Fatura olmayan ekte okundu rozeti gösterilmez', async () => {
    mocks.get.mockResolvedValue(kayit({
      documents: [{ id: 'b1', document: { id: 'd1', originalName: 'fis.pdf', sizeBytes: 1000, analysis: '{}' } }]
    }))
    ciz()
    expect(await screen.findByText('Dayanak belge')).toBeInTheDocument()
    expect(screen.queryByText(/alanlar tahmin edilmedi/)).not.toBeInTheDocument()
    expect(screen.getByText(/e-Fatura olarak okunamadı/)).toBeInTheDocument()
  })

  it('yükleme hatası sessizce yutulmaz', async () => {
    mocks.get.mockRejectedValue(new Error('Sunucuya ulaşılamadı'))
    ciz()
    expect(await screen.findByText('Sunucuya ulaşılamadı')).toBeInTheDocument()
  })

  /*
   * KAYIT–BELGE BAĞLAMA (madde 11).
   *
   * 🔴 Uç ve API istemcisi vardı, arayüzde HİÇBİR YERDEN
   * çağrılmıyordu. Kullanıcı elindeki bir belgeyi mevcut bir kayda
   * bağlayamıyordu; bağ yalnız belge analizinden ÜRETİLEN kayıtlarda
   * kuruluyordu.
   */
  it('belgesi olmayan kayıtta da bölüm ve bağlama düğmesi görünür', async () => {
    mocks.get.mockResolvedValue(kayit())
    ciz()
    expect(await screen.findByText('Dayanak belge')).toBeInTheDocument()
    expect(screen.getByText('Bu kayda bağlı belge yok.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Belge bağla' })).toBeInTheDocument()
  })

  /* Liste ANCAK seçici açılınca çekiliyor. */
  it('belge listesi ancak seçici açılınca isteniyor', async () => {
    mocks.get.mockResolvedValue(kayit())
    mocks.belgeListesi.mockResolvedValue({ documents: [] })
    ciz()
    await screen.findByText('Dayanak belge')
    expect(mocks.belgeListesi).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Belge bağla' }))
    expect(mocks.belgeListesi).toHaveBeenCalledWith('w1')
    expect(await screen.findByText('Bağlanabilecek başka belge yok.')).toBeInTheDocument()
  })

  /* Zaten bağlı belge seçeneklerde ÇIKMAMALI: hiçbir şey
     değiştirmeyecek bir seçenek göstermek yanıltıcı olurdu. */
  it('zaten bağlı belgeyi seçeneklerde göstermez ve seçileni bağlar', async () => {
    mocks.get.mockResolvedValue(kayit({
      documents: [{ id: 'b1', document: { id: 'd1', originalName: 'fatura.xml', sizeBytes: 6556, analysis: '{}' } }]
    }))
    mocks.belgeListesi.mockResolvedValue({
      documents: [
        { id: 'd1', originalName: 'fatura.xml', createdAt: '2026-09-01T00:00:00.000Z' },
        { id: 'd2', originalName: 'sozlesme.pdf', createdAt: '2026-09-02T00:00:00.000Z' }
      ]
    })
    mocks.bagla.mockResolvedValue({})
    ciz()
    await screen.findByText('Dayanak belge')

    await userEvent.click(screen.getByRole('button', { name: 'Belge bağla' }))
    expect(await screen.findByText('sozlesme.pdf')).toBeInTheDocument()
    /* fatura.xml yalnız BAĞLI belge başlığında görünmeli, seçenek
       olarak değil -- yani tek kez. */
    expect(screen.getAllByText('fatura.xml')).toHaveLength(1)

    await userEvent.click(screen.getByText('sozlesme.pdf'))
    expect(mocks.bagla).toHaveBeenCalledWith('w1', 'r1', 'd2')
  })

  /*
   * ⚠️ Kopar düğmesi BELGEYİ SİLMİYOR, yalnız bağı koparıyor.
   * Etiketin bunu söylemesi şart: kullanıcı belgesini kaybetmekten
   * korkmamalı.
   */
  it('bağı koparır ve bunun belgeyi silmediğini söyler', async () => {
    mocks.get.mockResolvedValue(kayit({
      documents: [{ id: 'b1', document: { id: 'd1', originalName: 'fatura.xml', sizeBytes: 6556, analysis: '{}' } }]
    }))
    mocks.bagKopar.mockResolvedValue({})
    ciz()
    await screen.findByText('Dayanak belge')

    const kopar = screen.getByRole('button', { name: 'fatura.xml bağını kopar' })
    expect(kopar).toHaveAttribute('title', 'Bağı koparır; belge silinmez.')
    await userEvent.click(kopar)
    expect(mocks.bagKopar).toHaveBeenCalledWith('w1', 'r1', 'd1')
  })
})
