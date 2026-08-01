import { useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal'; // Assuming there is a Modal base component or we build a standalone dialog
import styles from './MentorDeleteModal.module.css';

export default function MentorDeleteModal({ isOpen, onClose, onConfirm, isDeleting, error }) {
  const cancelRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen && cancelRef.current) {
      cancelRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
        e.preventDefault();
      }
      
      if (e.key === 'Tab' && isOpen && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDeleting]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(e) => {
      if (e.target === e.currentTarget && !isDeleting) onClose();
    }}>
      <div 
        ref={modalRef}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="delete-modal-title"
        className={styles.dialog}
      >
        <h2 id="delete-modal-title" className={styles.title}>Sohbet silinsin mi?</h2>
        <p className={styles.description}>
          Bu sohbet kalıcı olarak kaldırılacak. Bu işlem geri alınamaz.
        </p>
        
        {error && <div className={styles.error} role="alert">{error}</div>}

        <div className={styles.actions}>
          <Button 
            ref={cancelRef}
            variant="outline" 
            onClick={onClose} 
            disabled={isDeleting}
          >
            Vazgeç
          </Button>
          <Button 
            variant="danger" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Siliniyor...' : 'Sohbeti sil'}
          </Button>
        </div>
      </div>
    </div>
  );
}
