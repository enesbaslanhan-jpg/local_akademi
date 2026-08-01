import React from 'react'
import { render, screen } from '@testing-library/react'
import MentorMessageBubble from './MentorMessageBubble'
import { BrowserRouter } from 'react-router-dom'

function renderBubble(msg) {
  return render(
    <BrowserRouter>
      <MentorMessageBubble
        msg={msg}
        isStreaming={false}
        editMessageId={null}
        editMessageValue=""
        setEditMessageValue={() => {}}
        onSaveEdit={() => {}}
        onCancelEdit={() => {}}
        onCopy={() => {}}
        onRegenerate={() => {}}
        onStartEdit={() => {}}
      />
    </BrowserRouter>
  )
}

describe('MentorMessageBubble Disclaimer Parser', () => {
  it('does not parse normal markdown horizontal rules as disclaimer', () => {
    const content = `İşte bazı bilgiler:\n\n---\n1. Madde\n2. Madde`
    const msg = { id: '1', role: 'assistant', content }
    
    renderBubble(msg)
    
    // Normal markdown should just be rendered in the main content area
    // It should NOT render the disclaimer ⚠️ icon or box
    expect(screen.queryByText('⚠️')).not.toBeInTheDocument()
    expect(screen.getByText(/1\. Madde/)).toBeInTheDocument()
  })

  it('parses known disclaimer format correctly', () => {
    const content = `Ana cevap burada.\n\n---\nBu bilgi genel bilgi amaçlıdır ve profesyonel tavsiye yerine geçmez.`
    const msg = { id: '2', role: 'assistant', content }
    
    renderBubble(msg)
    
    // Should show main content
    expect(screen.getByText('Ana cevap burada.')).toBeInTheDocument()
    // Should show disclaimer icon
    expect(screen.getByText('⚠️')).toBeInTheDocument()
    // Should show disclaimer text
    expect(screen.getByText(/Bu bilgi genel bilgi amaçlıdır/)).toBeInTheDocument()
    // Should NOT show the "---" separator text itself
    expect(screen.queryByText('---')).not.toBeInTheDocument()
  })

  it('handles empty content gracefully', () => {
    const msg = { id: '3', role: 'assistant', content: '' }
    const { container } = renderBubble(msg)
    expect(container.textContent).not.toMatch(/⚠️/)
  })

  it('renders citations up to a max of 3 and deduplicates them', () => {
    const msg = {
      id: '4',
      role: 'assistant',
      content: 'Cevap',
      knowledgeObjects: [
        { id: 'ko-1', code: 'CODE1', title: 'Doc 1' },
        { id: 'ko-1', code: 'CODE1', title: 'Doc 1' }, // duplicate
        { id: 'ko-2', code: 'CODE2', title: 'Doc 2' },
        { id: 'ko-3', code: 'CODE3', title: 'Doc 3' },
        { id: 'ko-4', code: 'CODE4', title: 'Doc 4' }, // 4th should be ignored
      ]
    }
    
    renderBubble(msg)
    
    expect(screen.getByText('Kaynaklar')).toBeInTheDocument()
    // Deduplication should leave ko-1, ko-2, ko-3, ko-4 (4 unique)
    // Slicing to 3 should leave ko-1, ko-2, ko-3
    expect(screen.getByText('Doc 1')).toBeInTheDocument()
    expect(screen.getByText('Doc 2')).toBeInTheDocument()
    expect(screen.getByText('Doc 3')).toBeInTheDocument()
    expect(screen.queryByText('Doc 4')).not.toBeInTheDocument()
    
    // Ensure duplicates are removed (only one Doc 1)
    const doc1Elements = screen.getAllByText('Doc 1')
    expect(doc1Elements).toHaveLength(1)
  })
})
