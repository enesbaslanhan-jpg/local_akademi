import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useMentorChat } from '@/hooks/useMentorChat'
import { Loading } from '@/components/ui'
import MemoryPanel from '@/components/memory/MemoryPanel'
import MentorMessageBubble from '@/components/mentor/MentorMessageBubble'
import MentorComposer from '@/components/mentor/MentorComposer'
import MentorEmptyState from '@/components/mentor/MentorEmptyState'
import MentorErrorAlert from '@/components/mentor/MentorErrorAlert'
import MentorDeleteModal from '@/components/mentor/MentorDeleteModal'
import { useAuth } from '@/context/AuthContext'
import { ContextPanelSlot } from '@/components/layout/ContextPanel'
import { generateSuggestedActions } from '@/utils/mentorSuggestedActions'
import { api } from '@/services/api'
import {
  Menu, Pencil, Archive, RotateCcw, Trash2,
  BookOpen, FlaskConical, Settings, Sparkles, ArrowRight, CirclePlus, History, Zap, Brain
} from 'lucide-react'
import styles from './MentorPage.module.css'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency, getFormatLocale } from '@/utils/formatters'

/* İşlem önerisi tipine göre ikon. Tip tanınmazsa nötr kıvılcım kullanılır —
   uydurma bir etiket veya ikon üretilmez. */
const ACTION_ICONS = {
  open_knowledge: BookOpen,
  open_financial_models: FlaskConical,
  open_business_profile: Settings
}

const ACTION_DESCRIPTIONS = {
  open_knowledge: 'actions.descriptionOpenKnowledge',
  open_financial_models: 'actions.descriptionOpenFinancialModels',
  open_business_profile: 'actions.descriptionOpenBusinessProfile'
}

function formatTime(dateStr, locale = getFormatLocale(), t) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return t('time.yesterday')
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays })
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

function contentPreview(text) {
  if (!text) return ''
  return text.length > 80 ? text.slice(0, 80) + '...' : text
}

function formatMoney(value, currency, locale = getFormatLocale()) {
  return formatCurrency(value, { locale, currency: currency || 'TRY', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function MentorPage() {
  const { t } = useTranslation('mentor')
  const { formatLocale, uiLanguage } = useLocalization()
  const { user } = useAuth()
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

  const [businessProfile, setBusinessProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [lastDecision, setLastDecision] = useState(null)
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [conversationToDelete, setConversationToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
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

  // HAFIZA: gerçek işletme profili ve en güncel karar kaydı. Uç nokta
  // yapılandırılmadığında (ör. eski test mock'ları) sessizce boş kalır.
  useEffect(() => {
    let cancelled = false
    const profilePromise = api.business?.getProfile
      ? api.business.getProfile().catch(() => null)
      : Promise.resolve(null)
    const decisionsPromise = api.memory?.list
      ? api.memory.list({ type: 'decision' }).catch(() => null)
      : Promise.resolve(null)

    Promise.all([profilePromise, decisionsPromise]).then(([profile, memoryData]) => {
      if (cancelled) return
      const decisions = (memoryData?.memories || [])
        .filter(m => m.status === 'active' && m.value)
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      setBusinessProfile(profile)
      setLastDecision(decisions[0] || null)
      setProfileLoading(false)
    })
    return () => { cancelled = true }
  }, [])

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

  /*
   * İşlem önerileri: mockup'taki tekrarlayan sahte satırlar DEĞİL — gerçek
   * generateSuggestedActions çıktısının sohbet genelinde tekilleştirilmiş
   * hâli. Öneri yoksa sütun hiç render edilmez.
   */
  const suggestedActions = useMemo(() => {
    const seen = new Set()
    const collected = []
    messages.forEach(msg => {
      generateSuggestedActions(msg).forEach(action => {
        if (!action.route || seen.has(action.id)) return
        seen.add(action.id)
        collected.push(action)
      })
    })
    /* En yeni mesajın önerileri üstte kalsın. */
    return collected.reverse().slice(0, 6)
  }, [messages])

const sessionLabel = useMemo(() => {
    const firstDate = messages.find(message => message.createdAt)?.createdAt
    if (!firstDate) return ''
    const date = new Date(firstDate)
    if (Number.isNaN(date.getTime())) return ''
    const isToday = date.toDateString() === new Date().toDateString()
    return isToday
      ? t('session.todayWithTime', { time: date.toLocaleTimeString(formatLocale, { hour: '2-digit', minute: '2-digit' }) })
      : date.toLocaleDateString(formatLocale, { day: 'numeric', month: 'long', year: 'numeric' })
  }, [formatLocale, messages, t])

  /* HAFIZA: yalnız BusinessProfile'da gerçekten kayıtlı alanlar gösterilir.
     Alan yoksa sıra çizilmez; hiç veri yoksa boş durum mesajı çıkar. */
  const profileRows = useMemo(() => {
    if (!businessProfile) return []
    const p = businessProfile
    const rows = []
    if (p.sector) rows.push({ label: t('memory.sector'), value: p.sector })
    if (p.city) rows.push({ label: t('memory.city'), value: p.city })
    if (p.businessStage) rows.push({ label: t('memory.stage'), value: p.businessStage })
    if (p.monthly_sales > 0) rows.push({ label: t('memory.monthlySales'), value: formatMoney(p.monthly_sales, p.currency, formatLocale) })
    if (p.monthly_expenses > 0) rows.push({ label: t('memory.monthlyExpenses'), value: formatMoney(p.monthly_expenses, p.currency, formatLocale) })
    if (p.primaryGoal) rows.push({ label: t('memory.goal'), value: p.primaryGoal })
    if (Array.isArray(p.challenges) && p.challenges.length > 0) {
      rows.push({ label: t('memory.challenges'), value: p.challenges.join(', ') })
    }
    return rows
  }, [businessProfile, t])

  if (loading && conversations.length === 0) return <Loading text={t('states.loading')} />

  /* Aynı liste iki yere basılır: masaüstünde kabuğun bağlam paneline (portal),
     mobilde hamburgerden açılan drawer'a. Her breakpoint'te yalnızca biri
     görünür; ikisi de aynı JSX'ten üretildiği için ayrışamazlar. */
  const conversationList = (
    <div className={styles.convPanel}>
        <div className={styles.sidebarHeader}>
          <div>
            <h2 className={styles.sidebarHeaderTitle}>{t('sidebar.history')}</h2>
            <p className={styles.sidebarHeaderEyebrow}>{t('activeConversations')}</p>
          </div>
          <button className={styles.memoryBtn} onClick={() => setMemoryPanelVisible(true)}>{t('memory.title')}</button>
        </div>

        <button className={styles.newChatBtn} onClick={() => { handleNew(); setSidebarOpen(false) }}>
          <CirclePlus size={19} aria-hidden="true" />
          {t('sidebar.newChat')}
        </button>

        <div className={styles.tabs}>
          <button
            onClick={() => setShowArchived(false)}
            aria-label={t('activeConversations')}
            className={`${styles.tab} ${!showArchived ? styles.tabActive : ''}`}
          >
            {t('active')}
          </button>
          <button
            onClick={() => setShowArchived(true)}
            aria-label={t('archivedConversations')}
            className={`${styles.tab} ${showArchived ? styles.tabActive : ''}`}
          >
            {t('archive')}
          </button>
        </div>

        <div className={styles.convList}>
          {conversations.length === 0 ? (
            <div className={styles.convListEmpty}>
              {t('empty')}
            </div>
          ) : (
            <ul>
              {conversations.map(conv => (
                <li
                  key={conv.id}
                  className={`${styles.convItem} ${selectedId === conv.id ? styles.convItemActive : ''}`}
                  onClick={() => { handleSelect(conv.id); setSidebarOpen(false) }}
                >
                  <div className={styles.convItemMain}>
                    {editingId === conv.id ? (
                      <input
                        className={styles.convTitleInput}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => { handleFinishEditTitle(conv.id, editValue); setEditingId(null) }}
                        onKeyDown={e => handleEditKeyDown(e, conv.id)}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div className={styles.convTitle}>
                        <History size={13} aria-hidden="true" />
                        {conv.title || t('untitled')}
                      </div>
                    )}
                    <div className={styles.convPreview}>
                      {conv.lastMessage ? contentPreview(conv.lastMessage.content) : t('sidebar.noMessages')}
                    </div>
                    <div className={styles.convMeta}>
                      {formatTime(conv.lastMessageAt || conv.updatedAt, formatLocale, t)}
                      {conv.messageCount > 0 && t('sidebar.messageCount', { count: conv.messageCount })}
                    </div>
                  </div>

                  <div className={styles.convActions}>
                    {!showArchived && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditValue(conv.title || '') }}
                          className={styles.convActionBtn}
                          title={t('sidebar.edit')}
                          aria-label={t('sidebar.edit')}
                        >
                          <Pencil size={13} aria-hidden="true" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleArchive(conv.id) }}
                          className={styles.convActionBtn}
                          title={t('sidebar.archiveAction')}
                          aria-label={t('sidebar.archiveAction')}
                        >
                          <Archive size={13} aria-hidden="true" />
                        </button>
                      </>
                    )}
                    {showArchived && (
                      <button
                        onClick={e => { e.stopPropagation(); handleUnarchive(conv.id) }}
                        className={styles.convActionBtn}
                        title={t('sidebar.unarchive')}
                        aria-label={t('sidebar.unarchive')}
                      >
                        <RotateCcw size={13} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setConversationToDelete(conv.id); setDeleteModalOpen(true) }}
                      className={styles.convActionBtn}
                      title={t('sidebar.delete')}
                      aria-label={t('sidebar.delete')}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
    </div>
  )

  /* Aynı öneri bloğu iki yere basılır: masaüstünde sağ sütun, mobilde
     mesajların altı. Görünürlüğü CSS breakpoint'i belirler. */
  const actionsBlock = (
    <>
      <div className={styles.actionsTitle}><Zap size={14} aria-hidden="true" /> {t('actions.title')}</div>
      {suggestedActions.length > 0 ? (
        <div className={styles.actionsList}>
          {suggestedActions.map(action => {
            const ActionIcon = ACTION_ICONS[action.type] || Sparkles
            return (
              <button
                key={action.id}
                type="button"
                className={styles.actionCard}
                onClick={() => navigate(action.route)}
                disabled={action.disabled}
              >
                <span className={styles.actionIcon}><ActionIcon size={19} aria-hidden="true" /></span>
                <span className={styles.actionCopy}>
                  <span className={styles.actionLabel}>{t(action.labelKey)}</span>
                  <small>{t(ACTION_DESCRIPTIONS[action.type] || 'actions.descriptionFallback')}</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )
          })}
        </div>
) : (
        <div className={styles.actionsEmpty}>{t('actions.emptyHint')}</div>
      )}
    </>
  )

  /* HAFIZA kartı: veriler yukarıda (erken dönüşten önce) hesaplanır;
     burada yalnızca render edilir. */
  const memoryBlock = (
    <section className={styles.memorySection} aria-label={t('memory.title')}>
      <div className={styles.actionsTitle}><Brain size={14} aria-hidden="true" /> {t('memory.title')}</div>
      {profileLoading ? (
        <div className={styles.actionsEmpty}>{t('states.loading')}</div>
      ) : profileRows.length === 0 && !lastDecision ? (
        <div className={styles.actionsEmpty}>{t('memory.emptyProfile')}</div>
      ) : (
        <div className={styles.memoryCard}>
          {profileRows.map(row => (
            <div key={row.label} className={styles.memoryRow}>
              <span className={styles.memoryLabel}>{row.label}</span>
              <span className={styles.memoryValue}>{row.value}</span>
            </div>
          ))}
          {lastDecision && (
            <div className={styles.memoryRow}>
              <span className={styles.memoryLabel}>{t('memory.lastDecision')}</span>
              <span className={styles.memoryValue}>{lastDecision.summary || lastDecision.value}</span>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        className={styles.memoryManageBtn}
        onClick={() => setMemoryPanelVisible(true)}
      >
        {t('memory.manageButton')}
      </button>
    </section>
  )

  /* Sağ panel: üstte HAFIZA, altta İŞLEM ÖNERİLERİ. Aynı blok masaüstünde
     sağ sütuna, mobilde mesajların altına basılır. */
  const rightPanel = (
    <>
      {memoryBlock}
      {actionsBlock}
    </>
  )

  return (
    <div className={styles.page}>
      {/* Sayfa adı üst barda yazıyor; görünür h1 yerine sr-only başlık. */}
      <h1 className="sr-only">{t('title')}</h1>

      {/* Masaüstü: sohbet listesi kabuğun bağlam panelinde. Panel rayfaki
          düğmeyle kapatılınca sohbet alanı kendiliğinden genişler. */}
      <ContextPanelSlot>{conversationList}</ContextPanelSlot>

      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobil: aynı liste drawer olarak. */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {conversationList}
      </aside>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <button
            className={styles.menuBtn}
            onClick={() => setSidebarOpen(true)}
            title={t('sidebar.listButtonLabel')}
            aria-label={t('sidebar.listButtonLabel')}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className={styles.topBarTitleWrap}>
            <h2 className={styles.topBarTitle}>
              {t('title')}
            </h2>
            <span className={styles.topBarProvider}>{selectedConv?.title ? t('topbar.providerWithTitle', { title: selectedConv.title }) : t('topbar.provider')}</span>
          </div>
          {contextTitle && (
            <span className={styles.contextBadge}>{t('topbar.contextBadge', { title: contextTitle })}</span>
          )}
        </div>

        <div ref={messagesContainerRef} className={styles.messagesArea}>
          <MentorErrorAlert error={error} onDismiss={() => setError('')} />

          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className={styles.scrollToBottomBtn}
            >
              {t('chat.scrollToBottom')}
            </button>
          )}

          {selectedId === null && messages.length === 0 ? (
            <MentorEmptyState role={user?.role} onQuickStart={handleQuickStart} />
          ) : messages.length === 0 && !isStreaming ? (
            <MentorEmptyState role={user?.role} onQuickStart={handleQuickStart} />
          ) : (
            <div className={styles.messagesInner}>
              {sessionLabel && <div className={styles.sessionDate}>{sessionLabel}</div>}
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
                <div className={styles.streamingBubbleWrap}>
                  <div className={styles.streamingBubble}>
                    {streamingContent ? (
                      <p className={styles.streamingText}>{streamingContent}</p>
                    ) : (
                      <p className={styles.streamingPlaceholder}>
                        <span className={styles.typingDot} /> {t('chat.aiThinking')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/*
                ÇIPA ÖNCE GELİR — sıra önemli.
                `scrollToBottom` bu çıpaya kaydırıyor. Çıpa aşağıdaki panelin
                ALTINDAYKEN "en alta git" komutu paneli de geçiyor ve
                kullanıcının az önce yazdığı mesaj ekranın yukarısında
                kalıyordu. Sohbette "en alt" demek son mesaj demektir.
              */}
              <div ref={messagesEndRef} className={styles.messagesEndAnchor} />

              {/*
                Mobilde YALNIZ işlem önerileri akışa iner — bunlar son yanıta
                ait, yerleri orası. HAFIZA kartı inmez: sohbetin altına
                yığılmış duruyordu ve her mesajdan sonra araya giriyordu.
                Mobilde hafızaya üst çubuktaki menü → "Hafıza" ile
                ulaşılıyor, işlev kaybı yok.
              */}
              <section className={styles.actionsInline} aria-label={t('actions.inlineAriaLabel')}>
                {actionsBlock}
              </section>
            </div>
          )}
        </div>

        {!showArchived ? (
          <div className={styles.composerWrap} data-tour="mentor-girdi">
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
            {t('chat.archivedNotice')}
          </div>
        )}
      </main>

      {/* Masaüstü üçüncü bölge: üstte HAFIZA, altta işlem önerileri. */}
      <aside className={styles.actionsCol} aria-label={t('panel.rightAsideAriaLabel')}>
        {rightPanel}
      </aside>

      <MemoryPanel visible={memoryPanelVisible} onClose={() => setMemoryPanelVisible(false)} />
      
      <MentorDeleteModal 
        isOpen={deleteModalOpen}
        onClose={() => { if(!isDeleting) { setDeleteModalOpen(false); setConversationToDelete(null); } }}
        onConfirm={async () => {
          setIsDeleting(true);
          await handleDelete(conversationToDelete);
          setIsDeleting(false);
          setDeleteModalOpen(false);
          setConversationToDelete(null);
        }}
        isDeleting={isDeleting}
        error={error}
      />
    </div>
  )
}
