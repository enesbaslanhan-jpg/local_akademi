import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testState = vi.hoisted(() => ({
  auth: { isAdmin: false, user: { id: 7, name: 'Deniz Kaya', role: 'student' } },
  community: {
    list: vi.fn(),
    moderation: vi.fn(),
    reports: vi.fn(),
    benimOzetim: vi.fn(),
    post: vi.fn(),
    etkilesim: vi.fn(),
    remove: vi.fn(),
    report: vi.fn(),
    submit: vi.fn(),
  },
}))

vi.mock('@/context/AuthContext', () => ({ useAuth: () => testState.auth }))
vi.mock('@/services/api', () => ({ api: { community: testState.community } }))

const { default: CommunityPage } = await import('@/pages/CommunityPage')
const { default: CommunityPostPage } = await import('@/pages/CommunityPostPage')

const gonderi = {
  id: 'post-1',
  summary: 'Mahalle esnafıyla ortak teslimat rotası kurduk.',
  publishedAt: new Date().toISOString(),
  author: { id: 7, name: 'Deniz Kaya' },
  media: null,
  quotedPost: null,
  replies: [],
  begeniSayisi: 4,
  yanitSayisi: 0,
  alintiSayisi: 0,
  begendim: false,
  kaydettim: false,
}

beforeEach(() => {
  testState.auth = { isAdmin: false, user: { id: 7, name: 'Deniz Kaya', role: 'student' } }
  testState.community.list.mockResolvedValue({ posts: [gonderi] })
  testState.community.moderation.mockResolvedValue({ posts: [] })
  testState.community.reports.mockResolvedValue({ reports: [] })
  testState.community.benimOzetim.mockResolvedValue({ paylasim: 8, begeni: 21, kayit: 5 })
  testState.community.post.mockResolvedValue({ post: gonderi, parent: null })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Topluluk sayfası', () => {
  it('geniş ana feed, arama ve sağ rail ile gönderiyi render eder', async () => {
    render(<MemoryRouter><CommunityPage mode="community" /></MemoryRouter>)

    expect((await screen.findAllByText(gonderi.summary))[0]).toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Profil özeti' })).not.toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Topluluk özeti' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Paylaşımlarda ara' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Yeni gönderi/ })).toBeInTheDocument()
    expect(screen.queryByText('Etkinliğim')).not.toBeInTheDocument()
    expect(screen.queryByText('Moderasyon araçları')).not.toBeInTheDocument()
  })

  it('arama metniyle paylaşım akışını filtreler', async () => {
    render(<MemoryRouter><CommunityPage mode="community" /></MemoryRouter>)
    await screen.findAllByText(gonderi.summary)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Paylaşımlarda ara' }), { target: { value: 'bulunmayan ifade' } })
    expect(screen.getByText('Aramanla eşleşen paylaşım bulunamadı.')).toBeInTheDocument()
  })

  it('moderasyon kontrolünü yalnız admin kullanıcıya gösterir', async () => {
    testState.auth = { isAdmin: true, user: { id: 1, name: 'Admin', role: 'admin' } }
    render(<MemoryRouter><CommunityPage mode="community" /></MemoryRouter>)

    await waitFor(() => expect(testState.community.moderation).toHaveBeenCalled())
    expect(screen.getByText('Moderasyon araçları')).toBeInTheDocument()
  })
})

describe('Tek gönderi sayfası', () => {
  it('feed kartını ve ona bağlı yanıt alanını birlikte render eder', async () => {
    render(
      <MemoryRouter initialEntries={['/app/community/gonderi/post-1']}>
        <Routes>
          <Route path="/app/community/gonderi/:postId" element={<CommunityPostPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText(gonderi.summary)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Paylaşım' })).toBeInTheDocument()
    const yanitAlani = screen.getByRole('textbox', { name: 'Yanıtın' })
    expect(yanitAlani).toBeInTheDocument()
    expect(yanitAlani.closest('form').querySelector('button[type="submit"]')).toBeDisabled()
  })
})
