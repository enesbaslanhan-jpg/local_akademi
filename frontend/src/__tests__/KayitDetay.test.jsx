import { render, screen } from '@testing-library/react'
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

const mocks = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock('@/services/api', () => ({
  api: { workspace: { tracker: { get: mocks.get } } }
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
})
