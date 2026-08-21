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

/* İşlem önerisi tipine göre ikon. Tip tanınmazsa nötr kıvılcım kullanılır —
   uydurma bir etiket veya ikon üretilmez. */
const ACTION_ICONS = {
  open_knowledge: BookOpen,
  open_financial_models: FlaskConical,
  open_business_profile: Settings
}

const ACTION_DESCRIPTIONS = {
  open_knowledge: 'Yanıtın dayandığı ilgili içeriği incele.',
  open_financial_models: 'Finansal model kütüphanesinde çalışmaya devam et.',
  open_business_profile: 'İşletme bilgilerini güncelle ve öneriyi netleştir.'
}

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

function formatMoney(value, currency) {
  return `${Number(value || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })} ${currency || 'TRY'}`
}

export default function MentorPage() {
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
      ? `Bugün, ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
      : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  }, [messages])

  /* HAFIZA: yalnız BusinessProfile'da gerçekten kayıtlı alanlar gösterilir.
     Alan yoksa sıra çizilmez; hiç veri yoksa boş durum mesajı çıkar. */
  const profileRows = useMemo(() => {
    if (!businessProfile) return []
    const p = businessProfile
    const rows = []
    if (p.sector) rows.push({ label: 'Sektör', value: p.sector })
    if (p.city) rows.push({ label: 'Şehir', value: p.city })
    if (p.businessStage) rows.push({ label: 'Aşama', value: p.businessStage })
    if (p.monthly_sales > 0) rows.push({ label: 'Aylık Satış', value: formatMoney(p.monthly_sales, p.currency) })
    if (p.monthly_expenses > 0) rows.push({ label: 'Aylık Gider', value: formatMoney(p.monthly_expenses, p.currency) })
    if (p.primaryGoal) rows.push({ label: 'Hedef', value: p.primaryGoal })
    if (Array.isArray(p.challenges) && p.challenges.length > 0) {
      rows.push({ label: 'Zorluklar', value: p.challenges.join(', ') })
    }
    return rows
  }, [businessProfile])

  if (loading && conversations.length === 0) return <Loading text="Yükleniyor..." />

  /* Aynı liste iki yere basılır: masaüstünde kabuğun bağlam paneline (portal),
     mobilde hamburgerden açılan drawer'a. Her breakpoint'te yalnızca biri
     görünür; ikisi de aynı JSX'ten üretildiği için ayrışamazlar. */
  const conversationList = (
    <div className={styles.convPanel}>
        <div className={styles.sidebarHeader}>
          <div>
            <h2 className={styles.sidebarHeaderTitle}>Sohbet Geçmişi</h2>
            <p className={styles.sidebarHeaderEyebrow}>Aktif Oturumlar</p>
          </div>
          <button className={styles.memoryBtn} onClick={() => setMemoryPanelVisible(true)}>Hafıza</button>
        </div>

        <button className={styles.newChatBtn} onClick={() => { handleNew(); setSidebarOpen(false) }}>
          <CirclePlus size={19} aria-hidden="true" />
          Yeni Sohbet Başlat
        </button>

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
          {conversations.length === 0 ? (
            <div className={styles.convListEmpty}>
              Henüz sohbet yok
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
                        {conv.title || 'İsimsiz'}
                      </div>
                    )}
                    <div className={styles.convPreview}>
                      {conv.lastMessage ? contentPreview(conv.lastMessage.content) : 'Henüz mesaj yok'}
                    </div>
                    <div className={styles.convMeta}>
                      {formatTime(conv.lastMessageAt || conv.updatedAt)}
                      {conv.messageCount > 0 && ` · ${conv.messageCount} mesaj`}
                    </div>
                  </div>

                  <div className={styles.convActions}>
                    {!showArchived && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditValue(conv.title || '') }}
                          className={styles.convActionBtn}
                          title="Düzenle"
                          aria-label="Düzenle"
                        >
                          <Pencil size={13} aria-hidden="true" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleArchive(conv.id) }}
                          className={styles.convActionBtn}
                          title="Arşivle"
                          aria-label="Arşivle"
                        >
                          <Archive size={13} aria-hidden="true" />
                        </button>
                      </>
                    )}
                    {showArchived && (
                      <button
                        onClick={e => { e.stopPropagation(); handleUnarchive(conv.id) }}
                        className={styles.convActionBtn}
                        title="Arşivden çıkar"
                        aria-label="Arşivden çıkar"
                      >
                        <RotateCcw size={13} aria-hidden="true" />
                      </button>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); setConversationToDelete(conv.id); setDeleteModalOpen(true) }}
                      className={styles.convActionBtn}
                      title="Sil"
                      aria-label="Sil"
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
      <div className={styles.actionsTitle}><Zap size={14} aria-hidden="true" /> İşlem Önerileri</div>
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
                  <span className={styles.actionLabel}>{action.label}</span>
                  <small>{ACTION_DESCRIPTIONS[action.type] || 'İlgili çalışma alanını aç.'}</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )
          })}
        </div>
) : (
        <div className={styles.actionsEmpty}>Mentor yanıtındaki uygun ve gerçek işlemler burada görünür.</div>
      )}
    </>
  )

  /* HAFIZA kartı: veriler yukarıda (erken dönüşten önce) hesaplanır;
     burada yalnızca render edilir. */
  const memoryBlock = (
    <section className={styles.memorySection} aria-label="Hafıza">
      <div className={styles.actionsTitle}><Brain size={14} aria-hidden="true" /> Hafıza</div>
      {profileLoading ? (
        <div className={styles.actionsEmpty}>Yükleniyor...</div>
      ) : profileRows.length === 0 && !lastDecision ? (
        <div className={styles.actionsEmpty}>Henüz kaydedilmiş işletme bilgisi yok.</div>
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
              <span className={styles.memoryLabel}>Son Karar</span>
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
        Hafızayı Yönet
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
      <h1 className="sr-only">AI Mentor</h1>

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
            title="Sohbet listesi"
            aria-label="Sohbet listesi"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <div className={styles.topBarTitleWrap}>
            <h2 className={styles.topBarTitle}>
              AI Mentor
            </h2>
            <span className={styles.topBarProvider}>İşletme bağlamınla birlikte düşün{selectedConv?.title ? ` · ${selectedConv.title}` : ''}</span>
          </div>
          {contextTitle && (
            <span className={styles.contextBadge}>Bağlam: {contextTitle}</span>
          )}
        </div>

        <div ref={messagesContainerRef} className={styles.messagesArea}>
          <MentorErrorAlert error={error} onDismiss={() => setError('')} />

          {showScrollButton && (
            <button
              onClick={scrollToBottom}
              className={styles.scrollToBottomBtn}
            >
              En yeni mesaja git ↓
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
                        <span className={styles.typingDot} /> AI düşünüyor...
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
              <section className={styles.actionsInline} aria-label="Mentor işlem önerileri">
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
            Arşivlenmiş sohbetlere yeni mesaj gönderilemez.
          </div>
        )}
      </main>

      {/* Masaüstü üçüncü bölge: üstte HAFIZA, altta işlem önerileri. */}
      <aside className={styles.actionsCol} aria-label="Mentor yan paneli">
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
