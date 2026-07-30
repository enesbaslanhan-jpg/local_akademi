import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach } from 'vitest'
import CitationBadge from '@/components/mentor/CitationBadge'

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

afterEach(() => {
  cleanup()
})

describe('CitationBadge', () => {
  it('renders as a link to Knowledge Object detail when code is provided', () => {
    renderWithRouter(<CitationBadge id={1} title="Şirket Kurulumu" code="KO-SIRKET" sourceRefs={[]} />)

    const link = screen.getByRole('link', { name: /Şirket Kurulumu bilgi içeriğini aç/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/app/knowledge/KO-SIRKET')
  })

  it('renders as a static badge when code is missing', () => {
    renderWithRouter(<CitationBadge id={1} title="Bilinmeyen kaynak" sourceRefs={[]} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Bilinmeyen kaynak')).toBeInTheDocument()
  })

  it('renders as a static badge when code is empty string', () => {
    renderWithRouter(<CitationBadge id={1} title="Empty" code="" sourceRefs={[]} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders multiple badges with correct routes', () => {
    renderWithRouter(
      <>
        <CitationBadge id={1} title="A" code="KO-A" sourceRefs={[]} />
        <CitationBadge id={2} title="B" code="KO-B" sourceRefs={[]} />
      </>
    )

    expect(screen.getByRole('link', { name: /A bilgi içeriğini aç/ })).toHaveAttribute('href', '/app/knowledge/KO-A')
    expect(screen.getByRole('link', { name: /B bilgi içeriğini aç/ })).toHaveAttribute('href', '/app/knowledge/KO-B')
  })

  it('truncates long titles without breaking layout', () => {
    const longTitle = 'A'.repeat(300)
    renderWithRouter(<CitationBadge id={1} title={longTitle} code="KO-LONG" sourceRefs={[]} />)

    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link.querySelector('.truncate')).toBeInTheDocument()
  })

  it('is keyboard accessible as a link', () => {
    renderWithRouter(<CitationBadge id={1} title="Tıklanabilir" code="KO-1" sourceRefs={[]} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('aria-label', 'Tıklanabilir bilgi içeriğini aç')
    expect(link).toHaveClass('focus-visible:ring-2')
  })

  it('shows a source indicator when sourceRefs exist', () => {
    renderWithRouter(<CitationBadge id={1} title="Kaynaklı" code="KO-SRC" sourceRefs={[{ sourceId: 's1', title: 'Resmi kaynak' }]} />)

    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link.querySelector('span[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('does not show a source indicator when sourceRefs are empty', () => {
    renderWithRouter(<CitationBadge id={1} title="Kaynaksız" code="KO-NONE" sourceRefs={[]} />)

    const link = screen.getByRole('link')
    expect(link.querySelector('span[aria-hidden="true"]')).not.toBeInTheDocument()
  })
})
