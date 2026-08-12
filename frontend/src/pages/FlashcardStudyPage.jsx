import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Button, Badge, Progress, Loading, EmptyState } from '@/components/ui'
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, CheckCircle, Zap, BarChart3 } from 'lucide-react'
import styles from './FlashcardStudyPage.module.css'

const RATING_LABELS = {
  again: { label: 'Tekrar', shortcut: '1', color: '#a33a3a', bg: '#fde2e2' },
  hard: { label: 'Zor', shortcut: '2', color: '#795c00', bg: '#fff2cc' },
  good: { label: 'İyi', shortcut: '3', color: '#28733c', bg: '#e2f0d9' },
  easy: { label: 'Kolay', shortcut: '4', color: '#2f5597', bg: '#d9eaf7' }
}

export default function FlashcardStudyPage() {
  const { koId } = useParams()
  const navigate = useNavigate()
  const [cards, setCards] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sessionStats, setSessionStats] = useState({ studied: 0, again: 0, hard: 0, good: 0, easy: 0 })
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [koInfo, setKoInfo] = useState(null)
  const mountedRef = useRef(false)

  const fetchCards = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (koId) {
        const res = await api.flashcards.getByKoId(parseInt(koId))
        if (!mountedRef.current) return
        setCards(res.flashcards || res.cards || [])
        setKoInfo(res.knowledgeObject || res.ko || null)
      } else {
        const res = await api.flashcards.getDue(20)
        if (!mountedRef.current) return
        const groups = Array.isArray(res.groups) ? res.groups : []
        setCards(res.cards || res.flashcards || groups.flatMap(group => group.cards || []))
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Kartlar yüklenemedi')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [koId])

  useEffect(() => {
    mountedRef.current = true
    fetchCards()
    return () => { mountedRef.current = false }
  }, [fetchCards])

  useEffect(() => {
    function handleKeyDown(e) {
      if (completed) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped(prev => !prev)
        return
      }
      if (['1', '2', '3', '4'].includes(e.key) && flipped) {
        e.preventDefault()
        const ratingMap = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }
        handleRate(ratingMap[e.key])
        return
      }
      if (e.key === 'ArrowLeft' && flipped) {
        e.preventDefault()
        setFlipped(false)
        return
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [flipped, completed, currentIndex, cards.length])

  async function handleRate(rating) {
    if (submitting || !cards[currentIndex]) return
    setSubmitting(true)
    try {
      await api.flashcards.submitReview(cards[currentIndex].id, rating)
      setSessionStats(prev => ({
        ...prev,
        studied: prev.studied + 1,
        [rating]: prev[rating] + 1
      }))
      setFlipped(false)
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        setCompleted(true)
      }
    } catch (err) {
      console.error('Review failed:', err)
    } finally {
      setSubmitting(false)
    }
  }

  function resetSession() {
    setCurrentIndex(0)
    setFlipped(false)
    setCompleted(false)
    setSessionStats({ studied: 0, again: 0, hard: 0, good: 0, easy: 0 })
    fetchCards()
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Loading text="Kartlar yükleniyor..." fullPage />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <Button onClick={fetchCards} variant="primary">Tekrar Dene</Button>
          <Button onClick={() => navigate('/app/flashcards')} variant="ghost">Geri Dön</Button>
        </div>
      </div>
    )
  }

  if (cards.length === 0 && !completed) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon={<CheckCircle size={48} />}
          title="Çalışılacak kart yok"
          message="Şu anda vadesi gelmiş veya bu KO'ya ait kart bulunmuyor. Daha sonra tekrar kontrol edin."
          action
          actionLabel="Flashcard Paneline Dön"
          onAction={() => navigate('/app/flashcards')}
        />
      </div>
    )
  }

  if (completed) {
    const total = sessionStats.studied
    const goodOrEasy = sessionStats.good + sessionStats.easy
    const accuracy = total > 0 ? Math.round((goodOrEasy / total) * 100) : 0
    return (
      <div className={styles.page}>
        <div className={styles.sessionComplete}>
          <div className={styles.completeIcon}><CheckCircle size={64} /></div>
          <h1 className={styles.completeTitle}>Tebrikler!</h1>
          <p className={styles.completeSub}>Bu oturumdaki tüm kartları bitirdin.</p>
          <div className={styles.completeStats}>
            <div className={styles.completeStat}>
              <Zap size={24} />
              <span className={styles.completeStatValue}>{total}</span>
              <span className={styles.completeStatLabel}>Kart Çalışıldı</span>
            </div>
            <div className={styles.completeStat}>
              <BarChart3 size={24} />
              <span className={styles.completeStatValue}>%{accuracy}</span>
              <span className={styles.completeStatLabel}>Başarı Oranı</span>
            </div>
          </div>
          <div className={styles.completeActions}>
            <Button onClick={resetSession} variant="primary">
              <RotateCcw size={16} /> Tekrar Çalış
            </Button>
            <Button onClick={() => navigate('/app/flashcards')} variant="outline">
              Paneli Dön
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const current = cards[currentIndex]

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/app/flashcards')}>
          <ArrowLeft size={20} />
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>
            {koInfo ? koInfo.title : 'Flashcard Çalışma'}
          </h1>
          {koInfo?.code && <Badge variant="info">{koInfo.code}</Badge>}
        </div>
        <div className={styles.headerStats}>
          <span className={styles.cardCounter}>{currentIndex + 1} / {cards.length}</span>
        </div>
      </div>

      <Progress
        value={currentIndex + 1}
        max={cards.length}
        size="sm"
        variant="primary"
      />

      <div className={styles.cardArea} onClick={() => !flipped && setFlipped(true)}>
        <div className={`${styles.card} ${flipped ? styles.flipped : ''}`}>
          <div className={styles.cardFace + ' ' + styles.cardFront}>
            <div className={styles.cardLabel}>ÖN YÜZ</div>
            <div className={styles.cardText}>{current.front}</div>
            {current.hint && !flipped && (
              <div className={styles.cardHint}>{current.hint}</div>
            )}
            {!flipped && (
              <div className={styles.tapHint}>Dokun veya Boşluk Çevir</div>
            )}
          </div>
          <div className={styles.cardFace + ' ' + styles.cardBack}>
            <div className={styles.cardLabel}>ARKA YÜZ</div>
            <div className={styles.cardText}>{current.back}</div>
          </div>
        </div>
      </div>

      {flipped && (
        <div className={styles.ratingArea}>
          <p className={styles.ratingLabel}>Kendine ne kadar güveniyorsun?</p>
          <div className={styles.ratingButtons}>
            {Object.entries(RATING_LABELS).map(([key, r]) => (
              <button
                key={key}
                className={styles.ratingBtn}
                style={{ '--btn-bg': r.bg, '--btn-color': r.color }}
                onClick={() => handleRate(key)}
                disabled={submitting}
              >
                <span className={styles.ratingLabelText}>{r.label}</span>
                <span className={styles.ratingShortcut}>{r.shortcut}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.sessionBar}>
        <div className={styles.sessionStat}>
          <Zap size={14} />
          <span>{sessionStats.studied} çalışıldı</span>
        </div>
        {sessionStats.again > 0 && (
          <div className={styles.sessionStat} style={{ color: '#a33a3a' }}>
            <span>T {sessionStats.again}</span>
          </div>
        )}
        {sessionStats.good + sessionStats.easy > 0 && (
          <div className={styles.sessionStat} style={{ color: '#28733c' }}>
            <span>B {sessionStats.good + sessionStats.easy}</span>
          </div>
        )}
      </div>
    </div>
  )
}
