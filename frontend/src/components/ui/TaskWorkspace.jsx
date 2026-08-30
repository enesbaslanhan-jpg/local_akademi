import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { Button, Badge } from './index'
import { Save, CheckCircle, Play } from 'lucide-react'
import styles from './TaskWorkspace.module.css'
import { useTranslation } from 'react-i18next'

function parseJson(value, fallback) {
  if (!value) return fallback
  if (typeof value !== 'string') return value
  try { return JSON.parse(value) } catch { return fallback }
}

export default function TaskWorkspace({ koId, taskTemplates, onProgress }) {
  if (!taskTemplates || taskTemplates.length === 0) return null

  return (
    <div>
      {taskTemplates.map(t => (
        <TaskInstance key={t.id} koId={koId} template={t} onProgress={onProgress} />
      ))}
    </div>
  )
}

function TaskInstance({ koId, template, onProgress }) {
  const { t } = useTranslation('common')
  const [assignment, setAssignment] = useState(null)
  const [answerText, setAnswerText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAssignment()
  }, [])

  async function loadAssignment() {
    setLoading(true)
    try {
      const data = await api.request('/tasks')
      const existing = data.tasks?.find(
          (t) => t.taskTemplateId === template.id || t.taskId === template.id
      )
      if (existing) {
        setAssignment(existing)
        try {
          const ans = JSON.parse(existing.answers || '{}')
          setAnswerText(ans.text || ans.answer || '')
        } catch { setAnswerText(existing.answers || '') }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleStart() {
    setSaving(true)
    setError('')
    try {
      const res = await api.request(`/tasks/${template.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      setAssignment(res)
      await onProgress?.()
    } catch (err) {
      setError(err.message || t('ui.task.errors.start'))
    }
    setSaving(false)
  }

  async function handleSaveDraft() {
    if (!assignment) return
    setSaving(true)
    setError('')
    try {
      const res = await api.request(`/tasks/assignments/${assignment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ answers: { text: answerText }, progress_percent: 50 }),
      })
      setAssignment(res)
    } catch (err) {
      setError(err.message || t('ui.task.errors.saveDraft'))
    }
    setSaving(false)
  }

  async function handleComplete() {
    if (!assignment) return
    const minimumWords = Number(parseJson(template.exampleOutput, {}).minWords) || 10
    const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0
    if (wordCount < minimumWords) {
      setError(t('ui.task.errors.minimumWords', { minimum: minimumWords, count: wordCount }))
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await api.request(`/tasks/assignments/${assignment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ answers: { text: answerText }, progress_percent: 100, status: 'completed' }),
      })
      setAssignment(res)
      await onProgress?.()
    } catch (err) {
      setError(err.message || t('ui.task.errors.complete'))
    }
    setSaving(false)
  }

  if (loading) return <div className={styles.loading}>{t('states.loading')}</div>

  const isStarted = !!assignment
  const isCompleted = assignment?.status === 'completed'
  const taskInstructions = parseJson(template.instructions, [])
  const taskChecklist = parseJson(template.checklist, [])
  const taskRubric = parseJson(template.rubric, [])
  const outputGuide = parseJson(template.exampleOutput, {})
  const wordCount = answerText.trim() ? answerText.trim().split(/\s+/).length : 0

  return (
    <div className={styles.taskBlock}>
      <h3 className={styles.taskTitle}>{template.title}</h3>
      <p className={styles.taskDescription}>{template.description}</p>
      {template.estimatedTime && (
        <Badge variant="info">{t('ui.task.minutesShort', { count: template.estimatedTime })}</Badge>
      )}

      {taskInstructions.length > 0 && (
        <div className={styles.guidance}>
          <strong>{t('ui.task.steps')}</strong>
          <ol>{taskInstructions.map((item, index) => <li key={index}>{item.text || item}</li>)}</ol>
        </div>
      )}
      {taskChecklist.length > 0 && (
        <div className={styles.guidance}>
          <strong>{t('ui.task.checklist')}</strong>
          <ul>{taskChecklist.map((item, index) => <li key={index}>{item.item || item}</li>)}</ul>
        </div>
      )}
      {taskRubric.length > 0 && (
        <details className={styles.rubric}>
          <summary>{t('ui.task.rubric')}</summary>
          <ul>{taskRubric.map((item, index) => <li key={index}><strong>{item.level}</strong>: {item.description}</li>)}</ul>
        </details>
      )}

      {error && <div className={styles.error}>{error}</div>}

      {!isStarted ? (
        <Button variant="primary" size="sm" onClick={handleStart} disabled={saving}>
          <Play size={14} /> {t('ui.task.start')}
        </Button>
      ) : (
        <div className={styles.workspace}>
          <textarea
            className={styles.textarea}
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            placeholder={t('ui.task.answerPlaceholder')}
            disabled={isCompleted}
            rows={5}
          />
          <div className={styles.wordCount}>
            {t('ui.task.wordCount', { count: wordCount })}{outputGuide.minWords ? ` / ${t('ui.task.minimumWords', { count: outputGuide.minWords })}` : ''}
          </div>
          <div className={styles.actions}>
            {!isCompleted && (
              <>
                <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={saving}>
                  <Save size={14} /> {t('ui.task.saveDraft')}
                </Button>
                <Button variant="primary" size="sm" onClick={handleComplete} disabled={saving}>
                  <CheckCircle size={14} /> {t('ui.task.complete')}
                </Button>
              </>
            )}
            {isCompleted && (
              <Badge variant="success">{t('ui.task.completed')} · {assignment.reviewStatus === 'submitted' ? t('ui.task.awaitingReview') : assignment.reviewStatus}</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
