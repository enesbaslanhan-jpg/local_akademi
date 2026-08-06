import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PersonalizedFeed } from './PersonalizedFeed'
import { api } from '@/services/api'
import { BrowserRouter } from 'react-router-dom'

vi.mock('@/services/api', () => ({
  api: {
    feed: {
      getFeed: vi.fn(),
      dismissItem: vi.fn(),
      viewItem: vi.fn()
    }
  }
}))

vi.mock('@/context/MentorContext', () => ({
  useMentorContext: () => ({ openMentorWithContext: vi.fn() })
}))

// Mock env var
vi.stubEnv('VITE_FF_PERSONALIZED_FEED', 'true')

describe('PersonalizedFeed', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders loading state initially', () => {
    api.feed.getFeed.mockResolvedValue(new Promise(() => {}))
    render(
      <BrowserRouter>
        <PersonalizedFeed resumeItem={null} />
      </BrowserRouter>
    )
    expect(screen.getByText('Akış yükleniyor...')).toBeInTheDocument()
  })

  it('renders empty state if feed is empty', async () => {
    api.feed.getFeed.mockResolvedValue({ items: [] })
    render(
      <BrowserRouter>
        <PersonalizedFeed resumeItem={null} />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Akış boş')).toBeInTheDocument()
    })
  })

  it('renders continue learning and other items in separate sections', async () => {
    const mockItems = [
      {
        itemKey: 'enr1',
        type: 'continue_learning',
        title: 'Learn Prisma',
        reasonText: 'Devam et',
        primaryAction: { label: 'Devam Et', route: '/lesson/1' }
      },
      {
        itemKey: 'dc1',
        type: 'decision_check',
        title: 'Check your setup',
        reasonText: 'Önemli',
        primaryAction: { label: 'Kontrol Et', route: '/check/1' }
      }
    ]
    api.feed.getFeed.mockResolvedValue({ items: mockItems })
    
    render(
      <BrowserRouter>
        <PersonalizedFeed resumeItem={null} />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Kaldığın yerden devam et')).toBeInTheDocument()
      expect(screen.getByText('Senin İçin Seçtiklerimiz')).toBeInTheDocument()
      expect(screen.getByText('Learn Prisma')).toBeInTheDocument()
      expect(screen.getByText('Check your setup')).toBeInTheDocument()
    })
  })
})
