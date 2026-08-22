import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, afterEach } from 'vitest'
import * as CommunityModule from '@/pages/CommunityPage'

/*
 * TOPLULUK KARTI.
 *
 * 🔴 BU DOSYA BİR AÇIĞI KAPATIYOR.
 *
 * 22.08.2026'da bir düzenleme sırasında `CommunityPage`in ana bileşeni
 * ve `GonderiMenusu` yanlışlıkla silindi. Sayfa tarayıcıda tamamen
 * boş açıldı — ama **277 testin hiçbiri düşmedi** ve `vite build`
 * temiz geçti. Sebep: kart hiçbir testte render edilmiyordu, eksik
 * bileşen de yalnız çalışma anında patlıyor.
 *
 * Buradaki testler ucuz ama tam olarak o boşluğu tutuyor: modül
 * gerçekten bir sayfa dışa açıyor mu, ve kart gerçekten çiziliyor mu.
 */

vi.mock('@/services/api', () => ({
  api: { community: { post: vi.fn(() => new Promise(() => {})) } },
}))

const { CommunityCard } = CommunityModule

const ornekGonderi = {
  id: 'gonderi-1',
  summary: 'Kargo firmasını değiştirince teslim süresi kısaldı.',
  publishedAt: new Date().toISOString(),
  author: { id: 7, name: 'Deniz Kaya' },
  media: null,
  quotedPost: null,
  begeniSayisi: 3,
  yanitSayisi: 2,
  alintiSayisi: 0,
  begendim: false,
  kaydettim: false,
}

function ciz(ozellikler = {}) {
  const varsayilan = {
    post: ornekGonderi,
    kaldirilabilir: false,
    onReport: vi.fn(),
    onRemove: vi.fn(),
    onEtkilesim: vi.fn(),
    onYanitla: vi.fn(),
    onAlintila: vi.fn(),
    onPaylas: vi.fn(),
    onAc: vi.fn(),
  }
  const props = { ...varsayilan, ...ozellikler }
  render(<MemoryRouter><CommunityCard {...props} /></MemoryRouter>)
  return props
}

afterEach(cleanup)

describe('CommunityPage modülü', () => {
  it('🔴 sayfanın kendisini dışa açıyor — yönlendirici bunu bekliyor', () => {
    /* `lazy(() => import('@/pages/CommunityPage'))` varsayılan dışa
       açılanı bekliyor. Yoksa sayfa boş açılır ve build hata vermez. */
    expect(typeof CommunityModule.default).toBe('function')
  })

  it('kartın bağlı olduğu yardımcılar da dışa açık', () => {
    for (const ad of ['CommunityCard', 'GonderiMenusu', 'IslemSatiri', 'PostMedia', 'AlintiBlogu', 'initials', 'timeAgo']) {
      expect(typeof CommunityModule[ad], ad).toBe('function')
    }
  })
})

describe('CommunityCard', () => {
  it('yazarı, metni ve sayıları çiziyor', () => {
    ciz()

    expect(screen.getByText('Deniz Kaya')).toBeInTheDocument()
    expect(screen.getByText(/Kargo firmasını değiştirince/)).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('beş eşit işlem düğmesi de var', () => {
    const props = ciz()

    expect(screen.getByText('Beğen')).toBeInTheDocument()
    expect(screen.getByText('Yanıtla')).toBeInTheDocument()
    expect(screen.getByText('Alıntıla')).toBeInTheDocument()
    expect(screen.getByText('Kaydet')).toBeInTheDocument()
    expect(screen.getByLabelText('Paylaş')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Alıntıla' }))
    expect(props.onAlintila).toHaveBeenCalledWith(ornekGonderi)
    expect(props.onAc).not.toHaveBeenCalled()
  })

  it('metinsiz medya gönderisini de erişilebilir büyütme kontrolüyle çiziyor', () => {
    const props = ciz({ post: { ...ornekGonderi, summary: '', media: { id: 12, kind: 'image', url: '/media/ornek.png' } } })

    expect(screen.queryByText(/Kargo firmasını/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Görseli büyüt' }))
    expect(screen.getByRole('dialog', { name: 'Görsel önizleme' })).toBeInTheDocument()
    expect(props.onAc).not.toHaveBeenCalled()
  })

  it('kartın boş gövdesi gönderiyi açar, işlem düğmesi açmaz', () => {
    const props = ciz()
    const kart = screen.getByText(/Kargo firmasını/).closest('article')

    fireEvent.click(kart)
    expect(props.onAc).toHaveBeenCalledWith('gonderi-1')

    props.onAc.mockClear()
    fireEvent.click(screen.getByText('Kaydet'))
    expect(props.onAc).not.toHaveBeenCalled()
  })

  it('beğeni düğmesi doğru yönde çağrı yapıyor', () => {
    const props = ciz()

    fireEvent.click(screen.getByText('Beğen'))

    expect(props.onEtkilesim).toHaveBeenCalledWith(ornekGonderi, 'like', true)
  })

  it('beğenilmiş gönderide düğme basılı görünür ve geri alır', () => {
    const props = ciz({ post: { ...ornekGonderi, begendim: true } })

    /* İşaret yalnız renkle değil `aria-pressed` ile de veriliyor. */
    const dugme = screen.getByText('Beğen').closest('button')
    expect(dugme).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(dugme)
    expect(props.onEtkilesim).toHaveBeenCalledWith(expect.anything(), 'like', false)
  })

  describe('"..." menüsü', () => {
    it('kapalı başlar', () => {
      ciz()
      expect(screen.queryByText('Raporla')).not.toBeInTheDocument()
    })

    it('açılınca Raporla çıkar, Kaldır YETKİSİZ kullanıcıda ÇIKMAZ', () => {
      ciz({ kaldirilabilir: false })

      fireEvent.click(screen.getByLabelText('Gönderi işlemleri'))

      expect(screen.getByText('Raporla')).toBeInTheDocument()
      /* Yetkisiz kullanıcıya kaldırma düğmesi göstermek, sunucudan
         403 yiyecek bir eylemi davet etmek olurdu. */
      expect(screen.queryByText('Kaldır')).not.toBeInTheDocument()
    })

    it('yetkili kullanıcıda Kaldır çıkar ve çağırır', () => {
      const props = ciz({ kaldirilabilir: true })

      fireEvent.click(screen.getByLabelText('Gönderi işlemleri'))
      fireEvent.click(screen.getByText('Kaldır'))

      expect(props.onRemove).toHaveBeenCalledWith('gonderi-1')
    })
  })

  describe('alıntı bloğu', () => {
    it('alıntılanan gönderiyi gösterir', () => {
      ciz({ post: { ...ornekGonderi, quotedPost: {
        id: 'kaynak-1', kaldirildi: false, summary: 'Atölyeden kısa bir kayıt.',
        author: { id: 9, name: 'Ayşe Yılmaz' }, publishedAt: new Date().toISOString(), media: null,
      } } })

      expect(screen.getByText('Ayşe Yılmaz')).toBeInTheDocument()
      expect(screen.getByText('Atölyeden kısa bir kayıt.')).toBeInTheDocument()
    })

    it('🔴 kaldırılmış kaynağın İÇERİĞİNİ göstermez', () => {
      ciz({ post: { ...ornekGonderi, quotedPost: {
        id: 'kaynak-2', kaldirildi: true, summary: null, author: null, media: null,
      } } })

      /* Gösterseydi kaldırma yetkisi alıntıyla atlatılırdı. */
      expect(screen.getByText('Bu paylaşım kaldırıldı.')).toBeInTheDocument()
    })
  })
})
