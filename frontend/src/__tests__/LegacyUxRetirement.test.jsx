import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LegacyFeatureUnavailable from '@/components/legacy/LegacyFeatureUnavailable'
import { readFeatureFlags } from '@/config/featureFlags'

describe('Phase 8.0F legacy learner transition', () => {
  it('keeps legacy flags off by default and supports explicit rollback', () => {
    expect(readFeatureFlags({}).legacyQuiz).toBe(false)
    expect(readFeatureFlags({}).legacyFlashcards).toBe(false)
    expect(readFeatureFlags({ VITE_FF_LEGACY_QUIZ: 'true', VITE_FF_LEGACY_FLASHCARDS: 'true' })).toMatchObject({
      legacyQuiz: true,
      legacyFlashcards: true,
    })
  })

  it('offers Decision Checks instead of a raw quiz 404', () => {
    render(<MemoryRouter><LegacyFeatureUnavailable feature="quiz" /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /Quiz deneyimi yenilendi/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Karar Kontrolleri/i })).toBeInTheDocument()
  })

  it('offers Practical Cards instead of a raw flashcard 404', () => {
    render(<MemoryRouter><LegacyFeatureUnavailable feature="flashcards" /></MemoryRouter>)
    expect(screen.getByRole('button', { name: /Pratik Kartlar/i })).toBeInTheDocument()
  })
})
