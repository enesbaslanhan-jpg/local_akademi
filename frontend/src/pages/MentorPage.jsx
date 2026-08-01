import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMentorChat } from '@/hooks/useMentorChat'
import { Loading } from '@/components/ui'
import MemoryPanel from '@/components/memory/MemoryPanel'
import MentorMessageBubble from '@/components/mentor/MentorMessageBubble'
import MentorComposer from '@/components/mentor/MentorComposer'
import MentorEmptyState from '@/components/mentor/MentorEmptyState'
import MentorErrorAlert from '@/components/mentor/MentorErrorAlert'

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
  return text.length > 80 ? text.slice(0, 80) + '...' : text
}

export default function MentorPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const contextCode = searchParams.get('code') || ''
  const contextTitle = searchParams.get('title') || ''
  const contextPrompt = searchParams.get('prompt') || ''

  const chatHook = useMentorChat(contextCode, contextTitle)
  const {
    conversations, selectedId, selectedConv, messages, loading, error, setError,
    showArchived, setShowArchived, isStreaming, streamingContent,
    loadConversations, loadMessages, handleSelect, handleNew, handleAbort,
    handleSend, handleRegenerate, handleEditAndRegenerate,
    handleArchive, handleUnarchive, handleDelete,
    editingId, setEditingId, editValue, setEditValue, handleFinishEditTitle
  } = chatHook

  const [inputValue, setInputValue] = useState('')
  const [editMessageId, setEditMessageId] = useState(null)
  const [editMessageValue, setEditMessageValue] = useState('')
  
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [memoryPanelVisible, setMemoryPanelVisible] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  // Initial prompt setup
  useEffect(() => {
    if (contextPrompt) {
      setInputValue(current => current || contextPrompt)
    }
  }, [contextPrompt])

  // Load conversations on mount
  useEffect(() => {
    loadConversations(showArchived)
  }, [showArchived, loadConversations])

  // Load messages on select
  useEffect(() => {
    if (selectedId) loadMessages(selectedId)
  }, [selectedId, loadMessages])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  useEffect(() => {
    if (!isStreaming) scrollToBottom()
  }, [messages, isStreaming, scrollToBottom])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150
      setShowScrollButton(!isNearBottom)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  async function handleSendClick() {
    const text = inputValue.trim()
    if (!text) return
    setInputValue('')
    
    await handleSend(text, scrollToBottom, () => {
      if (contextCode) {
        navigate('/app/mentor', { replace: true })
      }
    })
  }

  async function handleQuickStart(text) {
    setInputValue('')
    await handleSend(text, scrollToBottom, () => {
      if (contextCode) navigate('/app/mentor', { replace: true })
    })
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

  function handleEditKeyDown(e, id) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleFinishEditTitle(id, editValue)
      setEditingId(null)
    }
    if (e.key === 'Escape') setEditingId(null)
  }

  if (loading && conversations.length === 0) return <Loading text="Yükleniyor..." />

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - var(--header-height, 64px))' }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        w-72 bg-white border-r border-[var(--border)] flex flex-col flex-shrink-0
        md:relative md:translate-x-0
        fixed inset-y-0 left-0 z-20 transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `} style={{ top: 'var(--header-height, 64px)', height: 'calc(100vh - var(--header-height, 64px))' }}>
        <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">Sohbetler</h2>
          <div className="flex gap-2">
            <button onClick={() => setMemoryPanelVisible(true)} className="btn btn-sm btn-outline" title="Hafıza Yönetimi">
              Hafıza
            </button>
            <button onClick={() => { handleNew(); setSidebarOpen(false) }} className="btn btn-sm btn-primary">
              + Yeni
            </button>
          </div>
        </div>

        <div className="flex text-xs border-b border-[var(--border)] shrink-0">
          <button
            onClick={() => setShowArchived(false)}
            aria-label="Aktif sohbetler"
            className={`flex-1 py-2 font-medium ${!showArchived ? 'bg-[var(--primary-light)] text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-light)] hover:bg-gray-50'}`}
          >
            Aktif
          </button>
          <button
            onClick={() => setShowArchived(true)}
            aria-label="Arşivlenmiş sohbetler"
            className={`flex-1 py-2 font-medium ${showArchived ? 'bg-[var(--primary-light)] text-[var(--primary)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-light)] hover:bg-gray-50'}`}
          >
            Arşiv
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-[var(--text-light)]">
              Henüz sohbet yok
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {conversations.map(conv => (
                <li
                  key={conv.id}
                  className={`
                    group relative px-3 py-2.5 cursor-pointer transition-colors
                    ${selectedId === conv.id ? 'bg-[var(--primary-light)]' : 'hover:bg-gray-50'}
                  `}
                  onClick={() => { handleSelect(conv.id); setSidebarOpen(false) }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingId === conv.id ? (
                        <input
                          className="w-full text-sm font-medium bg-white border border-[var(--primary)] rounded px-1 py-0.5 outline-none"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => { handleFinishEditTitle(conv.id, editValue); setEditingId(null) }}
                          onKeyDown={e => handleEditKeyDown(e, conv.id)}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <div className="text-sm font-medium text-[var(--text)] truncate">
                          {conv.title || 'İsimsiz'}
                        </div>
                      )}
                      <div className="text-xs text-[var(--text-light)] mt-0.5 truncate">
                        {conv.lastMessage ? contentPreview(conv.lastMessage.content) : 'Henüz mesaj yok'}
                      </div>
                      <div className="text-[11px] text-[var(--text-light)] mt-0.5">
                        {formatTime(conv.lastMessageAt || conv.updatedAt)}
                        {conv.messageCount > 0 && ` · ${conv.messageCount} mesaj`}
                      </div>
                    </div>

                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {!showArchived && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditValue(conv.title || '') }}
                            className="p-1 rounded hover:bg-gray-200 text-xs text-[var(--text-light)]"
                            title="Düzenle"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleArchive(conv.id) }}
                            className="p-1 rounded hover:bg-gray-200 text-xs text-[var(--text-light)]"
                            title="Arşivle"
                          >
                            Arşiv
                          </button>
                        </>
                      )}
                      {showArchived && (
                        <button
                          onClick={e => { e.stopPropagation(); handleUnarchive(conv.id) }}
                          className="p-1 rounded hover:bg-gray-200 text-xs text-[var(--text-light)]"
                          title="Arşivden çıkar"
                        >
                          Geri Al
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(conv.id) }}
                        className="p-1 rounded hover:bg-gray-200 text-xs text-[var(--text-light)]"
                        title="Sil"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-white shrink-0">
          <button
            className="md:hidden p-1 rounded hover:bg-gray-100 text-[var(--text-light)]"
            onClick={() => setSidebarOpen(true)}
            title="Sohbet listesi"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-[var(--text)] truncate">
              {selectedConv ? selectedConv.title : 'AI Mentor'}
            </h2>
            {selectedConv?.provider && (
              <span className="text-[11px] text-[var(--text-light)]">
                {selectedConv.provider} · {selectedConv.model}
              </span>
            )}
          </div>
          {contextTitle && (
            <span className="badge bg-info text-xs flex-shrink-0">Bağlam: {contextTitle}</span>
          )}
        </div>

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 relative bg-gray-50/30">
          <MentorErrorAlert error={error} onDismiss={() => setError('')} />

          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="sticky top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 text-xs bg-white border border-[var(--border)] rounded-full shadow-md hover:shadow-lg transition-shadow text-[var(--text-light)]"
            >
              En yeni mesaja git ↓
            </button>
          )}

          {selectedId === null && messages.length === 0 ? (
            <MentorEmptyState onQuickStart={handleQuickStart} />
          ) : messages.length === 0 && !isStreaming ? (
            <MentorEmptyState onQuickStart={handleQuickStart} />
          ) : (
            <div className="mx-auto max-w-4xl space-y-4">
              {messages.map(msg => (
                <MentorMessageBubble
                  key={msg.id}
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

              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>

        {!showArchived ? (
          <div className="shrink-0 bg-white">
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
          <div className="px-4 py-3 border-t border-[var(--border)] bg-gray-50 text-center text-sm text-[var(--text-light)] shrink-0">
            Arşivlenmiş sohbetlere yeni mesaj gönderilemez.
          </div>
        )}
      </main>

      <MemoryPanel visible={memoryPanelVisible} onClose={() => setMemoryPanelVisible(false)} />
    </div>
  )
}
