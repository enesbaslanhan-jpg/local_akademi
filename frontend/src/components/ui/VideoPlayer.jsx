import { useState, useEffect, useRef } from 'react'
import { api } from '@/services/api'
import { Card, Badge } from './index'
import { Clock, Film, AlertCircle } from 'lucide-react'
import styles from './VideoPlayer.module.css'

export default function VideoPlayer({ koId, onProgress }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastObservedRef = useRef(0)
  const pendingSecondsRef = useRef(0)
  const sendingRef = useRef(false)

  useEffect(() => {
    if (!koId) return
    setLoading(true)
    api.videos.getByKoId(koId).then(res => {
      setData(res)
    }).catch(() => {
      setData({ video: null, available: false })
    }).finally(() => setLoading(false))
  }, [koId])

  if (loading) return null
  if (!data || !data.available || !data.video?.playbackUrl) return null

  const { video, progress } = data

  async function sendProgress(videoEl) {
    if (sendingRef.current || pendingSecondsRef.current < 1) return
    const delta = Math.min(15, Math.max(1, Math.round(pendingSecondsRef.current)))
    pendingSecondsRef.current = 0
    sendingRef.current = true
    try {
      const response = await api.videos.updateProgress(video.id, videoEl.currentTime, delta)
      setData(previous => ({ ...previous, progress: response.progress }))
      if (response.progress?.completed) onProgress?.()
    } catch {
      pendingSecondsRef.current += delta
    } finally {
      sendingRef.current = false
    }
  }

  function handleTimeUpdate(e) {
    const videoEl = e.target
    const delta = videoEl.currentTime - lastObservedRef.current
    if (delta > 0 && delta <= 2) pendingSecondsRef.current += delta
    lastObservedRef.current = videoEl.currentTime
    if (pendingSecondsRef.current >= 5) {
      void sendProgress(videoEl)
    }
  }

  return (
    <Card className={styles.container}>
      <div className={styles.header}>
        <Film size={18} />
        <span className={styles.title}>{video.title || 'Video'}</span>
        {video.durationTarget && (
          <Badge variant="info"><Clock size={12} /> {Math.round(video.durationTarget / 60)} dk</Badge>
        )}
        {progress && (
          <Badge variant={progress.completed ? 'success' : 'default'}>
            {progress.completed ? 'Tamamlandı' : `%${progress.percent}`}
          </Badge>
        )}
      </div>
      <div className={styles.playerWrap}>
        <video
          className={styles.video}
          src={video.playbackUrl}
          controls
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={event => {
            const saved = progress?.lastPositionSeconds || 0
            if (saved > 0 && saved < event.currentTarget.duration) event.currentTarget.currentTime = saved
            lastObservedRef.current = event.currentTarget.currentTime
          }}
          onPlay={event => { lastObservedRef.current = event.currentTarget.currentTime }}
          onSeeked={event => { lastObservedRef.current = event.currentTarget.currentTime }}
          onPause={event => { void sendProgress(event.currentTarget) }}
        >
          {video.webvttContent && (
            <track kind="captions" src={`data:text/vtt;charset=utf-8,${encodeURIComponent(video.webvttContent)}`} label="Türkçe" srcLang="tr" />
          )}
        </video>
      </div>
      {video.transcript && (
        <details className={styles.transcript}>
          <summary className={styles.transcriptToggle}>Transkript</summary>
          <pre className={styles.transcriptText}>{video.transcript}</pre>
        </details>
      )}
    </Card>
  )
}
