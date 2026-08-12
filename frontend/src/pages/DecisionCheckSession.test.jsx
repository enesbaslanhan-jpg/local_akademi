import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '@/services/api'
import DecisionCheckSession from './DecisionCheckSession'

vi.mock('@/services/api', () => ({
  api: {
    decisionChecks: {
      start: vi.fn(),
      getSession: vi.fn(),
      getResult: vi.fn(),
      saveAnswer: vi.fn(),
      complete: vi.fn()
    }
  }
}))

vi.mock('@/context/MentorContext', () => ({
  useMentorContext: () => null
}))

vi.mock('@/components/decision-checks/ProfitabilityDecisionTool', () => ({
  default: ({ session }) => <div>Profitability tool: {session.id}</div>
}))

vi.mock('@/components/decision-checks/StructuredDecisionTool', () => ({
  default: ({ session }) => <div>Structured tool: {session.id}</div>
}))

const session = {
  id: 'session-1',
  status: 'in_progress',
  decisionCheckCode: 'DC-MARKETPLACE-004',
  definition: [],
  toolMeta: { intro: 'Marketplace tool' },
  answers: []
}

function renderSession(identifier) {
  return render(
    <MemoryRouter initialEntries={[`/app/decision-checks/${identifier}`]}>
      <Routes>
        <Route path="/app/decision-checks/:code" element={<DecisionCheckSession />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DecisionCheckSession', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    api.decisionChecks.getSession.mockResolvedValue(session)
  })

  it.each([
    'DC-MARKETPLACE-004',
    'DC-PROFIT-001',
    'DC-CASHFLOW-008'
  ])('starts %s by code before loading its session', async (code) => {
    api.decisionChecks.start.mockResolvedValue({ sessionId: 'session-1' })
    api.decisionChecks.getSession.mockResolvedValue({ ...session, decisionCheckCode: code })

    renderSession(code)

    await waitFor(() => expect(api.decisionChecks.start).toHaveBeenCalledWith(code))
    expect(api.decisionChecks.getSession).toHaveBeenCalledWith('session-1')
    expect(await screen.findByText(/tool: session-1/i)).toBeInTheDocument()
  })

  it('loads an existing session id without trying to start a new one', async () => {
    renderSession('session-1')

    expect(await screen.findByText('Structured tool: session-1')).toBeInTheDocument()
    expect(api.decisionChecks.start).not.toHaveBeenCalled()
    expect(api.decisionChecks.getSession).toHaveBeenCalledWith('session-1')
  })
})
