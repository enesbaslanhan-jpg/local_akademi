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

    // Sadeleştirilmiş ana menü (Paket 4)
    expect(screen.getByText('Ana Sayfa')).toBeInTheDocument()
    expect(screen.getByText('Kurslar')).toBeInTheDocument()
    expect(screen.getByText('Finans Merkezi')).toBeInTheDocument()
    expect(screen.getByText('AI Mentor')).toBeInTheDocument()
  })

  it('menüden çıkarılan sayfaları listelemez (route\'lar durmaya devam eder)', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.queryByText('Bilgi Nesneleri')).not.toBeInTheDocument()
    expect(screen.queryByText('Öğrenme Yolu')).not.toBeInTheDocument()
    expect(screen.queryByText('Pilot Program')).not.toBeInTheDocument()
    expect(screen.queryByText('Kayıtlarım')).not.toBeInTheDocument()
    expect(screen.queryByText('Model Laboratuvarı')).not.toBeInTheDocument()
    expect(screen.queryByText('İşletme Takvimi')).not.toBeInTheDocument()
    expect(screen.queryByText('İşletmelerim')).not.toBeInTheDocument()
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

  it('shows a prominent workspace center link when no workspace exists', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText('İşletme Takibi')).toBeInTheDocument()
  })

  it('shows tracker and saved links for the active workspace', () => {
    mockUseWorkspace.mockReturnValue({ activeWorkspaceId: 'workspace-1', hasWorkspaces: true })

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText('İşletme Takibi')).toBeInTheDocument()
    expect(screen.getByText('Kaydedilenler')).toBeInTheDocument()
  })
})
