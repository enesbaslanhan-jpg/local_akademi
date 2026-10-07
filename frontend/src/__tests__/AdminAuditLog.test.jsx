import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AdminAuditLog from '@/pages/admin/AdminAuditLog'

const mocks = vi.hoisted(() => ({ getAuditLogs: vi.fn() }))
vi.mock('@/services/api', () => ({ api: { admin: { getAuditLogs: mocks.getAuditLogs } } }))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key }) }))
beforeEach(() => {
  vi.clearAllMocks()
  mocks.getAuditLogs.mockResolvedValue({ logs: [], total: 0 })
})

describe('admin audit user filter', () => {
  it('sends an actor filter and clears it without retaining stale state', async () => {
    render(<AdminAuditLog />)
    await waitFor(() => expect(mocks.getAuditLogs).toHaveBeenCalledWith({ page: 1, limit: 20 }))
    fireEvent.change(screen.getByLabelText('audit.table.user ID'), { target: { value: '17' } })
    await waitFor(() => expect(mocks.getAuditLogs).toHaveBeenLastCalledWith({ page: 1, limit: 20, actorId: '17' }))
    fireEvent.click(screen.getByRole('button', { name: 'audit.filters.clear' }))
    await waitFor(() => expect(mocks.getAuditLogs).toHaveBeenLastCalledWith({ page: 1, limit: 20 }))
    expect(screen.getByLabelText('audit.table.user ID')).toHaveValue(null)
  })
})
