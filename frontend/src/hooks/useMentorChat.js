import { useState, useRef, useCallback } from 'react'
import { api } from '@/services/api'
import { getSafeErrorMessage } from '@/components/mentor/MentorErrorAlert'
import i18n from '@/i18n'

export function useMentorChat(contextCode = '', contextTitle = '') {
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')

  const abortControllerRef = useRef(null)
  const streamingBufferRef = useRef('')
  const rafScheduledRef = useRef(false)
  const streamRequestedRef = useRef(false)
  const sendingLockRef = useRef(false)

  const loadConversations = useCallback(async (archived = showArchived) => {
    try {
      setLoading(true)
      const data = await api.conversation.getList(archived)
      const list = data.conversations || []
      setConversations(list)
      setError('')
      if (!selectedId && list.length > 0 && !archived) {
        setSelectedId(list[0].id)
      }
      if (list.length === 0) {
        setSelectedId(null)
        setMessages([])
      }
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [showArchived, selectedId])

  const loadMessages = useCallback(async (conversationId) => {
    try {
      const data = await api.conversation.getById(conversationId)
      setMessages(data.messages || [])
      setError('')
    } catch (err) {
      setError(err)
    }
  }, [])

  const handleSelect = useCallback((id) => {
    if (isStreaming) handleAbort()
    setError('')
    setSelectedId(id)
  }, [isStreaming])

  const handleNew = useCallback(async (activeContext = null) => {
    setError('')
    if (showArchived) setShowArchived(false)
    try {
      const data = await api.conversation.create('Yeni Sohbet', activeContext)
      const newId = data.conversation.id
      setSelectedId(newId)
      setMessages([])
      await loadConversations(false)
      return newId
    } catch (err) {
      setError(err)
      return null
    }
  }, [showArchived, loadConversations])

  const handleAbort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  const scheduleStreamingUpdate = useCallback((onScroll) => {
    if (rafScheduledRef.current) return
    rafScheduledRef.current = true
    requestAnimationFrame(() => {
      rafScheduledRef.current = false
      setStreamingContent(streamingBufferRef.current)
      if (onScroll) onScroll()
    })
  }, [])

  const startStream = useCallback(async (convId, streamFn, onScroll, clearContextOnDone) => {
    if (streamRequestedRef.current) return
    streamRequestedRef.current = true

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    streamingBufferRef.current = ''
    setStreamingContent('')
    setIsStreaming(true)
    setError('')

    streamFn({
      conversationId: convId,
      signal: abortController.signal,
      onStart: (data) => {
        if (data.userMessageId && onScroll) onScroll()
      },
      onProvider: () => {},
      onDelta: (data) => {
        streamingBufferRef.current += data.delta
        scheduleStreamingUpdate(onScroll)
      },
      onDone: () => {
        streamRequestedRef.current = false
        abortControllerRef.current = null
        setIsStreaming(false)
        setStreamingContent('')
        streamingBufferRef.current = ''
        loadMessages(convId)
        loadConversations()
        if (clearContextOnDone) clearContextOnDone()
      },
      onCancelled: () => {
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
        setError(data?.message || i18n.t('common:states.error'))
        loadMessages(convId)
      }
    })
  }, [loadMessages, loadConversations, scheduleStreamingUpdate])

  const handleSend = useCallback(async (text, onScroll, activeContext = null) => {
    if (!text || sendingLockRef.current || streamRequestedRef.current) return
    sendingLockRef.current = true

    const optimisticMsg = { id: `pending-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() }
    setMessages(current => [...current, optimisticMsg])
    if (onScroll) onScroll()

    let convId = selectedId
    if (!convId) {
      try {
        const data = await api.conversation.create('Yeni Sohbet', activeContext)
        convId = data.conversation.id
        setSelectedId(convId)
        loadConversations()
      } catch (err) {
        setMessages(current => current.filter(m => m.id !== optimisticMsg.id))
        setError(err)
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
        contextOverride: activeContext,
        ...opts
      }),
      onScroll
    )
  }, [selectedId, contextCode, loadConversations, startStream])

  const handleRegenerate = useCallback((messageId, onScroll) => {
    if (!selectedId || streamRequestedRef.current) return
    startStream(selectedId, (opts) => api.conversation.regenerate({ conversationId: selectedId, messageId, ...opts }), onScroll)
  }, [selectedId, startStream])

  const handleEditAndRegenerate = useCallback(async (messageId, content, onScroll) => {
    if (!selectedId || !messageId || !content.trim() || streamRequestedRef.current) return
    await startStream(selectedId, (opts) =>
      api.conversation.editAndRegenerate({ conversationId: selectedId, messageId, content, ...opts }),
      onScroll
    )
  }, [selectedId, startStream])

  const handleArchive = useCallback(async (id) => {
    try {
      await api.conversation.archive(id)
      if (selectedId === id) {
        const remaining = conversations.filter(c => c.id !== id && !c.archivedAt)
        setSelectedId(remaining.length > 0 ? remaining[0].id : null)
        if (remaining.length <= 0) setMessages([])
        if (remaining.length === 0) setMessages([])
      }
      await loadConversations(false)
    } catch (err) {
      setError(err)
    }
  }, [conversations, selectedId, loadConversations])

  const handleUnarchive = useCallback(async (id) => {
    try {
      await api.conversation.unarchive(id)
      await loadConversations(true)
    } catch (err) {
      setError(err)
    }
  }, [loadConversations])

  const handleDelete = useCallback(async (id) => {
    try {
      await api.conversation.remove(id)
      if (selectedId === id) {
        const remaining = conversations.filter(c => c.id !== id && (showArchived ? !!c.archivedAt : !c.archivedAt))
        setSelectedId(remaining.length > 0 ? remaining[0].id : null)
        if (remaining.length === 0) setMessages([])
      }
      await loadConversations()
    } catch (err) {
      setError(err)
    }
  }, [selectedId, loadConversations])

  const handleFinishEditTitle = useCallback(async (id, value) => {
    if (!value.trim()) return
    try {
      await api.conversation.update(id, value.trim())
      await loadConversations()
    } catch (err) {
      setError(err)
    }
  }, [loadConversations])

  const selectedConv = conversations.find(c => c.id === selectedId)

  return {
    conversations,
    selectedId,
    selectedConv,
    messages,
    loading,
    error,
    setError,
    showArchived,
    setShowArchived,
    isStreaming,
    streamingContent,
    loadConversations,
    loadMessages,
    handleSelect,
    handleNew,
    handleAbort,
    handleSend,
    handleRegenerate,
    handleEditAndRegenerate,
    handleArchive,
    handleUnarchive,
    handleDelete,
    handleFinishEditTitle,
    editingId,
    setEditingId,
    editValue,
    setEditValue
  }
}
