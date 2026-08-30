import { useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import styles from './ConfirmModal.module.css'
import { useTranslation } from 'react-i18next'

export default function ConfirmModal({
  open, onClose, onConfirm, title, description,
  confirmLabel, cancelLabel,
  variant = 'primary', loading, requireNote, noteLabel
}) {
  const { t } = useTranslation('common')
  const [note, setNote] = useState('')
  const [noteError, setNoteError] = useState('')

  function handleConfirm() {
    if (requireNote && !note.trim()) {
      setNoteError(t('ui.confirm.noteRequired'))
      return
    }
    onConfirm?.(note.trim())
  }

  function handleClose() {
    setNote('')
    setNoteError('')
    onClose?.()
  }

  const disabled = loading || (requireNote && !note.trim())

  return (
    <Modal open={open} onClose={handleClose} title={title} size="sm">
      {description && <p className={styles.desc}>{description}</p>}

      {requireNote && (
        <div className={styles.noteArea}>
          <label className={styles.noteLabel}>{noteLabel || t('ui.confirm.noteLabel')}</label>
          <textarea
            className={`${styles.noteInput} ${noteError ? styles.hasError : ''}`}
            value={note}
            onChange={e => { setNote(e.target.value); setNoteError('') }}
            placeholder={noteLabel || t('ui.confirm.noteLabel')}
            rows={3}
            autoFocus
          />
          {noteError && <span className={styles.error}>{noteError}</span>}
        </div>
      )}

      <div className={styles.actions}>
        <Button variant="ghost" onClick={handleClose} disabled={loading}>
          {cancelLabel || t('ui.confirm.cancel')}
        </Button>
        <Button variant={variant} onClick={handleConfirm} disabled={disabled} loading={loading}>
          {loading ? t('ui.confirm.processing') : confirmLabel || t('ui.confirm.confirm')}
        </Button>
      </div>
    </Modal>
  )
}
