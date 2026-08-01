import React, { useRef, useEffect } from 'react'
import { Send, Square } from 'lucide-react'

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
    <div className="bg-white border-t border-[var(--border)] p-3">
      <div className="max-w-3xl mx-auto flex gap-2 relative bg-gray-50 p-1.5 rounded-xl border border-[var(--border)] focus-within:border-[var(--primary)] focus-within:ring-1 focus-within:ring-[var(--primary)] transition-all">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? 'Yanıt bekleniyor...' : 'Mesajınızı yazın...'}
          disabled={isStreaming || disabled}
          className="flex-1 min-h-[44px] max-h-[120px] resize-none px-3 py-2.5 text-sm bg-transparent outline-none disabled:opacity-50"
          rows={1}
        />
        
        <div className="flex flex-col justify-end">
          {isStreaming ? (
            <button
              onClick={onAbort}
              className="p-2.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              aria-label="Üretimi durdur"
              title="Durdur"
            >
              <Square className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!value.trim() || isOverLimit || disabled}
              className="p-2.5 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
              aria-label="Gönder"
              title="Gönder"
            >
              <Send className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Length indicator if approaching limit */}
      {value.length > MAX_LENGTH * 0.8 && (
        <div className={`text-right text-[11px] mt-1 pr-2 ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
          {value.length} / {MAX_LENGTH}
        </div>
      )}
    </div>
  )
}
