import { render, screen, cleanup, fireEvent } from '@testing-library/react'
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
    expect(screen.getByText('Hesaplamalar')).toBeInTheDocument()
    expect(screen.queryByText('Model Lab')).not.toBeInTheDocument()
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

  /*
   * 22.08.2026: Yönetim bölümü AÇILIR-KAPANIR oldu (ürün kararı).
   * Altı bağlantı düz liste hâlinde menünün yarısını kaplıyordu.
   *
   * Bu yüzden test "bağlantılar hemen görünür" demekten "başlık
   * görünür, tıklayınca bağlantılar açılır"a döndü. Beklentinin
   * değişmesi gerileme DEĞİL, kararın kendisi.
   */
  it('yönetici için Yönetim başlığı görünür, bağlantılar KAPALI başlar', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, user: { role: 'admin' } })

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText('Yönetim')).toBeInTheDocument()
    expect(screen.queryByText('KO Yönetimi')).not.toBeInTheDocument()
  })

  it('Yönetim tıklanınca alt bağlantılar açılır', () => {
    mockUseAuth.mockReturnValue({ isAdmin: true, user: { role: 'admin' } })

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByText('Yönetim'))

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

  it('shows the tracker link for the active workspace', () => {
    mockUseWorkspace.mockReturnValue({ activeWorkspaceId: 'workspace-1', hasWorkspaces: true })

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.getByText('İşletme Takibi')).toBeInTheDocument()
  })

  /* "Kaydedilenler" menüden kaldırıldı: uygulamada kaydetme kavramı yok.
     Bookmark eylemi hiç yok, karar günlüğü yazılıp okunamıyor ve
     SavedPracticalCards var olmayan bir API'yi çağırıyor. Kullanıcının
     kaydettiği şeylerin kendi ekranları var (Kurslar, Model Lab, İşletme
     Takibi). Gerçek bir kaydetme özelliği önce backend işi. */
  it('does not show a saved link while there is nothing to save', () => {
    mockUseWorkspace.mockReturnValue({ activeWorkspaceId: 'workspace-1', hasWorkspaces: true })

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <Sidebar open={true} onClose={() => {}} />
      </MemoryRouter>
    )

    expect(screen.queryByText('Kaydedilenler')).not.toBeInTheDocument()
  })
})
