import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import QuizWidget from '@/components/ui/QuizWidget'
import TaskWorkspace from '@/components/ui/TaskWorkspace'
import { api } from '@/services/api'
import FlashcardSection from '@/components/ui/FlashcardSection'
import VideoPlayer from '@/components/ui/VideoPlayer'

vi.mock('@/services/api', () => ({
  api: {
    request: vi.fn(),
    flashcards: { getByKoId: vi.fn(), submitReview: vi.fn() },
    videos: { getByKoId: vi.fn(), updateProgress: vi.fn() },
  },
}))

describe('Eğitim etkileşimleri', () => {
  beforeEach(() => vi.clearAllMocks())

  it('mini quiz seçeneğini işaretler ve cevapları gönderir', async () => {
    api.request.mockResolvedValueOnce({
      score: 100,
      passed: true,
      correct: 1,
      total: 1,
      feedback: [],
    })
    const user = userEvent.setup()

    render(<QuizWidget koId={7} quizzes={[{
      id: 'quiz-1',
      questions: [{ id: 'q-1', questionText: 'Doğru seçenek hangisi?', options: ['A', 'B'] }],
    }]} />)

    await user.click(screen.getByLabelText('A'))
    await user.click(screen.getByRole('button', { name: /cevapları gönder/i }))

    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/quizzes/7/attempts', expect.objectContaining({
      method: 'POST',
    })))
    expect(await screen.findByText('100%')).toBeInTheDocument()
  })

  it('uygulama görevini başlatır ve çalışma alanını açar', async () => {
    api.request
      .mockResolvedValueOnce({ tasks: [] })
      .mockResolvedValueOnce({ id: 'assignment-1', taskTemplateId: 'task-1', status: 'assigned', answers: '{}' })
    const user = userEvent.setup()

    render(<TaskWorkspace koId={7} taskTemplates={[{
      id: 'task-1',
      title: 'İşletme planını hazırla',
      description: 'Kısa bir plan oluştur.',
      estimatedTime: 10,
    }]} />)

    await user.click(await screen.findByRole('button', { name: /görevi başlat/i }))

    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/tasks/task-1/assign', {
      method: 'POST',
      body: '{}',
    }))
    expect(await screen.findByRole('textbox')).toBeInTheDocument()
  })

  it('boş görev teslimini istemcide engeller', async () => {
    api.request.mockResolvedValueOnce({
      tasks: [{ id: 'assignment-1', taskTemplateId: 'task-1', status: 'assigned', answers: '{}' }],
    })
    const user = userEvent.setup()
    render(<TaskWorkspace koId={7} taskTemplates={[{
      id: 'task-1', title: 'Plan hazırla', description: 'Planı yaz.', estimatedTime: 10,
      exampleOutput: JSON.stringify({ minWords: 10 }),
    }]} />)

    await user.click(await screen.findByRole('button', { name: 'Tamamla' }))
    expect(await screen.findByText(/en az 10 kelime/i)).toBeInTheDocument()
    expect(api.request).toHaveBeenCalledTimes(1)
  })

  it('flashcard cevabını gösterir ve rating kaydeder', async () => {
    api.flashcards.getByKoId.mockResolvedValueOnce({
      totalCards: 1,
      progress: null,
      cards: [{ id: 'card-1', front: 'Nakit akışı nedir?', back: 'Nakit giriş ve çıkışlarının hareketidir.', order: 1 }],
    })
    api.flashcards.submitReview.mockResolvedValueOnce({ progress: { percent: 100 } })
    const user = userEvent.setup()
    render(<MemoryRouter><FlashcardSection koId={7} /></MemoryRouter>)

    await user.click(await screen.findByText('Nakit akışı nedir?'))
    await user.click(await screen.findByRole('button', { name: 'İyi' }))
    expect(api.flashcards.submitReview).toHaveBeenCalledWith('card-1', 'good')
    expect(await screen.findByText(/tüm kartları tamamladın/i)).toBeInTheDocument()
  })

  it('playback URL olmayan video için sahte oynatıcı göstermez', async () => {
    api.videos.getByKoId.mockResolvedValueOnce({ video: null, available: false })
    const { container } = render(<VideoPlayer koId={7} />)
    await waitFor(() => expect(api.videos.getByKoId).toHaveBeenCalledWith(7))
    expect(container.querySelector('video')).not.toBeInTheDocument()
  })

  it('video ilerlemesini izlenen saniye olarak gönderir', async () => {
    api.videos.getByKoId.mockResolvedValueOnce({
      available: true,
      video: { id: 'video-1', title: 'Nakit Akışı', playbackUrl: '/media/video.mp4', durationTarget: 300 },
      progress: null,
    })
    api.videos.updateProgress.mockResolvedValue({ progress: { progressPercent: 2, completed: false } })
    const { container } = render(<VideoPlayer koId={7} />)
    const element = await waitFor(() => {
      const video = container.querySelector('video')
      expect(video).toBeInTheDocument()
      return video
    })
    Object.defineProperty(element, 'duration', { configurable: true, value: 300 })
    Object.defineProperty(element, 'currentTime', { configurable: true, writable: true, value: 0 })
    fireEvent.loadedMetadata(element)
    fireEvent.play(element)
    for (let second = 1; second <= 6; second++) {
      element.currentTime = second
      fireEvent.timeUpdate(element)
    }
    await waitFor(() => expect(api.videos.updateProgress).toHaveBeenCalled())
    expect(api.videos.updateProgress.mock.calls[0][0]).toBe('video-1')
    expect(api.videos.updateProgress.mock.calls[0][1]).toBeGreaterThanOrEqual(5)
  })
})
