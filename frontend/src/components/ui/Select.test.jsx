import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Select from './Select'

const OPTIONS = [
  { value: 'a', label: 'Seçenek A' },
  { value: 'b', label: 'Seçenek B' },
  { value: 'c', label: 'Seçenek C' },
]

const LONG_OPTIONS = Array.from({ length: 16 }, (_, i) => ({
  value: `v${i}`,
  label: `Uzun Seçenek ${i}`,
}))

beforeEach(() => {
  document.body.innerHTML = ''
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

describe('Select (ortak dropdown)', () => {
  it('kapalıyken yalnız tetikleyici çizer, listbox yoktur', () => {
    render(<Select aria-label="Test seçim" options={OPTIONS} />)
    const trigger = screen.getByRole('button', { name: 'Test seçim' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('tıklayınca açılır; aria-expanded ve listbox görünür', () => {
    render(<Select aria-label="Test seçim" options={OPTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Test seçim' }))
    const listbox = screen.getByRole('listbox')
    expect(listbox).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Test seçim' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('option').length).toBe(3)
  })

  it('seçenek tıklanınca onChange çağrılır ve menü kapanır', () => {
    const onChange = vi.fn()
    render(<Select aria-label="Test seçim" options={OPTIONS} value="a" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Test seçim' }))
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Seçenek B' }))
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('klavye: ArrowDown ile açılır, Enter ile seçim yapılır', () => {
    const onChange = vi.fn()
    const { container } = render(<Select aria-label="Test seçim" options={OPTIONS} onChange={onChange} />)
    const trigger = screen.getByRole('button', { name: 'Test seçim' })
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(container.querySelector('button')).toBe(document.activeElement)
  })

  it('Escape ile kapanır ve odak tetikleyiciye döner', () => {
    render(<Select aria-label="Test seçim" options={OPTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Test seçim' }))
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('dış tıklamayla kapanır', () => {
    render(<Select aria-label="Test seçim" options={OPTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: 'Test seçim' }))
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('uzun listede arama kutusu çıkar ve filtreler', () => {
    const onChange = vi.fn()
    render(<Select aria-label="Uzun seçim" options={LONG_OPTIONS} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Uzun seçim' }))
    const search = screen.getByLabelText('Seçenek ara')
    fireEvent.change(search, { target: { value: 'Seçenek 1' } })
    const options = screen.getAllByRole('option')
    expect(options.length).toBeLessThan(LONG_OPTIONS.length)
    expect(options.every(o => o.textContent.includes('Seçenek 1'))).toBe(true)
  })
})