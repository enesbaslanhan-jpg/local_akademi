import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NewsPage from '@/pages/NewsPage'
import { api } from '@/services/api'

vi.mock('@/services/api', () => ({ api: { news: { list: vi.fn() } } }))

const firstPage = {
  items: [{
    id: 'news-1', title: 'KOBİ finansman duyurusu', category: 'FINANS',
    canonicalUrl: 'https://www.tcmb.gov.tr/duyuru/1', imageId: 'finance-credit', imagePath: '/assets/news/placeholders/finance-credit.webp',
    sourceName: 'Türkiye Cumhuriyet Merkez Bankası', sourcePublishedAt: '2026-08-10T10:00:00.000Z',
    summary: 'Resmî finansman gelişmesinin işletmeler için kısa özeti.', whyItMatters: 'Nakit akışı ve kredi planları güncellenebilir.',
    tags: ['kredi'], affectedAudience: ['KOBİ'], importance: 'HIGH',
  }],
  nextCursor: 'next-page',
}

describe('NewsPage', () => {
  beforeEach(() => { api.news.list.mockReset().mockResolvedValue(firstPage) })

  it('renders automated news card fields and loads a selected category', async () => {
    render(<NewsPage />)
    expect(await screen.findByText('KOBİ finansman duyurusu')).toBeInTheDocument()
    expect(screen.getByText('Türkiye Cumhuriyet Merkez Bankası')).toBeInTheDocument()
    expect(screen.getByText('İşletmeniz için anlamı')).toBeInTheDocument()
    expect(screen.getByText('#kredi')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Vergi' }))
    await waitFor(() => expect(api.news.list).toHaveBeenLastCalledWith({ category: 'VERGI' }))
  })

  it('uses cursor pagination without replacing existing cards', async () => {
    api.news.list
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce({ items: [{ ...firstPage.items[0], id: 'news-2', title: 'İkinci resmî haber' }], nextCursor: null })
    render(<NewsPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Daha fazla haber/i }))
    expect(await screen.findByText('İkinci resmî haber')).toBeInTheDocument()
    expect(screen.getByText('KOBİ finansman duyurusu')).toBeInTheDocument()
    expect(api.news.list).toHaveBeenLastCalledWith({ category: undefined, cursor: 'next-page' })
  })
})
