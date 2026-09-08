import { useContext, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import WorkspaceContext from '@/context/WorkspaceContext'
import { api } from '@/services/api'
import { Button, Input } from '@/components/ui'
import { formatDecisionText } from '@/utils/decisionText'
import { getFormatLocale } from '@/utils/formatters'
import styles from './DecisionFollowUp.module.css'
import { captureAnalytics } from '@/services/analytics'

export default function DecisionFollowUp({ session, snapshot, navigate }) {
  const workspace = useContext(WorkspaceContext)
  const { t } = useTranslation('tools')
  const workspaceId = workspace?.activeWorkspaceId
  // A workspace/session change remounts the form, so a pending write cannot
  // replace the new business's state or carry its members into another form.
  if (!workspaceId) return <section className={styles.section}><h2>{t('followUp.title')}</h2><p>{t('followUp.noWorkspace')}</p><Button variant="secondary" onClick={() => navigate('/app/workspaces')}>{t('followUp.chooseWorkspace')}</Button></section>
  return <FollowUpForm key={`${workspaceId}:${session.id}`} {...{ session, snapshot, workspaceId, t, navigate }} workspace={workspace.activeWorkspace} />
}

function FollowUpForm({ session, snapshot, workspaceId, workspace, t, navigate }) {
  const [records, setRecords] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const [title, setTitle] = useState('')
  const [expected, setExpected] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [reviewId, setReviewId] = useState(null)
  const [actual, setActual] = useState('')
  const [lesson, setLesson] = useState('')
  const canWrite = ['owner', 'admin', 'manager', 'staff', 'accountant'].includes(workspace?.myRole)
  const steps = snapshot?.calculationOutput?.safeNextSteps || snapshot?.recommendedActions || []

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([
      api.workspace.tracker.list(workspaceId, { decisionSessionId: session.id, limit: 100 }),
      api.workspace.members.list(workspaceId)
    ]).then(([data, people]) => {
      if (cancelled) return
      setRecords((data.records || []).filter(r => r.metadata?.decisionSessionId === session.id))
      setMembers(people.filter(m => m.status === 'active'))
    }).catch(() => { if (!cancelled) setError(t('followUp.loadError')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [workspaceId, session.id, attempt, t])

  async function save(event) {
    event.preventDefault()
    if (saving.current || !canWrite) return
    if (!title.trim() || !expected.trim() || !dueDate || !assignedTo) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const created = await api.workspace.tracker.create(workspaceId, {
        type: 'task', title: title.trim(), direction: 'neutral',
        dueAt: new Date(`${dueDate}T12:00:00`).toISOString(),
        assignedToId: Number(assignedTo),
        metadata: { decisionSessionId: session.id, decisionFollowUp: {
          decisionTitle: session.decisionCheckTitle, expectedOutcome: expected.trim()
        } }
      })
      setRecords(current => [...current, created])
      captureAnalytics('decision_follow_up_created', {
        decision_tool_code: session.decisionCheckCode,
        source: 'decision_result'
      })
      setEditing(false)
      setTitle(''); setExpected(''); setDueDate(''); setAssignedTo('')
    } catch { setError(t('followUp.saveError')) }
    finally { saving.current = false; setBusy(false) }
  }

  async function saveReview(event) {
    event.preventDefault()
    if (saving.current || !canWrite || !actual.trim()) return
    saving.current = true
    setBusy(true)
    setError('')
    try {
      const latest = await api.workspace.tracker.get(workspaceId, reviewId)
      const updated = await api.workspace.tracker.update(workspaceId, reviewId, {
        status: 'completed', metadata: { ...latest.metadata, decisionFollowUp: {
          ...latest.metadata?.decisionFollowUp, actualOutcome: actual.trim(),
          lessonLearned: lesson.trim(), reviewedAt: new Date().toISOString()
        } }
      })
      setRecords(current => current.map(r => r.id === updated.id ? updated : r))
      setReviewId(null)
    } catch { setError(t('followUp.saveError')) }
    finally { saving.current = false; setBusy(false) }
  }

  return <section className={styles.section} aria-label={t('followUp.title')}>
    <h2>{t('followUp.title')}</h2>
    <p className={styles.hint}>{t('followUp.sharing', { name: workspace?.name || t('followUp.currentWorkspace') })}</p>
    {loading && <p role="status">{t('followUp.loading')}</p>}
    {error && <div role="alert" className={styles.error}><p>{error}</p><Button variant="secondary" onClick={() => setAttempt(a => a + 1)} disabled={busy}>{t('common:buttons.retry')}</Button></div>}
    {!loading && !error && <>
      {records.length > 0 && <ul className={styles.list}>{records.map(record => {
        const followUp = record.metadata?.decisionFollowUp || {}
        return <li className={styles.item} key={record.id}>
          <strong>{record.title}</strong>
          <p><b>{t('followUp.expected')}: </b>{followUp.expectedOutcome}</p>
          <p className={styles.hint}>{record.dueAt ? new Date(record.dueAt).toLocaleDateString(getFormatLocale()) : t('followUp.noDate')} · {members.find(m => m.userId === record.assignedToId)?.name || t('followUp.unassigned')}</p>
          {followUp.actualOutcome && <><p><b>{t('followUp.actual')}: </b>{followUp.actualOutcome}</p>{followUp.lessonLearned && <p><b>{t('followUp.lesson')}: </b>{followUp.lessonLearned}</p>}</>}
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => navigate(`/app/workspaces/${workspaceId}/tracker?record=${encodeURIComponent(record.id)}`)}>{t('followUp.openTask')}</Button>
            {canWrite && <Button variant="secondary" disabled={busy} onClick={() => { setReviewId(record.id); setActual(followUp.actualOutcome || ''); setLesson(followUp.lessonLearned || ''); setEditing(false) }}>{t(followUp.actualOutcome ? 'followUp.editReview' : 'followUp.review')}</Button>}
          </div>
        </li>
      })}</ul>}
      {canWrite && !editing && !reviewId && <Button variant="secondary" onClick={() => setEditing(true)}>{t('followUp.create')}</Button>}
      {!canWrite && <p>{t('followUp.readOnly')}</p>}
    </>}
    {editing && <form onSubmit={save} className={styles.form}><fieldset disabled={busy} className={styles.form}>
      {steps.length > 0 && <label className={styles.field}>{t('followUp.fromStep')}<select value="" onChange={e => setTitle(formatDecisionText(e.target.value).slice(0, 240))}><option value="">{t('followUp.selectStep')}</option>{steps.filter(s => typeof s === 'string').map((step, i) => <option key={i} value={step}>{formatDecisionText(step)}</option>)}</select></label>}
      <Input label={t('followUp.taskTitle')} value={title} onChange={e => setTitle(e.target.value)} required maxLength={240} />
      <label className={styles.field}>{t('followUp.expected')}<textarea value={expected} onChange={e => setExpected(e.target.value)} required maxLength={4000} /></label>
      <Input label={t('followUp.date')} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
      <label className={styles.field}>{t('followUp.assignee')}<select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} required><option value="">{t('followUp.chooseAssignee')}</option>{members.map(m => <option key={m.id} value={m.userId}>{m.name || m.email}</option>)}</select></label>
      <div className={styles.row}><Button type="submit" disabled={busy}>{t(busy ? 'followUp.saving' : 'followUp.save')}</Button><Button type="button" variant="ghost" onClick={() => setEditing(false)}>{t('common:buttons.cancel')}</Button></div>
    </fieldset></form>}
    {reviewId && <form className={styles.form} onSubmit={saveReview}><fieldset disabled={busy} className={styles.form}>
      <p>{t('followUp.reviewHint')}</p>
      <label className={styles.field}>{t('followUp.actual')}<textarea value={actual} onChange={e => setActual(e.target.value)} required maxLength={4000} /></label>
      <label className={styles.field}>{t('followUp.lesson')}<textarea value={lesson} onChange={e => setLesson(e.target.value)} maxLength={4000} /></label>
      <div className={styles.row}><Button type="submit" disabled={busy}>{t(busy ? 'followUp.saving' : 'followUp.saveReview')}</Button><Button variant="ghost" type="button" onClick={() => setReviewId(null)}>{t('common:buttons.cancel')}</Button></div>
    </fieldset></form>}
  </section>
}
