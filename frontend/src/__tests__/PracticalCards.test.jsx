import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EmbeddedPracticeBlock } from '../components/practice/EmbeddedPracticeBlock'

const openMentorWithContext = vi.fn()

vi.mock('../context/MentorContext', () => ({
  useMentorContext: () => ({ openMentorWithContext })
}))

const baseBlock = {
  id: 'block-1',
  title: 'Test Block',
  shortDescription: 'A short description',
  source: { code: 'SRC-1', title: 'Source', route: '/knowledge/source' },
  relatedDecisionCheckCode: 'DC-TEST-001'
}

function renderWithRouter(children) {
  return render(<MemoryRouter>{children}</MemoryRouter>)
}

describe('EmbeddedPracticeBlock', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
  })

  it('renders nothing when no blocks are provided', () => {
    const { container } = renderWithRouter(<EmbeddedPracticeBlock blocks={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a formula block', () => {
    renderWithRouter(
      <EmbeddedPracticeBlock
        blocks={[{
          ...baseBlock,
          type: 'formula',
          content: { mainContent: 'Use this formula', formula: 'a + b = c', keyTakeaway: 'Takeaway' }
        }]}
        contextType="knowledge_object"
        contextCode="KO-TEST"
        contextTitle="Test KO"
      />
    )

    expect(screen.getByText('Test Block')).toBeInTheDocument()
    expect(screen.getByText('Formül Kutusu')).toBeInTheDocument()
    expect(screen.getByText('a + b = c')).toBeInTheDocument()
    expect(screen.getByText('Takeaway')).toBeInTheDocument()
  })

  it('renders a checklist block and toggles items', () => {
    renderWithRouter(
      <EmbeddedPracticeBlock
        blocks={[{
          ...baseBlock,
          type: 'checklist',
          content: {
            mainContent: 'Check these',
            checklistItems: ['Item one', 'Item two'],
            primaryAction: { label: 'Open tool', code: 'open_decision_check' }
          }
        }]}
      />
    )

    expect(screen.getByText('Kontrol Listesi')).toBeInTheDocument()
    const checkbox = screen.getByRole('checkbox', { name: 'Item one' })
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('renders a common mistake block with warning and correct approach', () => {
    renderWithRouter(
      <EmbeddedPracticeBlock
        blocks={[{
          ...baseBlock,
          type: 'common_mistake',
          content: {
            mainContent: 'Avoid this',
            mistake: 'Wrong way',
            correctApproach: 'Right way'
          }
        }]}
      />
    )

    expect(screen.getAllByText('Yaygın Hata').length).toBe(2)
    expect(screen.getByText('Wrong way')).toBeInTheDocument()
    expect(screen.getByText('Right way')).toBeInTheDocument()
  })

  it('renders a quick application block with steps', () => {
    renderWithRouter(
      <EmbeddedPracticeBlock
        blocks={[{
          ...baseBlock,
          type: 'quick_application',
          content: {
            mainContent: 'Apply quickly',
            quickSteps: ['Step A', 'Step B']
          }
        }]}
      />
    )

    expect(screen.getByText('Hızlı Uygulama')).toBeInTheDocument()
    expect(screen.getByText('Step A')).toBeInTheDocument()
    expect(screen.getByText('Step B')).toBeInTheDocument()
  })

  it('renders source link and decision check button', () => {
    renderWithRouter(
      <EmbeddedPracticeBlock
        blocks={[{
          ...baseBlock,
          type: 'quick_application',
          content: { mainContent: 'Apply', quickSteps: [] }
        }]}
      />
    )

    expect(screen.getByText(/Kaynak: Source/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /İlgili Karar Aracı/ })).toBeInTheDocument()
  })
})
