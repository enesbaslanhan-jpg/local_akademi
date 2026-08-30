import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { FeedCard } from './FeedCard'
import { Loading, EmptyState, Button } from '@/components/ui'
import { AlertCircle, RefreshCw, Layers } from 'lucide-react'
import styles from './Feed.module.css'

export function PersonalizedFeed({ resumeItem }) {
  const { t } = useTranslation('community')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const mountedRef = useRef(false)

  const loadFeed = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.feed.getFeed()
      if (!mountedRef.current) return
      setItems(data.items.filter(i => !i.dismissed))
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || t('personalizedFeed.loadFailed'))
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    loadFeed()
    return () => { mountedRef.current = false }
  }, [])

  const handleDismiss = async (itemKey) => {
    // optimistic update
    setItems(prev => prev.filter(i => i.itemKey !== itemKey))
    try {
      await api.feed.dismissItem(itemKey)
    } catch (err) {
      // rollback on error
      loadFeed()
    }
  }

  const handleAction = async (item) => {
    if (!item.viewed) {
      // fire and forget
      api.feed.viewItem(item.itemKey).catch(() => {})
    }
    navigate(item.primaryAction.route)
  }

  if (loading) {
    return (
      <div className={styles.feedContainer}>
        <Loading text={t('personalizedFeed.loading')} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.feedContainer}>
        <div className={styles.feedError}>
          <AlertCircle size={32} />
          <p>{error}</p>
          <Button onClick={loadFeed} variant="outline" size="sm">
            <RefreshCw size={14} className="mr-2" /> {t('personalizedFeed.retry')}
          </Button>
        </div>
      </div>
    )
  }

  const visibleItems = items.filter(i => !i.dismissed)

  if (visibleItems.length === 0 && !resumeItem) {
    return (
      <div className={styles.feedContainer}>
        <EmptyState 
          icon={<Layers size={32} />} 
          title={t('personalizedFeed.emptyTitle')}
          message={t('personalizedFeed.emptyMessage')}
        />
      </div>
    )
  }

  const continueItems = visibleItems.filter(i => i.type === 'continue_learning')
  const otherItems = visibleItems.filter(i => i.type !== 'continue_learning')

  return (
    <div className={styles.feedContainer}>
      {(continueItems.length > 0 || resumeItem) && (
        <div className={styles.feedSection}>
          <h2 className={styles.sectionTitle}>{t('personalizedFeed.continueTitle')}</h2>
          <div className={styles.feedGrid}>
            {continueItems.map(item => (
              <FeedCard key={item.itemKey} item={item} onDismiss={handleDismiss} onAction={handleAction} />
            ))}
          </div>
        </div>
      )}
      {otherItems.length > 0 && (
        <div className={styles.feedSection}>
          <h2 className={styles.sectionTitle}>{t('personalizedFeed.recommendedTitle')}</h2>
          <div className={styles.feedGrid}>
            {otherItems.map(item => (
              <FeedCard key={item.itemKey} item={item} onDismiss={handleDismiss} onAction={handleAction} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
