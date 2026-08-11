import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import CoursePlayerPage from '@/pages/CoursePlayerPage'

vi.mock('@/services/api', () => ({
  api: {
    courses: {
      getById: vi.fn().mockResolvedValue({
        course: {
          id: 42,
          title: 'Test Kursu',
          level: 'beginner',
          lessonCount: 0,
          lessons: [],
        },
      }),
      getLesson: vi.fn(),
    },
    learning: { start: vi.fn(), readingComplete: vi.fn() },
  },
}))

describe('CoursePlayerPage', () => {
  it('JSX runtime hatası olmadan kurs oynatıcısını açar', async () => {
    render(
      <MemoryRouter initialEntries={['/app/courses/42/learn']}>
        <Routes>
          <Route path="/app/courses/:courseId/learn/:lessonId?" element={<CoursePlayerPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Kurs adı iki yerde geçer: sol sütun başlığı ve breadcrumb.
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Test Kursu' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Test Kursu' })).toBeInTheDocument()
    expect(screen.getByText('0 ders')).toBeInTheDocument()
  })
})
