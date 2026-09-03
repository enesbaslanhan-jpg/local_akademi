import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach } from 'vitest'
import CitationBadge from '@/components/mentor/CitationBadge'

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

afterEach(() => {
  cleanup()
})

/*
 * ATIF ROZETİ ARTIK BAĞLANTI DEĞİL.
 *
 * Bilgi Kütüphanesi ve Bilgi Nesnesi detayı kaldırıldı (03.09.2026,
 * ürün sahibi kararı); `/app/knowledge/:code` rotası artık yok.
 *
 * Bu testler kararın yanlışlıkla geri alınmasını engelliyor: biri
 * rozeti tekrar `<Link>` yaparsa, kullanıcıyı var olmayan bir sayfaya
 * göndereceği için test düşer.
 */
describe('CitationBadge', () => {
  it('kod verilse bile bağlantı üretmez', () => {
    renderWithRouter(<CitationBadge id={1} title="Şirket Kurulumu" code="KO-SIRKET" sourceRefs={[]} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Şirket Kurulumu')).toBeInTheDocument()
    /* Kod hâlâ görünür: atfın işi cevabın neye dayandığını göstermek. */
    expect(screen.getByText('(KO-SIRKET)')).toBeInTheDocument()
  })

  it('kod yokken de rozet çizilir', () => {
    renderWithRouter(<CitationBadge id={1} title="Bilinmeyen kaynak" sourceRefs={[]} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Bilinmeyen kaynak')).toBeInTheDocument()
  })

  it('birden fazla atıfın hiçbiri bağlantı olmaz', () => {
    renderWithRouter(
      <>
        <CitationBadge id={1} title="A" code="KO-A" sourceRefs={[]} />
        <CitationBadge id={2} title="B" code="KO-B" sourceRefs={[]} />
      </>
    )

    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})
