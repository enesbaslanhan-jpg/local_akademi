import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Loading, EmptyState } from '@/components/ui'
import MemoryPanel from '@/components/memory/MemoryPanel'
import CitationBadge from '@/components/mentor/CitationBadge'

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

function MessageActions({ msg, onCopy, onRegenerate, onStartEdit, isStreaming }) {
  return (
    <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {msg.content && (
        <button onClick={() => onCopy(msg.content)} className="text-[11px] px-1.5 py-0.5 rounded hover:bg-black/10 text-[var(--text-light)]" title="Kopyala">
          Kopyala
        </button>
      )}
      {msg.role === 'assistant' && !isStreaming && (
        <button onClick={() => onRegenerate(msg.id)} className="text-[11px] px-1.5 py-0.5 rounded hover:bg-black/10 text-[var(--text-light)]" title="Yeniden oluştur">
          Yeniden Oluştur
        </button>
      )}
      {msg.role === 'user' && !isStreaming && (
        <button onClick={() => onStartEdit(msg)} className="text-[11px] px-1.5 py-0.5 rounded hover:bg-black/10 text-[var(--text-light)]" title="Düzenle">
          Düzenle
        </button>
      )}
    </div>
  )
}

export default function MentorPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingMessageId, setStreamingMessageId] = useState(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [memoryPanelVisible, setMemoryPanelVisible] = useState(false)

  const messagesEndRef = useRef(null)
  const sendingLockRef = useRef(false)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const streamingBufferRef = useRef('')
  const rafScheduledRef = useRef(false)
  const streamRequestedRef = useRef(false)

  const contextCode = searchParams.get('code') || ''
  const contextTitle = searchParams.get('title') || ''
  const contextPrompt = searchParams.get('prompt') || ''

  useEffect(() => {
    if (contextPrompt) {
      setInputValue(current => current || contextPrompt)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [contextPrompt])

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

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (selectedId) loadMessages(selectedId)
  }, [selectedId])

  async function loadConversations() {
    try {
      setLoading(true)
      const data = await api.conversation.getList()
      const list = data.conversations || []
      setConversations(list)
      setError('')
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id)
      }
      if (list.length === 0) {
        setSelectedId(null)
        setMessages([])
      }
    } catch (err) {
      setError('Sohbetler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(conversationId) {
    try {
      const data = await api.conversation.getById(conversationId)
      setMessages(data.messages || [])
      setError('')
    } catch (err) {
      setError('Mesajlar yüklenemedi')
    }
  }

  function handleSelect(id) {
    if (isStreaming) handleAbort()
    setError('')
    setSelectedId(id)
    setSidebarOpen(false)
  }

  async function handleNew() {
    setError('')
    try {
      const data = await api.conversation.create('Yeni Sohbet')
      const newId = data.conversation.id
      setSelectedId(newId)
      setMessages([])
      setSidebarOpen(false)
      await loadConversations()
      if (contextCode || contextTitle || contextPrompt) {
        navigate('/app/mentor', { replace: true })
      }
      setTimeout(() => inputRef.current?.focus(), 200)
    } catch (err) {
      setError('Yeni sohbet oluşturulamadı')
    }
  }

  function handleStartEdit(conv, e) {
    e.stopPropagation()
    setEditingId(conv.id)
    setEditValue(conv.title || '')
  }

  async function handleFinishEdit(id) {
    if (!editValue.trim()) {
      setEditingId(null)
      return
    }
    try {
      await api.conversation.update(id, editValue.trim())
      setEditingId(null)
      await loadConversations()
    } catch (err) {
      setError('Başlık değiştirilemedi')
      setEditingId(null)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Bu sohbeti silmek istediğinize emin misiniz?')) return
    try {
      await api.conversation.remove(id)
      if (selectedId === id) {
        setSelectedId(null)
        setMessages([])
      }
      await loadConversations()
    } catch (err) {
      setError('Sohbet silinemedi')
    }
  }

  function handleAbort() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  function scheduleStreamingUpdate() {
    if (rafScheduledRef.current) return
    rafScheduledRef.current = true
    requestAnimationFrame(() => {
      rafScheduledRef.current = false
      setStreamingContent(streamingBufferRef.current)
      scrollToBottom()
    })
  }

  async function startStream(convId, streamFn, options = {}) {
    if (streamRequestedRef.current) return
    streamRequestedRef.current = true

    const { clearContextOnDone } = options

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    streamingBufferRef.current = ''
    setStreamingContent('')
    setIsStreaming(true)
    setStreamingMessageId(null)
    setError('')

    streamFn({
      conversationId: convId,
      signal: abortController.signal,
      onStart: (data) => {
        if (data.userMessageId) scrollToBottom()
      },
      onProvider: () => {},
      onDelta: (data) => {
        streamingBufferRef.current += data.delta
        scheduleStreamingUpdate()
      },
      onDone: (data) => {
        streamRequestedRef.current = false
        abortControllerRef.current = null
        setIsStreaming(false)
        setStreamingContent('')
        streamingBufferRef.current = ''
        loadMessages(convId)
        loadConversations()
        if (clearContextOnDone) {
          navigate('/app/mentor', { replace: true })
        }
      },
      onCancelled: (data) => {
        streamRequestedRef.current = false
        abortControllerRef.current = null
        setIsStreaming(false)
        setStreamingContent('')
        streamingBufferRef.current = ''
        loadMessages(convId)
      },
      onError: (data) => {
        streamRequestedRef.current = false
        abortControllerRef.current = null
        setIsStreaming(false)
        setStreamingContent('')
        streamingBufferRef.current = ''
        setError(data?.message || 'Bir hata oluştu')
        loadMessages(convId)
      }
    })
  }

  async function handleSend() {
    const text = inputValue.trim()
    if (!text || sendingLockRef.current || streamRequestedRef.current) return
    sendingLockRef.current = true
    setInputValue('')

    const optimisticMsg = { id: `pending-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() }
    setMessages(current => [...current, optimisticMsg])
    scrollToBottom()

    let convId = selectedId
    if (!convId) {
      try {
        const data = await api.conversation.create('Yeni Sohbet')
        convId = data.conversation.id
        setSelectedId(convId)
        setSidebarOpen(false)
        loadConversations()
      } catch (err) {
        setMessages(current => current.filter(m => m.id !== optimisticMsg.id))
        setInputValue(text)
        setError('Sohbet oluşturulamadı')
        sendingLockRef.current = false
        return
      }
    }

    sendingLockRef.current = false
    await startStream(
      convId,
      (opts) => api.conversation.streamMessage({
        conversationId: convId,
        content: text,
        knowledgeObjectCode: contextCode || undefined,
        ...opts
      }),
      { clearContextOnDone: !!contextCode }
    )
  }

  function handleRegenerate(messageId) {
    if (!selectedId || streamRequestedRef.current) return
    startStream(selectedId, (opts) => api.conversation.regenerate({ conversationId: selectedId, messageId, ...opts }))
  }

  const [editMessageId, setEditMessageId] = useState(null)
  const [editMessageValue, setEditMessageValue] = useState('')

  function handleStartEditMessage(msg) {
    if (streamRequestedRef.current) return
    setEditMessageId(msg.id)
    setEditMessageValue(msg.content)
  }

  function handleCancelEditMessage() {
    setEditMessageId(null)
    setEditMessageValue('')
  }

  async function handleSaveEditMessage() {
    if (!selectedId || !editMessageId || !editMessageValue.trim() || streamRequestedRef.current) return
    const content = editMessageValue.trim()
    setEditMessageId(null)
    setEditMessageValue('')

    await startStream(selectedId, (opts) =>
      api.conversation.editAndRegenerate({ conversationId: selectedId, messageId: editMessageId, content, ...opts })
    )
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleEditKeyDown(e, id) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleFinishEdit(id)
    }
    if (e.key === 'Escape') setEditingId(null)
  }

  async function handleCopy(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch { }
  }

  const selectedConv = conversations.find(c => c.id === selectedId)

  if (loading) return <Loading text="Yükleniyor..." />

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
            <button onClick={handleNew} className="btn btn-sm btn-primary">
              + Yeni
            </button>
          </div>
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
                  onClick={() => handleSelect(conv.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {editingId === conv.id ? (
                        <input
                          className="w-full text-sm font-medium bg-white border border-[var(--primary)] rounded px-1 py-0.5 outline-none"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={() => handleFinishEdit(conv.id)}
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
                      <button
                        onClick={e => handleStartEdit(conv, e)}
                        className="p-1 rounded hover:bg-gray-200 text-xs text-[var(--text-light)]"
                        title="Düzenle"
                      >
                        ✏️
                      </button>
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

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-white">
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

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 relative">
          {error && (
            <div className="mx-auto max-w-2xl mb-4 rounded-lg border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}

          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 text-xs bg-white border border-[var(--border)] rounded-full shadow-md hover:shadow-lg transition-shadow text-[var(--text-light)]"
            >
              En yeni mesaja git ↓
            </button>
          )}

          {selectedId === null && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">AI Mentor'a Hoş Geldiniz</h3>
                <p className="text-sm text-[var(--text-light)] mb-4">
                  İşletmenizle ilgili sorular sorun, öneriler alın. KOBİ, esnaf ve girişimciler için yapay zeka destekli iş mentoru.
                </p>
                <div className="flex flex-col gap-2">
                  <button onClick={handleNew} className="btn btn-primary">
                    Yeni Sohbet Başlat
                  </button>
                  {contextTitle && (
                    <p className="text-xs text-[var(--text-light)]">Bağlam: {contextTitle}</p>
                  )}
                </div>
              </div>
            </div>
          ) : messages.length === 0 && !isStreaming ? (
            <div className="flex items-center justify-center h-full">
              <EmptyState message="Henüz mesaj yok. Bir soru yazarak başlayın." />
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map(msg => {
                const isUser = msg.role === 'user'
                const isError = msg.role === 'assistant' && msg.error && msg.generationStatus === 'failed'
                const isCancelled = msg.role === 'assistant' && msg.generationStatus === 'cancelled'
                const isEditingThis = editMessageId === msg.id

                return (
                  <div key={msg.id} className={`group flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`
                      max-w-[80%] md:max-w-[65%] rounded-lg px-4 py-2.5 relative
                      ${isUser ? 'bg-[var(--primary)] text-white' : ''}
                      ${!isUser && !isError && !isCancelled ? 'bg-gray-100 text-[var(--text)]' : ''}
                      ${isError ? 'bg-[var(--danger-bg)] border border-[var(--danger)] text-[var(--danger)]' : ''}
                      ${isCancelled ? 'bg-orange-50 border border-orange-300 text-[var(--text)]' : ''}
                    `}>
                      {isEditingThis ? (
                        <div className="space-y-2">
                          <textarea
                            className="w-full text-sm bg-white border border-[var(--primary)] rounded p-2 outline-none resize-none min-h-[60px] text-[var(--text)]"
                            value={editMessageValue}
                            onChange={e => setEditMessageValue(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button onClick={handleSaveEditMessage} className="text-xs px-2 py-1 bg-[var(--primary)] text-white rounded hover:opacity-90">
                              Kaydet ve Üret
                            </button>
                            <button onClick={handleCancelEditMessage} className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300">
                              İptal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.content ? (
                            <>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              {msg.knowledgeObjects && Array.isArray(msg.knowledgeObjects) && msg.knowledgeObjects.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-[var(--border)]">
                                  <p className="text-[11px] text-[var(--text-light)] font-medium mb-1">Kaynaklar:</p>
                                  {msg.knowledgeObjects.map((ko, i) => (
                                    <CitationBadge
                                      key={ko.id || i}
                                      id={ko.id}
                                      title={ko.title}
                                      code={ko.code}
                                      sourceRefs={ko.sourceRefs}
                                    />
                                  ))}
                                </div>
                              )}
                            </>
                          ) : isError ? (
                            <div>
                              <p className="text-sm font-medium">AI yanıtı alınamadı</p>
                              <p className="text-xs mt-1 opacity-75">{msg.error}</p>
                            </div>
                          ) : isCancelled ? (
                            <div>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                              <p className="text-[11px] text-orange-500 mt-1">⏹️ Üretim durduruldu</p>
                            </div>
                          ) : null}
                          <div className={`text-[11px] mt-1 ${isUser ? 'text-white/70' : 'text-[var(--text-light)]'}`}>
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                            {msg.tokenUsage && (
                              <span className="ml-2">
                                · {msg.tokenUsage.totalTokens || msg.tokenUsage.total_tokens || 0} token
                              </span>
                            )}
                          </div>
                          <MessageActions
                            msg={msg}
                            onCopy={handleCopy}
                            onRegenerate={handleRegenerate}
                            onStartEdit={handleStartEditMessage}
                            isStreaming={isStreaming}
                          />
                        </>
                      )}
                    </div>
                  </div>
                )
              })}

              {(isStreaming || streamingContent) && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] md:max-w-[65%] rounded-lg px-4 py-2.5 bg-gray-100 text-[var(--text)]">
                    {streamingContent ? (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{streamingContent}</p>
                    ) : (
                      <p className="text-sm text-[var(--text-light)] italic">
                        AI düşünüyor<span className="animate-pulse">...</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-[var(--border)] bg-white">
          <div className="mx-auto max-w-3xl flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isStreaming ? 'Yanıt bekleniyor...' : 'Mesajınızı yazın...'}
              className="flex-1 min-h-[44px] max-h-[120px] resize-none px-3 py-2.5 text-sm border border-[var(--border)] rounded-lg outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
              disabled={isStreaming}
              rows={1}
            />
            {isStreaming ? (
              <button
                onClick={handleAbort}
                className="btn self-end px-4 py-2.5 bg-orange-500 text-white hover:bg-orange-600 rounded-lg transition-colors"
              >
                Durdur
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="btn btn-primary self-end px-4 py-2.5"
              >
                Gönder
              </button>
            )}
          </div>
        </div>
      </main>

      <MemoryPanel visible={memoryPanelVisible} onClose={() => setMemoryPanelVisible(false)} />
    </div>
  )
}
