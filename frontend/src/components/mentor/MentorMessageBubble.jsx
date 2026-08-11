import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CitationBadge from './CitationBadge'
import { saveMentorFeedback, getMentorFeedback } from '@/utils/mentorFeedback'
import { generateSuggestedActions } from '@/utils/mentorSuggestedActions'
import styles from './MentorMessageBubble.module.css'

function splitDisclaimer(text) {
  if (!text) return { mainContent: '', disclaimer: null }
  const parts = text.split('\n\n---\n')
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1]
    const lowerLast = lastPart.toLowerCase()
    // Known disclaimer patterns
    if (
      lowerLast.includes('bu bilgi genel') ||
      lowerLast.includes('tavsiye') ||
      lowerLast.includes('danışmanlık') ||
      lowerLast.includes('niteliği taşımaz') ||
      lowerLast.includes('bilgi amaçlıdır')
    ) {
      return {
        mainContent: parts.slice(0, -1).join('\n\n---\n'),
        disclaimer: lastPart.trim()
      }
    }
  }
  return { mainContent: text, disclaimer: null }
}

function MentorFeedbackActions({ user, messageId, isStreaming }) {
  const [feedback, setFeedback] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!isStreaming) {
      setFeedback(getMentorFeedback(user, messageId))
    }
  }, [user, messageId, isStreaming])

  if (isStreaming) return null

  const handleFeedback = (value) => {
    const success = saveMentorFeedback(user, messageId, value)
    if (success) {
      setFeedback(value)
      setToast('Geri bildiriminiz alındı.')
      setTimeout(() => setToast(''), 3000)
    } else {
      setToast('Geri bildirim kaydedilemedi.')
      setTimeout(() => setToast(''), 3000)
    }
  }

  return (
    <div className={`flex items-center gap-1 ${styles.feedbackRow}`}>
      <button
        onClick={() => handleFeedback('helpful')}
        className={`${styles.feedbackBtn} ${feedback === 'helpful' ? styles.feedbackBtnHelpful : ''}`}
        aria-label="Faydalı"
        aria-pressed={feedback === 'helpful'}
        title="Faydalı"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
      </button>
      <button
        onClick={() => handleFeedback('not_helpful')}
        className={`${styles.feedbackBtn} ${feedback === 'not_helpful' ? styles.feedbackBtnNotHelpful : ''}`}
        aria-label="Faydalı değil"
        aria-pressed={feedback === 'not_helpful'}
        title="Faydalı değil"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2"></path></svg>
      </button>
      {toast && <span className={`text-[10px] text-[var(--text-light)] ml-1 animate-pulse ${styles.feedbackToast}`} aria-live="polite">{toast}</span>}
    </div>
  )
}

function MentorSuggestedActionsList({ msg, isStreaming }) {
  const navigate = useNavigate();
  if (isStreaming) return null;
  const actions = generateSuggestedActions(msg);
  if (!actions || actions.length === 0) return null;

  return (
    <div className={`mt-3 flex flex-wrap gap-2 ${styles.suggestedRow}`}>
      {actions.map(action => (
        <button
          key={action.id}
          className={`${styles.suggestedBtn} ${action.disabled ? styles.suggestedBtnDisabled : ''}`}
          disabled={action.disabled}
          onClick={() => {
            if (!action.disabled && action.route) {
              navigate(action.route);
            }
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}

function MessageActions({ user, msg, onCopy, onRegenerate, onStartEdit, isStreaming }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 mt-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity ${styles.actionsRow}`}>
      {msg.content && (
        <button onClick={() => onCopy(msg.content)} className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-[var(--text-light)] ${styles.actionBtn}`} title="Kopyala">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span className={`hidden sm:inline ${styles.actionBtnLabel}`}>Kopyala</span>
        </button>
      )}
      {msg.role === 'assistant' && !isStreaming && (
        <>
          <button onClick={() => onRegenerate(msg.id)} className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-[var(--text-light)] ${styles.actionBtn}`} title="Yeniden oluştur">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
            <span className={`hidden sm:inline ${styles.actionBtnLabel}`}>Yeniden Üret</span>
          </button>
          <MentorFeedbackActions user={user} messageId={msg.id} isStreaming={isStreaming} />
        </>
      )}
      {msg.role === 'user' && !isStreaming && (
        <button onClick={() => onStartEdit(msg)} className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-[var(--text-light)] ${styles.actionBtn}`} title="Düzenle">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
          <span className={`hidden sm:inline ${styles.actionBtnLabel}`}>Düzenle</span>
        </button>
      )}
    </div>
  )
}

export default function MentorMessageBubble({
  user,
  msg,
  isStreaming,
  editMessageId,
  editMessageValue,
  setEditMessageValue,
  onSaveEdit,
  onCancelEdit,
  onCopy,
  onRegenerate,
  onStartEdit
}) {
  const isUser = msg.role === 'user'
  const isError = msg.role === 'assistant' && msg.error && msg.generationStatus === 'failed'
  const isCancelled = msg.role === 'assistant' && msg.generationStatus === 'cancelled'
  const isEditingThis = editMessageId === msg.id

  const { mainContent, disclaimer } = splitDisclaimer(msg.content)

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'} ${styles.messageEnter} ${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}>
      <div className={`
        max-w-[90%] md:max-w-[75%] rounded-2xl px-4 py-3 relative shadow-sm
        ${isUser ? 'rounded-tr-sm' : ''}
        ${!isUser && !isError && !isCancelled ? 'rounded-tl-sm' : ''}
        ${isError || isCancelled ? 'rounded-tl-sm' : ''}
        ${styles.bubble}
        ${isUser ? styles.bubbleUser : ''}
        ${!isUser && !isError && !isCancelled ? styles.bubbleAssistant : ''}
        ${isError ? styles.bubbleError : ''}
        ${isCancelled ? styles.bubbleCancelled : ''}
      `}>
        {!isUser && !isError && !isCancelled && (
          <span className={styles.answerLabel}>Mentor Yanıtı</span>
        )}
        {isEditingThis ? (
          <div className={`space-y-3 ${styles.editWrap}`}>
            <textarea
              className={styles.editTextarea}
              value={editMessageValue}
              onChange={e => setEditMessageValue(e.target.value)}
              autoFocus
            />
            <div className={`flex gap-2 ${styles.editActions}`}>
              <button onClick={onSaveEdit} className={styles.editSave}>
                Kaydet ve Üret
              </button>
              <button onClick={onCancelEdit} className={styles.editCancel}>
                İptal
              </button>
            </div>
          </div>
        ) : (
          <>
            {msg.content ? (
              <>
                <div className={styles.markdownContent}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{mainContent}</ReactMarkdown>
                </div>

                {msg.knowledgeObjects && Array.isArray(msg.knowledgeObjects) && msg.knowledgeObjects.length > 0 && (
                  <div className={`mt-3 pt-3 border-t border-[var(--border)] ${styles.sources}`}>
                    <p className={`text-[11px] text-[var(--text-light)] font-semibold mb-2 uppercase tracking-wider ${styles.sourcesLabel}`}>Kaynaklar</p>
                    <div className={`flex flex-col gap-1.5 ${styles.sourcesList}`}>
                      {/* Deduplicate by ID and slice max 3 */}
                      {Array.from(new Map(msg.knowledgeObjects.map(ko => [ko.id, ko])).values()).slice(0, 3).map((ko, i) => (
                        <CitationBadge
                          key={ko.id || i}
                          id={ko.id}
                          title={ko.title}
                          code={ko.code}
                          sourceRefs={ko.sourceRefs}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {disclaimer && (
                  <div className={styles.disclaimer}>
                    <span className={`shrink-0 mt-0.5 ${styles.disclaimerIcon}`} aria-hidden="true">⚠️</span>
                    <p className={`leading-tight ${styles.disclaimerText}`}>{disclaimer}</p>
                  </div>
                )}
                
                <MentorSuggestedActionsList msg={msg} isStreaming={isStreaming} />
              </>
            ) : isError ? (
               <div>
                 <p className={`text-sm font-medium ${styles.errorTitle}`}>AI yanıtı alınamadı</p>
                 <p className={`text-xs mt-1 opacity-80 ${styles.errorDetail}`}>{msg.error}</p>
               </div>
            ) : isCancelled ? (
              <div>
                <p className={`text-sm whitespace-pre-wrap leading-relaxed ${styles.text}`}>{msg.content}</p>
                <p className={`text-[11px] text-orange-500 mt-2 font-medium flex items-center gap-1 ${styles.cancelledNote}`}>
                  <span aria-hidden="true">⏹️</span> Üretim durduruldu
                </p>
              </div>
            ) : null}
            
            <div className={`flex flex-col mt-2 pt-2 border-t ${isUser ? 'border-white/20' : 'border-[var(--border)]'} ${styles.footer} ${isUser ? styles.footerUser : ''}`}>
              <div className={`flex items-center justify-between text-[10px] ${isUser ? 'text-white/80' : 'text-[var(--text-light)]'} ${styles.meta} ${isUser ? styles.metaUser : ''}`}>
                <div>
                  {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  {msg.tokenUsage && (
                    <span className={`ml-2 ${styles.tokenInfo}`}>
                      · {msg.tokenUsage.totalTokens || msg.tokenUsage.total_tokens || 0} token
                    </span>
                  )}
                </div>
              </div>
              <MessageActions
                user={user}
                msg={msg}
                onCopy={onCopy}
                onRegenerate={onRegenerate}
                onStartEdit={onStartEdit}
                isStreaming={isStreaming}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
