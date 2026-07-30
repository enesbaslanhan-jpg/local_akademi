import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MentorPage from '../pages/MentorPage'
import { api } from '@/services/api'

const { request, buildQuery } = vi.hoisted(() => {
  const BASE = '/mentor/conversations'
  function buildQuery(params) {
    const q = new URLSearchParams()
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, v)
    })
    const s = q.toString()
    return s ? `?${s}` : ''
  }
  const request = vi.fn(async (path, options = {}) => {
    const token = localStorage.getItem('token')
    const response = await fetch(`${import.meta.env?.VITE_API_URL || ''}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }
    })
    return response.json()
  })
  return { request, buildQuery }
})

const BASE = '/mentor/conversations'

vi.mock('@/services/api', () => ({
  api: {
    request,
    conversation: {
      getList: vi.fn((archived = false) => request(`${BASE}${buildQuery({ archived: archived ? 'true' : 'false' })}`)),
      archive: vi.fn((id) => request(`${BASE}/${id}/archive`, { method: 'PATCH' })),
      unarchive: vi.fn((id) => request(`${BASE}/${id}/unarchive`, { method: 'PATCH' })),
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      streamMessage: vi.fn(),
      regenerate: vi.fn(),
      editAndRegenerate: vi.fn(),
    }
  }
}))

vi.mock('../components/ui', () => ({
  Loading: ({ text }) => <div>{text}</div>,
  EmptyState: ({ message }) => <div>{message}</div>
}))

vi.mock('../components/memory/MemoryPanel', () => ({
  default: ({ visible, onClose }) => visible ? <div data-testid="memory-panel"><button onClick={onClose}>Kapat</button></div> : null
}))

vi.mock('../components/mentor/CitationBadge', () => ({
  default: ({ title }) => <span>{title}</span>
}))

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => 'test-token'),
    setItem: vi.fn(),
    removeItem: vi.fn()
  },
  writable: true
})

window.HTMLElement.prototype.scrollIntoView = vi.fn()
window.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}))

function mockFetchResponse(response) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => response,
    status: 200,
    statusText: 'OK',
    headers: new Headers()
  })
}

function buildConversationsResponse(conversations) {
  return { conversations }
}

describe('MentorPage archive UX', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchResponse(buildConversationsResponse([]))
    api.conversation.getById.mockResolvedValue({ messages: [] })
    window.confirm = vi.fn(() => true)
  })

  it('renders active and archive tabs', async () => {
    render(<MemoryRouter><MentorPage /></MemoryRouter>)
    await waitFor(() => {
      expect(screen.getByLabelText('Aktif sohbetler')).toBeInTheDocument()
      expect(screen.getByLabelText('Arşivlenmiş sohbetler')).toBeInTheDocument()
    })
  })

  it('calls archive endpoint and removes active conversation from list', async () => {
    const activeConv = { id: 1, title: 'Aktif Sohbet', messageCount: 0, lastMessageAt: null, updatedAt: new Date().toISOString() }
    mockFetchResponse(buildConversationsResponse([activeConv]))

    const { container } = render(<MemoryRouter><MentorPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByText('Aktif Sohbet').length).toBeGreaterThan(0))

    const callsBefore = global.fetch.mock.calls.length
    const archiveBtn = container.querySelector('button[title="Arşivle"]')
    expect(archiveBtn).not.toBeNull()
    fireEvent.click(archiveBtn)

    await waitFor(() => {
      const calls = global.fetch.mock.calls.slice(callsBefore)
      const archiveCall = calls.find(([url]) => url.includes('/mentor/conversations/1/archive'))
      expect(archiveCall).toBeDefined()
      const [, options] = archiveCall
      expect(options.method).toBe('PATCH')
    })
  })

  it('shows unarchive button in archive view', async () => {
    const archivedConv = { id: 2, title: 'Arşivli Sohbet', messageCount: 0, archivedAt: new Date().toISOString(), lastMessageAt: null, updatedAt: new Date().toISOString() }
    mockFetchResponse(buildConversationsResponse([archivedConv]))

    const { container } = render(<MemoryRouter><MentorPage /></MemoryRouter>)
    const archiveTab = await waitFor(() => screen.getByLabelText('Arşivlenmiş sohbetler'))
    fireEvent.click(archiveTab)

    await waitFor(() => {
      expect(screen.getAllByText('Arşivli Sohbet').length).toBeGreaterThan(0)
      expect(container.querySelector('button[title="Arşivden çıkar"]')).not.toBeNull()
    })
  })

  it('returns archived conversation to active list after unarchive', async () => {
    const archivedConv = { id: 3, title: 'Geri Alınacak', messageCount: 0, archivedAt: new Date().toISOString(), lastMessageAt: null, updatedAt: new Date().toISOString() }
    mockFetchResponse(buildConversationsResponse([archivedConv]))

    const { container } = render(<MemoryRouter><MentorPage /></MemoryRouter>)
    const archiveTab = await waitFor(() => screen.getByLabelText('Arşivlenmiş sohbetler'))
    fireEvent.click(archiveTab)

    await waitFor(() => expect(container.querySelector('button[title="Arşivden çıkar"]')).not.toBeNull())
    const callsBefore = global.fetch.mock.calls.length
    fireEvent.click(container.querySelector('button[title="Arşivden çıkar"]'))

    await waitFor(() => {
      const calls = global.fetch.mock.calls.slice(callsBefore)
      const unarchiveCall = calls.find(([url]) => url.includes('/mentor/conversations/3/unarchive'))
      expect(unarchiveCall).toBeDefined()
      const [, options] = unarchiveCall
      expect(options.method).toBe('PATCH')
    })
  })

  it('hides message input in archive view', async () => {
    render(<MemoryRouter><MentorPage /></MemoryRouter>)
    const archiveTab = await waitFor(() => screen.getByLabelText('Arşivlenmiş sohbetler'))
    fireEvent.click(archiveTab)

    await waitFor(() => {
      expect(screen.getByText('Arşivlenmiş sohbetlere yeni mesaj gönderilemez.')).toBeInTheDocument()
    })
  })

  it('preserves mobile layout classes', async () => {
    const { container } = render(<MemoryRouter><MentorPage /></MemoryRouter>)
    await waitFor(() => {
      const aside = container.querySelector('aside')
      expect(aside).toHaveClass('md:relative')
      expect(aside).toHaveClass('w-72')
    })
  })
})

describe('conversation archive API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem('token', 'test-token')
  })

  it('getList passes archived=false by default', async () => {
    mockFetchResponse(buildConversationsResponse([]))
    await api.conversation.getList()
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('archived=false')
  })

  it('getList passes archived=true when requested', async () => {
    mockFetchResponse(buildConversationsResponse([]))
    await api.conversation.getList(true)
    const [url] = global.fetch.mock.calls[0]
    expect(url).toContain('archived=true')
  })

  it('archive calls PATCH /:id/archive', async () => {
    mockFetchResponse({ conversation: { id: 1 } })
    await api.conversation.archive(1)
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toContain('/mentor/conversations/1/archive')
    expect(options.method).toBe('PATCH')
  })

  it('unarchive calls PATCH /:id/unarchive', async () => {
    mockFetchResponse({ conversation: { id: 1 } })
    await api.conversation.unarchive(1)
    const [url, options] = global.fetch.mock.calls[0]
    expect(url).toContain('/mentor/conversations/1/unarchive')
    expect(options.method).toBe('PATCH')
  })
})
