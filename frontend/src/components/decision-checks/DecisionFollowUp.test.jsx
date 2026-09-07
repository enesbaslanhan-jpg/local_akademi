import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorkspaceContext from '@/context/WorkspaceContext'
import DecisionFollowUp from './DecisionFollowUp'
import { formatDecisionText } from '@/utils/decisionText'

const mocks = vi.hoisted(() => ({ list: vi.fn(), members: vi.fn(), create: vi.fn(), get: vi.fn(), update: vi.fn() }))
vi.mock('@/services/api', () => ({ api: { workspace: { tracker: mocks, members: { list: mocks.members } } } }))
const session = { id: '71301eab-b986-4abe-b2db-7da7fd0f4cb9', decisionCheckTitle: 'Yeni şube' }
const ws = { activeWorkspaceId: 'ws-1', activeWorkspace: { name: 'Test işletmesi', myRole: 'owner' } }
function show(workspace = ws) {
  return render(<WorkspaceContext.Provider value={workspace}><DecisionFollowUp session={session} snapshot={{ calculationOutput: { safeNextSteps: ['Talebi doğrulayın.'] } }} navigate={vi.fn()} /></WorkspaceContext.Provider>)
}
beforeEach(() => {
  vi.resetAllMocks()
  mocks.list.mockResolvedValue({ records: [], total: 0 })
  mocks.members.mockResolvedValue([{ id: 'member-1', userId: 42, name: 'Ekip üyesi', status: 'active' }])
  mocks.create.mockImplementation(async (workspaceId, data) => ({ id: 'record-1', ...data }))
})
describe('Decision follow-up', () => {
  it('creates a real task with explicit expectations, date and user ID', async () => {
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Göreve dönüştür' }))
    await user.type(screen.getByLabelText('Görev başlığı'), 'Talep araştırması')
    await user.type(screen.getByLabelText('Beklenen sonuç'), '10 müşteri görüşmesi')
    fireEvent.change(screen.getByLabelText('Takip tarihi'), { target: { value: '2026-10-10' } })
    await user.selectOptions(screen.getByLabelText('Sorumlu'), '42')
    await user.click(screen.getByRole('button', { name: 'Görevi kaydet' }))
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith('ws-1', expect.objectContaining({ type: 'task', assignedToId: 42, metadata: { decisionSessionId: session.id, decisionFollowUp: { decisionTitle: 'Yeni şube', expectedOutcome: '10 müşteri görüşmesi' } } })))
    expect(await screen.findByText('Talep araştırması')).toBeInTheDocument()
  })
  it('requires an accountable assignee before creating the task', async () => {
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Göreve dönüştür' }))
    await user.type(screen.getByLabelText('Görev başlığı'), 'Talep araştırması')
    await user.type(screen.getByLabelText('Beklenen sonuç'), '10 müşteri görüşmesi')
    fireEvent.change(screen.getByLabelText('Takip tarihi'), { target: { value: '2026-10-10' } })
    await user.click(screen.getByRole('button', { name: 'Görevi kaydet' }))
    expect(mocks.create).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Sorumlu')).toBeInvalid()
  })
  it('requires an accountable assignee before creating the task', async () => {
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Göreve dönüştür' }))
    await user.type(screen.getByLabelText('Görev başlığı'), 'Talep araştırması')
    await user.type(screen.getByLabelText('Beklenen sonuç'), '10 müşteri görüşmesi')
    fireEvent.change(screen.getByLabelText('Takip tarihi'), { target: { value: '2026-10-10' } })
    await user.click(screen.getByRole('button', { name: 'Görevi kaydet' }))
    expect(mocks.create).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Sorumlu')).toBeInvalid()
  })
  it('saves outcomes without losing unrelated record metadata', async () => {
    const record = { id: 'record-1', title: 'Pilot', metadata: { decisionSessionId: session.id, keep: 'value', decisionFollowUp: { expectedOutcome: '10 görüşme' } } }
    mocks.list.mockResolvedValue({ records: [record] })
    mocks.get.mockResolvedValue(record)
    mocks.update.mockImplementation(async (w, id, data) => ({ ...record, ...data }))
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Sonucu değerlendir' }))
    await user.type(screen.getByLabelText('Gerçekleşen sonuç'), '8 görüşme yapıldı')
    await user.click(screen.getByRole('button', { name: 'Sonucu kaydet ve tamamla' }))
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('ws-1', 'record-1', expect.objectContaining({ status: 'completed', metadata: expect.objectContaining({ keep: 'value', decisionFollowUp: expect.objectContaining({ actualOutcome: '8 görüşme yapıldı', expectedOutcome: '10 görüşme' }) }) })))
  })
  it('keeps failed form entries and does not claim success', async () => {
    mocks.create.mockRejectedValue(new Error('offline'))
    show()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Göreve dönüştür' }))
    fireEvent.change(screen.getByLabelText('Görev başlığı'), { target: { value: 'Pilot' } })
    fireEvent.change(screen.getByLabelText('Beklenen sonuç'), { target: { value: 'Talep' } })
    fireEvent.change(screen.getByLabelText('Takip tarihi'), { target: { value: '2026-10-10' } })
    await user.selectOptions(screen.getByLabelText('Sorumlu'), '42')
    await user.click(screen.getByRole('button', { name: 'Görevi kaydet' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Girdileriniz korundu')
    expect(screen.getByLabelText('Görev başlığı')).toHaveValue('Pilot')
  })
  it('does not offer writes to viewers', async () => {
    show({ ...ws, activeWorkspace: { ...ws.activeWorkspace, myRole: 'viewer' } })
    expect(await screen.findByText(/değişiklik için yazma yetkisi/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Göreve dönüştür' })).not.toBeInTheDocument()
  })
  it('formats raw amounts without corrupting already formatted numbers', () => {
    expect(formatDecisionText('Rezervi 1268000 ₺ artırın.', 'tr-TR')).toContain('1.268.000')
    expect(formatDecisionText('1.268.000,50 ₺', 'tr-TR')).toBe('1.268.000,50 ₺')
  })
})
