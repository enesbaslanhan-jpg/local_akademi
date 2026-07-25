import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Button, Badge, Loading, EmptyState } from '@/components/ui'
import { ArrowLeft, CheckCircle, XCircle, Send, RotateCcw, Award } from 'lucide-react'
import styles from './QuizTakePage.module.css'

export default function QuizTakePage() {
  const { koId } = useParams()
  const navigate = useNavigate()
  const [quizData, setQuizData] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const mountedRef = useRef(false)

  const fetchQuiz = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.quizzes.getByKoId(parseInt(koId))
      if (!mountedRef.current) return
      setQuizData(res)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Quiz yüklenemedi')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [koId])

  useEffect(() => {
    mountedRef.current = true
    fetchQuiz()
    return () => { mountedRef.current = false }
  }, [fetchQuiz])

  async function handleSubmit() {
    const questions = quizData?.quiz || []
    if (Object.keys(answers).length !== questions.length) {
      setError('Lutfen tum sorulari cevaplayin')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const answerList = Object.entries(answers).map(([qId, answer]) => ({
        question_id: qId, answer
      }))
      const res = await api.quizzes.submitAttempt(parseInt(koId), answerList)
      if (!mountedRef.current) return
      setResult(res)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err.message || 'Quiz gonderilemedi')
    } finally {
      if (mountedRef.current) setSubmitting(false)
    }
  }

  function handleRetry() {
    setAnswers({})
    setResult(null)
    setError(null)
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Loading text="Quiz yukleniyor..." fullPage />
      </div>
    )
  }

  if (error && !quizData) {
    return (
      <div className={styles.page}>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>{error}</p>
          <Button onClick={fetchQuiz} variant="primary">Tekrar Dene</Button>
          <Button onClick={() => navigate('/app/quiz')} variant="ghost">Geri Don</Button>
        </div>
      </div>
    )
  }

  const questions = quizData?.quiz || []

  if (!quizData || questions.length === 0) {
    return (
      <div className={styles.page}>
        <EmptyState
          icon={<Award size={48} />}
          title="Bu KO icin quiz bulunamadi"
          message="Bu bilgi nesnesine ait quiz sorulari bulunmuyor."
          action
          actionLabel="Quiz Paneline Don"
          onAction={() => navigate('/app/quiz')}
        />
      </div>
    )
  }

  if (result) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/app/quiz')}>
            <ArrowLeft size={20} />
          </button>
          <h1 className={styles.title}>Quiz Sonucu</h1>
        </div>

        <div className={`${styles.resultBanner} ${result.passed ? styles.passed : styles.failed}`}>
          <div className={styles.resultScore}>{result.score}%</div>
          <div>
            <div className={styles.resultLabel}>{result.passed ? 'Gectiniz!' : 'Kaldiniz'}</div>
            <Badge variant={result.passed ? 'success' : 'danger'}>
              {result.correct}/{result.total} dogru
            </Badge>
          </div>
        </div>

        <div className={styles.feedbackList}>
          {result.feedback?.map((fb, i) => (
            <div key={fb.question_id} className={`${styles.feedbackItem} ${fb.is_correct ? styles.fbCorrect : styles.fbWrong}`}>
              <div className={styles.fbHeader}>
                {fb.is_correct ? (
                  <CheckCircle size={18} className={styles.correctIcon} />
                ) : (
                  <XCircle size={18} className={styles.wrongIcon} />
                )}
                <strong>Soru {i + 1}</strong>
                <span className={styles.fbAnswer}>
                  Cevabiniz: {answers[fb.question_id]}
                </span>
              </div>
              {!fb.is_correct && fb.correct_answer && (
                <div className={styles.fbCorrectAnswer}>
                  Dogru cevap: <strong>{fb.correct_answer}</strong>
                </div>
              )}
              {fb.explanation && (
                <div className={styles.fbExplanation}>{fb.explanation}</div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.resultActions}>
          <Button onClick={handleRetry} variant="outline">
            <RotateCcw size={16} /> Tekrar Coz
          </Button>
          <Button onClick={() => navigate('/app/quiz')} variant="primary">
            Quiz Paneline Don
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/app/quiz')}>
          <ArrowLeft size={20} />
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.title}>{quizData?.title || 'Quiz'}</h1>
          <Badge variant="info">{questions.length} soru</Badge>
        </div>
        <span className={styles.questionCounter}>
          {Object.keys(answers).length}/{questions.length} cevaplandi
        </span>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${(Object.keys(answers).length / Math.max(questions.length, 1)) * 100}%` }} />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.questionList}>
        {questions.map((q, i) => (
          <div key={q.id} className={styles.questionBlock}>
            <p className={styles.questionText}>
              <span className={styles.qNumber}>{i + 1}.</span> {q.questionText}
            </p>
            <div className={styles.optionsList}>
              {Array.isArray(q.options) ? q.options.map((opt, oi) => (
                <label
                  key={oi}
                  className={`${styles.optionLabel} ${answers[q.id] === opt ? styles.optionSelected : ''}`}
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                  />
                  <span className={styles.optionLetter}>{String.fromCharCode(65 + oi)}</span>
                  <span>{opt}</span>
                </label>
              )) : (
                <p className={styles.noOptions}>Secenek bulunamadi</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.submitArea}>
        <Button
          variant="primary"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || Object.keys(answers).length !== questions.length}
        >
          <Send size={16} />
          {submitting ? 'Gonderiliyor...' : 'Cevaplari Gonder'}
        </Button>
        {Object.keys(answers).length !== questions.length && (
          <p className={styles.hint}>Tum sorulari cevapladinizdan emin olun</p>
        )}
      </div>
    </div>
  )
}
