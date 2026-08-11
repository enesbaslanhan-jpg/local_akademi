import React, { useRef, useEffect } from 'react'
import { Send, Square } from 'lucide-react'
import styles from './MentorComposer.module.css'

export default function MentorComposer({
  value,
  onChange,
  onSend,
  onAbort,
  isStreaming,
  disabled
}) {
  const textareaRef = useRef(null)
  const MAX_LENGTH = 2000 // typical backend limit

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [value])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && !isStreaming && value.trim()) {
        onSend()
      }
    }
  }

  const isOverLimit = value.length > MAX_LENGTH

  return (
    <div className={styles.wrap}>
      <div className={styles.inputRow}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Yanıt bekleniyor...' : 'Mesajınızı yazın...'}
          disabled={isStreaming || disabled}
          className={styles.textarea}
          rows={1}
        />

        <div className={styles.buttonCol}>
          {isStreaming ? (
            <button
              onClick={onAbort}
              className={styles.abortBtn}
              aria-label="Üretimi durdur"
              title="Durdur"
            >
              <Square size={20} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!value.trim() || isOverLimit || disabled}
              className={styles.sendBtn}
              aria-label="Gönder"
              title="Gönder"
            >
              <Send size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Length indicator if approaching limit */}
      {value.length > MAX_LENGTH * 0.8 && (
        <div className={`${styles.counter} ${isOverLimit ? styles.counterOver : ''}`}>
          {value.length} / {MAX_LENGTH}
        </div>
      )}
    </div>
  )
}
