import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MentorDeleteModal from './MentorDeleteModal';

describe('MentorDeleteModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<MentorDeleteModal isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with focus on Cancel button', async () => {
    render(<MentorDeleteModal isOpen={true} onClose={() => {}} onConfirm={() => {}} />);
    const cancelBtn = screen.getByText('Vazgeç');
    await waitFor(() => {
      expect(document.activeElement).toBe(cancelBtn);
    });
  });

  it('traps focus inside the modal on Tab', async () => {
    render(<MentorDeleteModal isOpen={true} onClose={() => {}} onConfirm={() => {}} />);
    const cancelBtn = screen.getByText('Vazgeç');
    const deleteBtn = screen.getByText('Sohbeti sil');
    
    cancelBtn.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    // First element shift-tabbed should go to last element (delete)
    expect(document.activeElement).toBe(deleteBtn);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    // Last element tabbed should go to first element (cancel)
    expect(document.activeElement).toBe(cancelBtn);
  });

  it('calls onClose and prevents default when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<MentorDeleteModal isOpen={true} onClose={onClose} onConfirm={() => {}} />);
    
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
    document.dispatchEvent(event);
    
    expect(onClose).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not close on Escape if isDeleting is true', () => {
    const onClose = vi.fn();
    render(<MentorDeleteModal isOpen={true} isDeleting={true} onClose={onClose} onConfirm={() => {}} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('has correct ARIA attributes', () => {
    render(<MentorDeleteModal isOpen={true} onClose={() => {}} onConfirm={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'delete-modal-title');
  });
});
