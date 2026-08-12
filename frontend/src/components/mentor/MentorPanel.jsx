import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useMentorContext } from '@/context/MentorContext'
import { useMentorChat } from '@/hooks/useMentorChat'
import { X, ChevronLeft } from 'lucide-react'
import MentorMessageBubble from './MentorMessageBubble'
import MentorComposer from './MentorComposer'
import MentorEmptyState from './MentorEmptyState'
import MentorErrorAlert from './MentorErrorAlert'
import { useAuth } from '@/context/AuthContext'
import styles from './MentorPanel.module.css'

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
  const { isPanelOpen, closePanel, isFullPage, panelView, setPanelView, activeConversationId, setActiveConversationId, activeContext, clearMentorContext } = useMentorContext()

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
  const closeButtonRef = useRef(null)
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (!isPanelOpen || isFullPage) return undefined
    previousFocusRef.current = document.activeElement
    const onKeyDown = event => {
      if (event.key === 'Escape') closePanel()
    }
    document.addEventListener('keydown', onKeyDown)
    window.requestAnimationFrame(() => closeButtonRef.current?.focus())
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [closePanel, isFullPage, isPanelOpen])

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
    await handleSend(text, scrollToBottom, activeContext)
  }

  async function handleQuickStart(text) {
    setInputValue('')
    await handleSend(text, scrollToBottom, activeContext)
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
    const newId = await handleNew(activeContext)
    if (newId) {
      setPanelView('chat')
    }
  }

  return (
    <>
      {/* Mobile backdrop */}
      <div className={styles.backdrop} onClick={closePanel} aria-hidden="true" />

      {/* Drawer */}
      <div
        className={`${styles.drawer} ${styles.drawerGlass}`}
        aria-label="AI Mentor Paneli"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {panelView === 'chat' && (
              <button
                onClick={() => setPanelView('conversations')}
                className={styles.backBtn}
                title="Sohbetler"
                aria-label="Sohbetlere dön"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div className={styles.headerTitleWrap}>
              <h2 className={styles.headerTitle}>
                {panelView === 'chat' ? (selectedConv?.title || 'AI Mentor') : 'Sohbetler'}
              </h2>
            </div>
          </div>

          <div className={styles.headerActions}>
            {panelView === 'conversations' && (
              <button onClick={handleNewChat} className={styles.newChatBtn}>
                + Yeni
              </button>
            )}
            <button
              ref={closeButtonRef}
              onClick={closePanel}
              className={styles.closeBtn}
              aria-label="Kapat"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className={styles.content}>

          {panelView === 'conversations' && (
            <div className={styles.conversationsPane}>
              <div className={styles.tabs}>
                <button
                  onClick={() => setShowArchived(false)}
                  aria-label="Aktif sohbetler"
                  className={`${styles.tab} ${!showArchived ? styles.tabActive : ''}`}
                >
                  Aktif
                </button>
                <button
                  onClick={() => setShowArchived(true)}
                  aria-label="Arşivlenmiş sohbetler"
                  className={`${styles.tab} ${showArchived ? styles.tabActive : ''}`}
                >
                  Arşiv
                </button>
              </div>
              <div className={styles.convList}>
                {loading ? (
                  <div className={styles.convState}>Yükleniyor...</div>
                ) : conversations.length === 0 ? (
                  <div className={styles.convState}>
                    Henüz sohbet yok.
                  </div>
                ) : (
                  <ul className={styles.convItems}>
                    {conversations.map(conv => (
                      <li
                        key={conv.id}
                        className={`${styles.convItem} ${selectedId === conv.id ? styles.convItemActive : ''}`}
                        onClick={() => {
                          handleSelect(conv.id)
                          setPanelView('chat')
                        }}
                      >
                        <div className={styles.convTitle}>
                          {conv.title || 'İsimsiz'}
                        </div>
                        <div className={styles.convPreview}>
                          {conv.lastMessage ? contentPreview(conv.lastMessage.content) : 'Henüz mesaj yok'}
                        </div>
                        <div className={styles.convTime}>
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
              {activeContext && (
                <div className={`${styles.contextBarLayout} ${styles.contextBarGlass}`}>
                  <div className={styles.contextTextWrap}>
                    <span className={styles.contextLabel}>Bağlam</span>
                    <span className={styles.contextTitle}>{activeContext.title || 'İçerik'}</span>
                  </div>
                  <button onClick={clearMentorContext} className={styles.contextClearBtn} title="Bağlamı Temizle" aria-label="Bağlamı Temizle">
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className={styles.chatScroll}>
                <MentorErrorAlert error={error} onDismiss={() => setError('')} />

                {(!messages || messages.length === 0) && !isStreaming ? (
                  <MentorEmptyState role={user?.role} onQuickStart={handleQuickStart} />
                ) : (
                  <div className={styles.messagesInner}>
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
                      <div className={`${styles.streamingRow} ${styles.streamingBubble}`}>
                        <div className={styles.streamingBubbleSurface}>
                          {streamingContent ? (
                            <p className={styles.streamingText}>{streamingContent}</p>
                          ) : (
                            <p className={styles.streamingPlaceholder}>
                              <span className={styles.typingDot} /> AI düşünüyor...
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
                <div className={styles.composerWrap}>
                  {activeContext && (!messages || messages.length === 0) && !isStreaming && (
                    <div className={styles.quickPrompts}>
                      {['Bu konuyu işletmeme nasıl uygularım?', 'En önemli noktaları özetle.', 'Sonraki en güvenli adım nedir?'].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickStart(prompt)}
                          className={styles.quickPromptBtn}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
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
                <div className={styles.archivedNotice}>
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
