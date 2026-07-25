import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Card, Button, Badge } from './index'
import { Brain, RotateCcw, ChevronLeft, ChevronRight, CheckCircle, BarChart3 } from 'lucide-react'
import styles from './FlashcardSection.module.css'

const RATING_LABELS = { again: 'Tekrar', hard: 'Zor', good: 'İyi', easy: 'Kolay' }
const RATING_COLORS = { again: '#ef4444', hard: '#f59e0b', good: '#22c55e', easy: '#16a34a' }

export default function FlashcardSection({ koId, onProgress }) {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [stats, setStats] = useState({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 })

  useEffect(() => {
    if (!koId) return
    setLoading(true)
    api.flashcards.getByKoId(koId).then(res => {
      setData(res)
      setCurrentIdx(0)
      setFlipped(false)
      setSessionComplete(false)
      setStats({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 })
    }).catch(() => setData(null)).finally(() => setLoading(false))
  }, [koId])

  if (loading) return null
  if (!data || !data.cards || data.cards.length === 0) return null

  const { cards, totalCards, progress } = data
  const currentCard = cards[currentIdx]

  if (!currentCard || sessionComplete) {
    return (
      <Card className={styles.container}>
        <div className={styles.header}>
          <Brain size={18} />
          <span className={styles.title}>Flashcard</span>
          {progress && (
            <Badge variant="success">%{progress.percent} ({progress.mastered}/{progress.seen})</Badge>
          )}
          <Badge variant="info">{cards.length} kart</Badge>
        </div>
        {sessionComplete ? (
          <div className={styles.sessionDone}>
            <CheckCircle size={32} className={styles.doneIcon} />
            <p className={styles.doneText}>Tebrikler! Bu oturumdaki tüm kartları tamamladın.</p>
            <div className={styles.sessionStats}>
              <span>İncelenen: {stats.reviewed}</span>
              <span>Tekrar: {stats.again}</span>
              <span>Zor: {stats.hard}</span>
              <span>İyi: {stats.good}</span>
              <span>Kolay: {stats.easy}</span>
            </div>
            <Button variant="primary" size="sm" onClick={() => navigate(`/app/flashcards/study/${koId}`)}>
              <Brain size={14} /> Tam Ekran Çalış
            </Button>
          </div>
        ) : (
          <p className={styles.emptyText}>Kart bulunamadı.</p>
        )}
      </Card>
    )
  }

  const isDue = !currentCard.lastReview || new Date(currentCard.lastReview.dueAt) <= new Date()

  async function handleRate(rating) {
    try {
      await api.flashcards.submitReview(currentCard.id, rating)
    } catch { }
    setStats(prev => ({ ...prev, reviewed: prev.reviewed + 1, [rating]: prev[rating] + 1 }))
    setFlipped(false)
    if (currentIdx < cards.length - 1) {
      setCurrentIdx(prev => prev + 1)
    } else {
      setSessionComplete(true)
      onProgress?.()
    }
  }

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <Brain size={18} />
        <span className={styles.title}>Flashcard</span>
        {progress && (
          <Badge variant="success">%{progress.percent} tamamlandı</Badge>
        )}
        <Badge variant="info">{currentIdx + 1}/{cards.length}</Badge>
      </div>

      {/* Card */}
      <div className={styles.cardArea} onClick={() => setFlipped(!flipped)} role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFlipped(!flipped) } }}>
        <div className={`${styles.cardInner} ${flipped ? styles.cardFlipped : ''}`}>
          <div className={styles.cardFace}>
            <span className={styles.faceLabel}>Soru</span>
            <p className={styles.cardText}>{currentCard.front}</p>
            {currentCard.hint && !flipped && (
              <p className={styles.hint}>İpucu: {currentCard.hint}</p>
            )}
            <span className={styles.tapHint}>Dokun/Enter → Çevir</span>
          </div>
          <div className={`${styles.cardFace} ${styles.cardBack}`}>
            <span className={styles.faceLabel}>Cevap</span>
            <p className={styles.cardText}>{currentCard.back}</p>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div className={styles.ratingRow}>
          {['again', 'hard', 'good', 'easy'].map(rating => (
            <button
              key={rating}
              className={styles.ratingBtn}
              style={{ background: RATING_COLORS[rating] }}
              onClick={() => handleRate(rating)}
              ariaLabel={RATING_LABELS[rating]}
            >
              {RATING_LABELS[rating]}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
