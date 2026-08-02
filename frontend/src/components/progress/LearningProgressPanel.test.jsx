import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LearningProgressPanel from './LearningProgressPanel';
import { api } from '../../services/api';

vi.mock('../../services/api', () => ({
  api: {
    learningProgress: {
      getContinue: vi.fn(),
      getRecent: vi.fn(),
      getCompleted: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock('../../context/MentorContext', () => ({
  useMentorContext: () => ({ openMentorWithContext: vi.fn() })
}));

describe('LearningProgressPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    api.learningProgress.getContinue.mockImplementation(() => new Promise(() => {})); // Never resolves
    api.learningProgress.getRecent.mockImplementation(() => new Promise(() => {}));
    api.learningProgress.getCompleted.mockImplementation(() => new Promise(() => {}));
    render(<LearningProgressPanel />);
    expect(screen.getByText(/İlerleme yükleniyor/i)).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    api.learningProgress.getContinue.mockRejectedValue(new Error('Network error'));
    api.learningProgress.getRecent.mockResolvedValue({ items: [] });
    api.learningProgress.getCompleted.mockResolvedValue({ items: [] });
    render(<LearningProgressPanel />);
    
    await waitFor(() => {
      expect(screen.getByText(/İlerleme verileri yüklenirken bir hata oluştu/i)).toBeInTheDocument();
    });
  });

  it('renders items correctly on success', async () => {
    const mockContinue = { items: [{ id: '1', contentType: 'course', contentId: '10', title: 'Devam Eden Kurs', status: 'in_progress', progressPercent: 50, continueLater: false }] };
    const mockRecent = { items: [{ id: '2', contentType: 'decision_check', contentId: 'dc-1', title: 'Son Karar', status: 'started' }] };
    const mockCompleted = { items: [{ id: '3', contentType: 'lesson', contentId: '30', title: 'Biten Ders', status: 'completed' }] };

    api.learningProgress.getContinue.mockResolvedValue(mockContinue);
    api.learningProgress.getRecent.mockResolvedValue(mockRecent);
    api.learningProgress.getCompleted.mockResolvedValue(mockCompleted);

    render(<LearningProgressPanel />);

    await waitFor(() => {
      expect(screen.queryByText(/İlerleme yükleniyor/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Devam Eden Kurs')).toBeInTheDocument();
    expect(screen.getByText('Son Karar')).toBeInTheDocument();
    expect(screen.getByText('Biten Ders')).toBeInTheDocument();
  });
});
