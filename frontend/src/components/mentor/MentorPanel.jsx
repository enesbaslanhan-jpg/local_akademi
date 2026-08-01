import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useMentorContext } from '@/context/MentorContext'
import { useMentorChat } from '@/hooks/useMentorChat'
import { X, ChevronLeft } from 'lucide-react'
import MentorMessageBubble from './MentorMessageBubble'
import MentorComposer from './MentorComposer'
import MentorEmptyState from './MentorEmptyState'
import MentorErrorAlert from './MentorErrorAlert'
import MentorBetaBadge from './MentorBetaBadge'
import { useAuth } from '@/context/AuthContext'

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Dün'
  if (diffDays < 7) return `${diffDays} gün önce`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

function contentPreview(text) {
  if (!text) return ''
  return text.length > 50 ? text.slice(0, 50) + '...' : text
}

export default function MentorPanel() {
  const { user } = useAuth()
  const { isPanelOpen, closePanel, isFullPage, panelView, setPanelView, activeConversationId, setActiveConversationId } = useMentorContext()

  const chatHook = useMentorChat()
  const {
    conversations, selectedId, selectedConv, messages, loading, error, setError,
    showArchived, setShowArchived, isStreaming, streamingContent,
    loadConversations, loadMessages, handleSelect, handleNew, handleAbort,
    handleSend, handleRegenerate, handleEditAndRegenerate
  } = chatHook

  const [inputValue, setInputValue] = useState('')
  const [editMessageId, setEditMessageId] = useState(null)
  const [editMessageValue, setEditMessageValue] = useState('')
  
  const messagesEndRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  // Sync selectedId with Context activeConversationId
  useEffect(() => {
    if (activeConversationId && activeConversationId !== selectedId) {
      handleSelect(activeConversationId)
    }
  }, [activeConversationId, selectedId, handleSelect])

  useEffect(() => {
    if (selectedId && selectedId !== activeConversationId) {
      setActiveConversationId(selectedId)
    }
  }, [selectedId, activeConversationId, setActiveConversationId])

  // Load conversations on mount or when opening panel
  useEffect(() => {
    if (isPanelOpen) {
      loadConversations(showArchived)
    }
  }, [isPanelOpen, showArchived, loadConversations])

  useEffect(() => {
    if (selectedId && isPanelOpen) {
      loadMessages(selectedId)
      scrollToBottom()
    }
  }, [selectedId, isPanelOpen, loadMessages, scrollToBottom])

  if (!isPanelOpen || isFullPage) return null

  async function handleSendClick() {
    const text = inputValue.trim()
    if (!text) return
    setInputValue('')
    await handleSend(text, scrollToBottom)
  }

  async function handleQuickStart(text) {
    setInputValue('')
    await handleSend(text, scrollToBottom)
  }

  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch { }
  }

  function handleStartEditMessage(msg) {
    if (isStreaming) return
    setEditMessageId(msg.id)
    setEditMessageValue(msg.content)
  }

  async function handleSaveEditMessage() {
    if (!editMessageValue.trim() || isStreaming) return
    await handleEditAndRegenerate(editMessageId, editMessageValue, scrollToBottom)
    setEditMessageId(null)
    setEditMessageValue('')
  }

  async function handleNewChat() {
    const newId = await handleNew()
    if (newId) {
      setPanelView('chat')
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={closePanel} aria-hidden="true" />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-white border-l border-[var(--border)] shadow-2xl flex flex-col transition-transform"
        aria-label="AI Mentor Paneli"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {panelView === 'chat' && (
              <button
                onClick={() => setPanelView('conversations')}
                className="p-1.5 -ml-1.5 rounded-md hover:bg-gray-100 text-[var(--text-light)] shrink-0"
                title="Sohbetler"
                aria-label="Sohbetlere dön"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2 truncate">
                {panelView === 'chat' ? (selectedConv?.title || 'AI Mentor') : 'Sohbetler'}
              </h2>
              {panelView === 'chat' && selectedConv?.provider && (
                <div className="text-[10px] text-[var(--text-light)] truncate">
                  {selectedConv.provider} · {selectedConv.model}
                </div>
              )}
            </div>
            {panelView === 'chat' && (
              <div className="hidden sm:block ml-2">
                <MentorBetaBadge />
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {panelView === 'conversations' && (
              <button onClick={handleNewChat} className="text-xs px-2 py-1.5 font-medium bg-[var(--primary)] text-white rounded-md">
                + Yeni
              </button>
            )}
            <button
              onClick={closePanel}
              className="p-1.5 rounded-md hover:bg-gray-100 text-[var(--text-light)]"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden relative flex flex-col bg-gray-50/50">
          
          {panelView === 'conversations' && (
            <div className="absolute inset-0 flex flex-col bg-white">
              <div className="flex text-xs border-b border-[var(--border)] shrink-0">
                <button
                  onClick={() => setShowArchived(false)}
                  aria-label="Aktif sohbetler"
                  className={`flex-1 py-3 font-medium ${!showArchived ? 'bg-[var(--primary-light)] text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-light)] hover:bg-gray-50'}`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => setShowArchived(true)}
                  aria-label="Arşivlenmiş sohbetler"
                  className={`flex-1 py-3 font-medium ${showArchived ? 'bg-[var(--primary-light)] text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-light)] hover:bg-gray-50'}`}
                >
                  Arşiv
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-8 text-center text-sm text-[var(--text-light)]">Yükleniyor...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[var(--text-light)]">
                    Henüz sohbet yok.
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--border)]">
                    {conversations.map(conv => (
                      <li
                        key={conv.id}
                        className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${selectedId === conv.id ? 'bg-[var(--primary-light)]' : ''}`}
                        onClick={() => {
                          handleSelect(conv.id)
                          setPanelView('chat')
                        }}
                      >
                        <div className="text-sm font-medium text-[var(--text)] truncate">
                          {conv.title || 'İsimsiz'}
                        </div>
                        <div className="text-xs text-[var(--text-light)] mt-1 truncate">
                          {conv.lastMessage ? contentPreview(conv.lastMessage.content) : 'Henüz mesaj yok'}
                        </div>
                        <div className="text-[10px] text-[var(--text-light)] mt-1.5 font-medium">
                          {formatTime(conv.lastMessageAt || conv.updatedAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {panelView === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto flex flex-col relative">
                <MentorErrorAlert error={error} onDismiss={() => setError('')} />

                {(!messages || messages.length === 0) && !isStreaming ? (
                  <MentorEmptyState role={user?.role} onQuickStart={handleQuickStart} />
                ) : (
                  <div className="flex-1 px-4 py-4 space-y-4">
                    {messages.map(msg => (
                      <MentorMessageBubble
                        key={msg.id}
                        user={user}
                        msg={msg}
                        isStreaming={isStreaming}
                        editMessageId={editMessageId}
                        editMessageValue={editMessageValue}
                        setEditMessageValue={setEditMessageValue}
                        onStartEdit={handleStartEditMessage}
                        onCancelEdit={() => setEditMessageId(null)}
                        onSaveEdit={handleSaveEditMessage}
                        onCopy={handleCopy}
                        onRegenerate={(id) => handleRegenerate(id, scrollToBottom)}
                      />
                    ))}

                    {(isStreaming || streamingContent) && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 bg-white border border-[var(--border)] text-[var(--text)] rounded-tl-sm shadow-sm">
                          {streamingContent ? (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{streamingContent}</p>
                          ) : (
                            <p className="text-sm text-[var(--text-light)] italic flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-ping" /> AI düşünüyor...
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {!showArchived ? (
                <div className="shrink-0 bg-white z-10 pb-safe">
                  <MentorComposer
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={handleSendClick}
                    onAbort={handleAbort}
                    isStreaming={isStreaming}
                    disabled={false}
                  />
                </div>
              ) : (
                <div className="px-4 py-3 border-t border-[var(--border)] bg-gray-100 text-center text-sm text-[var(--text-light)] shrink-0 pb-safe">
                  Arşivlenmiş sohbetlere yeni mesaj gönderilemez.
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </>
  )
}
