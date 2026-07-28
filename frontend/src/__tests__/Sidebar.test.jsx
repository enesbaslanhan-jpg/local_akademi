import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Sidebar from '@/components/layout/Sidebar'

const mockUseAuth = vi.fn()
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseWorkspace = vi.fn()
vi.mock('@/context/WorkspaceContext', () => ({
  useWorkspace: () => mockUseWorkspace(),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAdmin: false, user: { role: 'learner' } })
    mockUseWorkspace.mockReturnValue({ activeWorkspaceId: null, hasWorkspaces: false })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders learner navigation links', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Bilgi Nesneleri')).toBeInTheDocument()
    expect(screen.getByText('AI Mentor')).toBeInTheDocument()
    expect(screen.getByText('Öğrenme Yolu')).toBeInTheDocument()
  })

  it('does not show admin links for non-admin', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.queryByText('KO Yönetimi')).not.toBeInTheDocument()
    expect(screen.queryByText('Kullanıcılar')).not.toBeInTheDocument()
  })

  it('shows admin links when user is admin', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, user: { role: 'admin' } })

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText('KO Yönetimi')).toBeInTheDocument()
    expect(screen.getByText('Kullanıcılar')).toBeInTheDocument()
  })

  it('renders with correct aria-label', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByLabelText('Ana navigasyon')).toBeInTheDocument()
  })

  it('shows workspace link', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText('İşletmelerim')).toBeInTheDocument()
  })
})
