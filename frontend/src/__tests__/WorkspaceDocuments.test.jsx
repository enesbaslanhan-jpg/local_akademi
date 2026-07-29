import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Documents from '@/pages/Workspaces/Documents'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  upload: vi.fn(),
  archive: vi.fn(),
  acceptSuggestion: vi.fn(),
  rejectSuggestion: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() }
}))

vi.mock('@/services/api', () => ({
  api: {
    workspace: {
      documents: {
        list: mocks.list,
        upload: mocks.upload,
        archive: mocks.archive,
        acceptSuggestion: mocks.acceptSuggestion,
        rejectSuggestion: mocks.rejectSuggestion
      }
    }
  }
}))

vi.mock('@/context/ToastContext', () => ({
  useToast: () => mocks.toast
}))

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/workspaces/workspace-1/documents']}>
      <Routes>
        <Route path="/app/workspaces/:workspaceId/documents" element={<Documents />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Workspace documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.list.mockResolvedValue({ documents: [] })
    mocks.upload.mockResolvedValue({ id: 'document-1' })
  })

  it('shows file, gallery and camera upload choices', async () => {
    const { container } = renderPage()

    expect(await screen.findByText('Belge veya fotoğraf ekleyin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /dosya seç/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fotoğraf seç/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fotoğraf çek/i })).toBeInTheDocument()
    expect(container.querySelector('input[capture="environment"]')).toBeInTheDocument()
  })

  it('uploads a selected document for automatic analysis', async () => {
    const { container } = renderPage()
    await screen.findByText('Belge veya fotoğraf ekleyin')
    const input = container.querySelector('input[accept*=".pdf"]')
    const file = new File(['fatura son ödeme 31.12.2026 1.250,00 TL'], 'fatura.pdf', { type: 'application/pdf' })

    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('workspace-1', file, { category: 'other' }))
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith(expect.stringMatching(/algılanan takip bilgilerini/i)))
  })
})
