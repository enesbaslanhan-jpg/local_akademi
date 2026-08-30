import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '@/components/ui'

export default function LegacyFeatureUnavailable({ feature }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const headingRef = useRef(null)
  const isQuiz = feature === 'quiz'
  const replacement = isQuiz ? t('legacy.decisionTools') : t('legacy.practicalCards')
  const route = isQuiz ? '/app/decision-checks' : '/app/practical-cards'

  useEffect(() => { headingRef.current?.focus() }, [])

  return (
    <main style={{ maxWidth: 720, margin: '3rem auto', padding: '0 1rem' }}>
      <Card>
        <h1 ref={headingRef} tabIndex={-1}>{t('legacy.title', { feature: isQuiz ? 'Quiz' : 'Flashcard' })}</h1>
        <p>{t('legacy.description', { replacement })}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
          <Button variant="primary" onClick={() => navigate(route)}>{t('legacy.goToReplacement', { replacement })}</Button>
          <Button variant="outline" onClick={() => navigate('/app/dashboard')}>{t('legacy.backToDashboard')}</Button>
        </div>
      </Card>
    </main>
  )
}
