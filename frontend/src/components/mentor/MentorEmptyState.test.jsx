import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MentorEmptyState, { getQuickStartsByRole } from './MentorEmptyState';

describe('MentorEmptyState Role Resolution', () => {
  it('returns merchant/esnaf quick starts', () => {
    const starts1 = getQuickStartsByRole('esnaf');
    const starts2 = getQuickStartsByRole('merchant');
    expect(starts1[0]).toContain('Ürünümün gerçek kârını');
    expect(starts2[0]).toContain('Ürünümün gerçek kârını');
  });

  it('returns entrepreneur/girisimci quick starts', () => {
    const starts1 = getQuickStartsByRole('girisimci');
    const starts2 = getQuickStartsByRole('entrepreneur');
    expect(starts1[0]).toContain('İş fikrimi nasıl doğrulayabilirim');
    expect(starts2[0]).toContain('İş fikrimi nasıl doğrulayabilirim');
  });

  it('returns investor/yatirimci quick starts', () => {
    const starts1 = getQuickStartsByRole('yatirimci');
    const starts2 = getQuickStartsByRole('investor');
    expect(starts1[0]).toContain('Bir işletmenin nakit akışını nasıl değerlendiririm');
    expect(starts2[0]).toContain('Bir işletmenin nakit akışını nasıl değerlendiririm');
  });

  it('returns default quick starts for unknown role', () => {
    const starts = getQuickStartsByRole('unknown_role');
    expect(starts[0]).toContain('Kâr marjımı nasıl hesaplarım');
  });

  it('returns default quick starts for null role', () => {
    const starts = getQuickStartsByRole(null);
    expect(starts[0]).toContain('Kâr marjımı nasıl hesaplarım');
  });
});

describe('MentorEmptyState Component', () => {
  it('renders default quick starts without auth/role', () => {
    render(<MentorEmptyState role={null} onQuickStart={() => {}} />);
    expect(screen.getByText('Kâr marjımı nasıl hesaplarım?')).toBeInTheDocument();
  });
  
  it('renders esnaf quick starts when role is esnaf', () => {
    render(<MentorEmptyState role="esnaf" onQuickStart={() => {}} />);
    expect(screen.getByText('Ürünümün gerçek kârını hesaplayalım.')).toBeInTheDocument();
  });
});
