import { useState } from 'react'
import { api } from '@/services/api'
import { Button, Badge } from './index'
import { CheckCircle, XCircle, HelpCircle, Send } from 'lucide-react'
import styles from './QuizWidget.module.css'

export default function QuizWidget({ koId, quizzes, onProgress }) {
  if (!quizzes || quizzes.length === 0) return null

  return (
    <div>
      {quizzes.map(quiz => (
        <QuizInstance key={quiz.id} koId={koId} quiz={quiz} onProgress={onProgress} />
      ))}
    </div>
  )
}

function QuizInstance({ koId, quiz, onProgress }) {
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    const answerList = Object.entries(answers).map(([questionId, answer]) => ({
      question_id: questionId,
      answer,
    }))

    if (answerList.length !== (quiz.questions?.length || 0)) {
      setError('Lütfen tüm soruları cevaplayın')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await api.request(`/quizzes/${koId}/attempts`, {
        method: 'POST',
        body: JSON.stringify({ answers: answerList }),
      })
      setResult(res)
      await onProgress?.()
    } catch (err) {
      setError(err.message || 'Quiz gönderilemedi')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div>
        <div className={`${styles.resultBanner} ${result.passed ? styles.passed : styles.failed}`}>
          <div className={styles.resultScore}>{result.score}%</div>
          <div className={styles.resultLabel}>
            {result.passed ? 'Geçtiniz!' : 'Kaldınız'}
          </div>
          <Badge variant={result.passed ? 'success' : 'danger'}>
            {result.correct}/{result.total} doğru
          </Badge>
        </div>
        <div className={styles.questionsReview}>
          {result.feedback?.map((fb, i) => (
            <div key={fb.question_id} className={styles.reviewItem}>
              <div className={styles.reviewHeader}>
                {fb.is_correct ? (
                  <CheckCircle size={16} className={styles.correctIcon} />
                ) : (
                  <XCircle size={16} className={styles.wrongIcon} />
                )}
                <strong>Soru {i + 1}</strong>
              </div>
              {!fb.is_correct && fb.correct_answer && (
                <div className={styles.correctAnswer}>
                  Doğru cevap: {fb.correct_answer}
                </div>
              )}
              {fb.explanation && <div className={styles.correctAnswer}>{fb.explanation}</div>}
            </div>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setResult(null); setAnswers({}) }}>
          Tekrar Çöz
        </Button>
      </div>
    )
  }

  return (
    <div>
      {error && <div className={styles.error}>{error}</div>}
      {quiz.questions?.map((q, i) => (
        <div key={q.id} className={styles.questionBlock}>
          <p className={styles.questionText}>
            <strong>{i + 1}.</strong> {q.questionText}
          </p>
          <div className={styles.optionsList}>
            {Array.isArray(q.options) ? q.options.map((opt, oi) => (
              <label key={oi} className={styles.optionLabel}>
                <input
                  type="radio"
                  name={`q_${q.id}`}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                />
                <span>{opt}</span>
              </label>
            )) : (
              <p className={styles.noOptions}>Seçenek bulunamadı</p>
            )}
          </div>
        </div>
      ))}
      <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting}>
        <Send size={14} /> {submitting ? 'Gönderiliyor...' : 'Cevapları Gönder'}
      </Button>
    </div>
  )
}
