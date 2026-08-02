import { createContext, useContext, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

const MentorContext = createContext(null)

export function MentorProvider({ children }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [panelView, setPanelView] = useState('chat') // 'chat' | 'conversations'
  const [activeContext, setActiveContext] = useState(null)
  const location = useLocation()

  const openPanel = useCallback(() => setIsPanelOpen(true), [])
  const closePanel = useCallback(() => setIsPanelOpen(false), [])
  const togglePanel = useCallback(() => setIsPanelOpen(prev => !prev), [])

  const openMentorWithContext = useCallback((contextData) => {
    setActiveContext(contextData)
    // If context is given, ensure we start a new conversation or context is ready for next message
    // If we are already in chat, activeConversationId might be set. Let's just open the panel.
    setIsPanelOpen(true)
    setPanelView('chat')
  }, [])

  const clearMentorContext = useCallback(() => {
    setActiveContext(null)
  }, [])

  // Do not render panel contents or launcher if on the full page route
  const isFullPage = location.pathname.startsWith('/app/mentor')

  const value = {
    isPanelOpen: isPanelOpen && !isFullPage,
    activeConversationId,
    panelView,
    activeContext,
    openPanel,
    closePanel,
    togglePanel,
    openMentorWithContext,
    clearMentorContext,
    setActiveContext,
    setActiveConversationId,
    setPanelView,
    isFullPage
  }

  return (
    <MentorContext.Provider value={value}>
      {children}
    </MentorContext.Provider>
  )
}

export function useMentorContext() {
  const context = useContext(MentorContext)
  if (!context) {
    throw new Error('useMentorContext must be used within a MentorProvider')
  }
  return context
}
