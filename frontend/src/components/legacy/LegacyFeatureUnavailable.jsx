import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '@/components/ui'

export default function LegacyFeatureUnavailable({ feature }) {
  const navigate = useNavigate()
  const headingRef = useRef(null)
  const isQuiz = feature === 'quiz'
  const replacement = isQuiz ? 'Karar Araçları' : 'Pratik Kartlar'
  const route = isQuiz ? '/app/decision-checks' : '/app/practical-cards'

  useEffect(() => { headingRef.current?.focus() }, [])

  return (
    <main style={{ maxWidth: 720, margin: '3rem auto', padding: '0 1rem' }}>
      <Card>
        <h1 ref={headingRef} tabIndex={-1}>{isQuiz ? 'Quiz' : 'Flashcard'} deneyimi yenilendi</h1>
        <p>
          Bu eski çalışma alanı artık normal öğrenme akışında kullanılmıyor. Kayıtlı geçmişiniz korunuyor;
          yeni çalışmalarınızı {replacement} ile sürdürebilirsiniz.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }}>
          <Button variant="primary" onClick={() => navigate(route)}>{replacement}'ne Git</Button>
          <Button variant="outline" onClick={() => navigate('/app/dashboard')}>Panele Dön</Button>
        </div>
      </Card>
    </main>
  )
}
