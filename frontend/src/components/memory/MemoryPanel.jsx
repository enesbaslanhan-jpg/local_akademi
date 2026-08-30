import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { Select } from '@/components/ui'
import './MemoryPanel.css'

const TYPE_LABELS = {
  profile: 'memory.typeProfile',
  fact: 'memory.typeFact',
  problem: 'memory.typeProblem',
  goal: 'memory.typeGoal',
  preference: 'memory.typePreference',
  decision: 'memory.typeDecision'
}

const STATUS_LABELS = {
  active: 'memory.statusActive',
  superseded: 'memory.statusSuperseded',
  archived: 'memory.statusArchived'
}

function MemoryCard({ memory, onEdit, onDelete, onDispute, onConfirm }) {
  const { t, i18n } = useTranslation('mentor')
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`memory-card ${memory.status === 'archived' ? 'memory-card--archived' : ''}`}>
      <div className="memory-card__header" onClick={() => setExpanded(!expanded)}>
        <div className="memory-card__type-badge" data-type={memory.type}>
          {TYPE_LABELS[memory.type] ? t(TYPE_LABELS[memory.type]) : memory.type}
        </div>
        <div className="memory-card__status" data-status={memory.status}>
          {STATUS_LABELS[memory.status] ? t(STATUS_LABELS[memory.status]) : memory.status}
        </div>
        <button className="memory-card__expand" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}>
          {expanded ? '▼' : '▶'}
        </button>
      </div>
      <div className="memory-card__key">{memory.key}</div>
      <div className="memory-card__value">{memory.value}</div>
      {memory.summary && <div className="memory-card__summary">{memory.summary}</div>}
      {expanded && (
        <div className="memory-card__details">
          <div className="memory-card__detail-row">
            <span>{t('memory.importanceLabel')}</span> <span className="memory-card__bar" style={{ width: `${memory.importance * 100}%` }} />
            <span className="memory-card__detail-value">{(memory.importance * 100).toFixed(0)}%</span>
          </div>
          <div className="memory-card__detail-row">
            <span>{t('memory.confidenceLabel')}</span> <span className="memory-card__bar memory-card__bar--confidence" style={{ width: `${memory.confidence * 100}%` }} />
            <span className="memory-card__detail-value">{(memory.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="memory-card__detail-row">
            <span>{t('memory.sourceLabel')}</span>
            <span>{memory.sourceType === 'ai_extraction' ? t('memory.sourceAiExtraction') : t('memory.sourceManual')}</span>
          </div>
          {memory.createdAt && (
            <div className="memory-card__detail-row">
              <span>{t('memory.createdAtLabel')}</span>
              <span>{new Date(memory.createdAt).toLocaleDateString(i18n.resolvedLanguage || i18n.language)}</span>
            </div>
          )}
          <div className="memory-card__actions">
            {memory.status === 'active' && (
              <>
                <button className="memory-card__btn memory-card__btn--edit" onClick={() => onEdit(memory)}>{t('memory.editButton')}</button>
                {memory.confidence < 0.9 && (
                  <button className="memory-card__btn memory-card__btn--confirm" onClick={() => onConfirm(memory.id)}>{t('memory.confirmButton')}</button>
                )}
                <button className="memory-card__btn memory-card__btn--dispute" onClick={() => onDispute(memory.id)}>{t('memory.disputeButton')}</button>
                <button className="memory-card__btn memory-card__btn--delete" onClick={() => onDelete(memory.id)}>{t('memory.deleteButton')}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MemoryPanel({ visible, onClose }) {
  const { t } = useTranslation(['mentor', 'common'])
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingMemory, setEditingMemory] = useState(null)
  const [formData, setFormData] = useState({ type: 'fact', key: '', value: '', summary: '', importance: 0.5, confidence: 0.5 })

  const loadMemories = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const filters = {}
      if (filter) filters.q = filter
      if (typeFilter) filters.type = typeFilter
      const data = await api.memory.list(filters)
      setMemories(data.memories || [])
    } catch (err) {
      setError(t('mentor:memory.errorLoad'))
    } finally {
      setLoading(false)
    }
  }, [filter, typeFilter, t])

  useEffect(() => {
    if (visible) loadMemories()
  }, [visible, loadMemories])

  async function handleDelete(id) {
    try {
      await api.memory.remove(id)
      await loadMemories()
    } catch {
      setError(t('mentor:memory.errorDelete'))
    }
  }

  async function handleDispute(id) {
    try {
      await api.memory.dispute(id)
      await loadMemories()
    } catch {
      setError(t('mentor:memory.errorDispute'))
    }
  }

  async function handleConfirm(id) {
    try {
      await api.memory.confirm(id)
      await loadMemories()
    } catch {
      setError(t('mentor:memory.errorConfirm'))
    }
  }

  function handleEdit(memory) {
    setEditingMemory(memory)
    setFormData({
      type: memory.type,
      key: memory.key || '',
      value: memory.value,
      summary: memory.summary || '',
      importance: memory.importance,
      confidence: memory.confidence
    })
    setShowForm(true)
  }

  function handleNew() {
    setEditingMemory(null)
    setFormData({ type: 'fact', key: '', value: '', summary: '', importance: 0.5, confidence: 0.5 })
    setShowForm(true)
  }

  async function handleSaveForm() {
    try {
      if (editingMemory) {
        await api.memory.update(editingMemory.id, formData)
      } else {
        await api.memory.create(formData)
      }
      setShowForm(false)
      setEditingMemory(null)
      await loadMemories()
    } catch {
      setError(t('mentor:memory.errorSave'))
    }
  }

  const types = Object.keys(TYPE_LABELS)

  if (!visible) return null

  return (
    <div className="memory-panel-overlay" onClick={onClose}>
      <div className="memory-panel" onClick={(e) => e.stopPropagation()}>
        <div className="memory-panel__header">
          <h3>{t('mentor:memory.panelTitle')}</h3>
          <button className="memory-panel__close" onClick={onClose} aria-label={t('common:buttons.close')}>✕</button>
        </div>

        <div className="memory-panel__toolbar">
          <input
            type="text"
            placeholder={t('mentor:memory.searchPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="memory-panel__search"
          />
          <Select className="memory-panel__type-filter" aria-label={t('mentor:memory.typeFilterAriaLabel')} placeholder={t('mentor:memory.filterAll')} options={types.map(type => ({ value: type, label: t(`mentor:${TYPE_LABELS[type]}`) }))} value={typeFilter} onChange={v => setTypeFilter(v)} />
          <button className="memory-panel__new-btn" onClick={handleNew}>+ {t('mentor:memory.newButton')}</button>
        </div>

        {error && <div className="memory-panel__error">{error}</div>}

        <div className="memory-panel__list">
          {loading ? (
            <div className="memory-panel__empty">{t('common:states.loading')}</div>
          ) : memories.length === 0 ? (
            <div className="memory-panel__empty">{t('mentor:memory.empty')}</div>
          ) : (
            memories.map(m => (
              <MemoryCard
                key={m.id}
                memory={m}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDispute={handleDispute}
                onConfirm={handleConfirm}
              />
            ))
          )}
        </div>

        {showForm && (
          <div className="memory-form-overlay" onClick={() => setShowForm(false)}>
            <div className="memory-form" onClick={(e) => e.stopPropagation()}>
              <h4>{editingMemory ? t('mentor:memory.editFormTitle') : t('mentor:memory.newFormTitle')}</h4>
              <div className="memory-form__field">
                <label>{t('mentor:memory.fieldType')}</label>
                <Select aria-label={t('mentor:memory.typeSelectAriaLabel')} options={types.map(type => ({ value: type, label: t(`mentor:${TYPE_LABELS[type]}`) }))} value={formData.type} onChange={v => setFormData({ ...formData, type: v })} />
              </div>
              <div className="memory-form__field">
                <label>{t('mentor:memory.fieldKey')}</label>
                <input type="text" value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} placeholder={t('mentor:memory.keyPlaceholder')} />
              </div>
              <div className="memory-form__field">
                <label>{t('mentor:memory.fieldValue')}</label>
                <textarea value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} rows={2} />
              </div>
              <div className="memory-form__field">
                <label>{t('mentor:memory.fieldSummary')}</label>
                <input type="text" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} />
              </div>
              <div className="memory-form__field">
                <label>{t('mentor:memory.importancePercent', { percent: (formData.importance * 100).toFixed(0) })}</label>
                <input type="range" min="0" max="1" step="0.1" value={formData.importance} onChange={(e) => setFormData({ ...formData, importance: parseFloat(e.target.value) })} />
              </div>
              <div className="memory-form__field">
                <label>{t('mentor:memory.confidencePercent', { percent: (formData.confidence * 100).toFixed(0) })}</label>
                <input type="range" min="0" max="1" step="0.1" value={formData.confidence} onChange={(e) => setFormData({ ...formData, confidence: parseFloat(e.target.value) })} />
              </div>
              <div className="memory-form__actions">
                <button className="memory-form__cancel" onClick={() => setShowForm(false)}>{t('mentor:memory.cancelButton')}</button>
                <button className="memory-form__save" onClick={handleSaveForm} disabled={!formData.value.trim()}>
                  {t('common:buttons.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
