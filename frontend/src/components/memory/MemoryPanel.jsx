import { useState, useEffect, useCallback } from 'react'
import { api } from '@/services/api'
import './MemoryPanel.css'

const TYPE_LABELS = {
  profile: 'Profil',
  fact: 'Bilgi',
  problem: 'Sorun',
  goal: 'Hedef',
  preference: 'Tercih',
  decision: 'Karar'
}

const STATUS_LABELS = {
  active: 'Aktif',
  superseded: 'Güncellendi',
  archived: 'Arşivlendi'
}

function MemoryCard({ memory, onEdit, onDelete, onDispute, onConfirm }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`memory-card ${memory.status === 'archived' ? 'memory-card--archived' : ''}`}>
      <div className="memory-card__header" onClick={() => setExpanded(!expanded)}>
        <div className="memory-card__type-badge" data-type={memory.type}>
          {TYPE_LABELS[memory.type] || memory.type}
        </div>
        <div className="memory-card__status" data-status={memory.status}>
          {STATUS_LABELS[memory.status] || memory.status}
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
            <span>Önem:</span> <span className="memory-card__bar" style={{ width: `${memory.importance * 100}%` }} />
            <span className="memory-card__detail-value">{(memory.importance * 100).toFixed(0)}%</span>
          </div>
          <div className="memory-card__detail-row">
            <span>Güven:</span> <span className="memory-card__bar memory-card__bar--confidence" style={{ width: `${memory.confidence * 100}%` }} />
            <span className="memory-card__detail-value">{(memory.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="memory-card__detail-row">
            <span>Kaynak:</span>
            <span>{memory.sourceType === 'ai_extraction' ? 'AI Çıkarımı' : 'Manuel'}</span>
          </div>
          {memory.createdAt && (
            <div className="memory-card__detail-row">
              <span>Oluşturma:</span>
              <span>{new Date(memory.createdAt).toLocaleDateString('tr-TR')}</span>
            </div>
          )}
          <div className="memory-card__actions">
            {memory.status === 'active' && (
              <>
                <button className="memory-card__btn memory-card__btn--edit" onClick={() => onEdit(memory)}>Düzenle</button>
                {memory.confidence < 0.9 && (
                  <button className="memory-card__btn memory-card__btn--confirm" onClick={() => onConfirm(memory.id)}>Onayla</button>
                )}
                <button className="memory-card__btn memory-card__btn--dispute" onClick={() => onDispute(memory.id)}>İtiraz Et</button>
                <button className="memory-card__btn memory-card__btn--delete" onClick={() => onDelete(memory.id)}>Sil</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MemoryPanel({ visible, onClose }) {
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
      setError('Hafıza yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [filter, typeFilter])

  useEffect(() => {
    if (visible) loadMemories()
  }, [visible, loadMemories])

  async function handleDelete(id) {
    try {
      await api.memory.remove(id)
      await loadMemories()
    } catch {
      setError('Silme başarısız')
    }
  }

  async function handleDispute(id) {
    try {
      await api.memory.dispute(id)
      await loadMemories()
    } catch {
      setError('İtiraz başarısız')
    }
  }

  async function handleConfirm(id) {
    try {
      await api.memory.confirm(id)
      await loadMemories()
    } catch {
      setError('Onaylama başarısız')
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
      setError('Kaydetme başarısız')
    }
  }

  const types = Object.keys(TYPE_LABELS)

  if (!visible) return null

  return (
    <div className="memory-panel-overlay" onClick={onClose}>
      <div className="memory-panel" onClick={(e) => e.stopPropagation()}>
        <div className="memory-panel__header">
          <h3>Hafıza Yönetimi</h3>
          <button className="memory-panel__close" onClick={onClose}>✕</button>
        </div>

        <div className="memory-panel__toolbar">
          <input
            type="text"
            placeholder="Ara..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="memory-panel__search"
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="memory-panel__type-filter">
            <option value="">Tümü</option>
            {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <button className="memory-panel__new-btn" onClick={handleNew}>+ Yeni</button>
        </div>

        {error && <div className="memory-panel__error">{error}</div>}

        <div className="memory-panel__list">
          {loading ? (
            <div className="memory-panel__empty">Yükleniyor...</div>
          ) : memories.length === 0 ? (
            <div className="memory-panel__empty">Henüz hafıza kaydı yok</div>
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
              <h4>{editingMemory ? 'Hafızayı Düzenle' : 'Yeni Hafıza'}</h4>
              <div className="memory-form__field">
                <label>Tür</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div className="memory-form__field">
                <label>Anahtar</label>
                <input type="text" value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} placeholder="örn: monthly_revenue" />
              </div>
              <div className="memory-form__field">
                <label>Değer</label>
                <textarea value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} rows={2} />
              </div>
              <div className="memory-form__field">
                <label>Özet</label>
                <input type="text" value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} />
              </div>
              <div className="memory-form__field">
                <label>Önem: {(formData.importance * 100).toFixed(0)}%</label>
                <input type="range" min="0" max="1" step="0.1" value={formData.importance} onChange={(e) => setFormData({ ...formData, importance: parseFloat(e.target.value) })} />
              </div>
              <div className="memory-form__field">
                <label>Güven: {(formData.confidence * 100).toFixed(0)}%</label>
                <input type="range" min="0" max="1" step="0.1" value={formData.confidence} onChange={(e) => setFormData({ ...formData, confidence: parseFloat(e.target.value) })} />
              </div>
              <div className="memory-form__actions">
                <button className="memory-form__cancel" onClick={() => setShowForm(false)}>İptal</button>
                <button className="memory-form__save" onClick={handleSaveForm} disabled={!formData.value.trim()}>
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}