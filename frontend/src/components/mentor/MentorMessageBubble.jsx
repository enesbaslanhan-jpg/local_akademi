import React, { useState } from 'react'
import CitationBadge from './CitationBadge'

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

function MessageActions({ msg, onCopy, onRegenerate, onStartEdit, isStreaming }) {
  return (
    <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {msg.content && (
        <button onClick={() => onCopy(msg.content)} className="text-[11px] px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-[var(--text-light)]" title="Kopyala">
          Kopyala
        </button>
      )}
      {msg.role === 'assistant' && !isStreaming && (
        <button onClick={() => onRegenerate(msg.id)} className="text-[11px] px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-[var(--text-light)]" title="Yeniden oluştur">
          Yeniden Oluştur
        </button>
      )}
      {msg.role === 'user' && !isStreaming && (
        <button onClick={() => onStartEdit(msg)} className="text-[11px] px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-[var(--text-light)]" title="Düzenle">
          Düzenle
        </button>
      )}
    </div>
  )
}

export default function MentorMessageBubble({
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
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 relative shadow-sm
        ${isUser ? 'bg-[var(--primary)] text-white rounded-tr-sm' : ''}
        ${!isUser && !isError && !isCancelled ? 'bg-white border border-[var(--border)] text-[var(--text)] rounded-tl-sm' : ''}
        ${isError ? 'bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)] rounded-tl-sm' : ''}
        ${isCancelled ? 'bg-orange-50 border border-orange-300 text-[var(--text)] rounded-tl-sm' : ''}
      `}>
        {isEditingThis ? (
          <div className="space-y-3">
            <textarea
              className="w-full text-sm bg-white border border-[var(--primary)] rounded-lg p-3 outline-none resize-none min-h-[80px] text-[var(--text)]"
              value={editMessageValue}
              onChange={e => setEditMessageValue(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={onSaveEdit} className="text-xs px-3 py-1.5 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-dark)]">
                Kaydet ve Üret
              </button>
              <button onClick={onCancelEdit} className="text-xs px-3 py-1.5 bg-gray-100 text-[var(--text)] rounded-md hover:bg-gray-200">
                İptal
              </button>
            </div>
          </div>
        ) : (
          <>
            {msg.content ? (
              <>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{mainContent}</p>
                
                {msg.knowledgeObjects && Array.isArray(msg.knowledgeObjects) && msg.knowledgeObjects.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)]">
                    <p className="text-[11px] text-[var(--text-light)] font-semibold mb-2 uppercase tracking-wider">Kaynaklar</p>
                    <div className="flex flex-col gap-1.5">
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
                  <div className="mt-3 p-2 bg-gray-50 border border-gray-100 rounded text-[11px] text-[var(--text-light)] flex gap-2 items-start">
                    <span className="shrink-0 mt-0.5" aria-hidden="true">⚠️</span>
                    <p className="leading-tight">{disclaimer}</p>
                  </div>
                )}
              </>
            ) : isError ? (
              <div>
                <p className="text-sm font-medium">AI yanıtı alınamadı</p>
                <p className="text-xs mt-1 opacity-80">{msg.error}</p>
              </div>
            ) : isCancelled ? (
              <div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                <p className="text-[11px] text-orange-500 mt-2 font-medium flex items-center gap-1">
                  <span aria-hidden="true">⏹️</span> Üretim durduruldu
                </p>
              </div>
            ) : null}
            
            <div className={`flex items-center justify-between text-[10px] mt-2 ${isUser ? 'text-white/80' : 'text-[var(--text-light)]'}`}>
              <div>
                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                {msg.tokenUsage && (
                  <span className="ml-2">
                    · {msg.tokenUsage.totalTokens || msg.tokenUsage.total_tokens || 0} token
                  </span>
                )}
              </div>
              <MessageActions
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
