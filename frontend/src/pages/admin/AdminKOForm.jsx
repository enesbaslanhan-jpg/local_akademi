import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { Button, Input, Select, Loading } from '@/components/ui'
import { ArrowLeft, Save } from 'lucide-react'
import styles from './AdminKOForm.module.css'

const TYPE_OPTIONS = [
  { value: 'concept', label: 'Kavram' },
  { value: 'fact', label: 'Gerçek' },
  { value: 'procedure', label: 'Prosedür' },
  { value: 'principle', label: 'İlke' }
]

const LEVEL_OPTIONS = [
  { value: 'beginner', label: 'Başlangıç' },
  { value: 'intermediate', label: 'Orta' },
  { value: 'advanced', label: 'İleri' }
]

const REVIEW_GATE_OPTIONS = [
  { value: 'standard', label: 'Standart' },
  { value: 'requires_professional_approval', label: 'Uzman Onayı Gerekli' },
  { value: 'requires_current_official_source_and_legal_approval', label: 'Resmi Kaynak + Yasal Onay' }
]

const VERIFICATION_OPTIONS = [
  { value: 'unverified', label: 'Doğrulanmamış' },
  { value: 'pending_review', label: 'İnceleme Bekliyor' },
  { value: 'verified', label: 'Doğrulandı' }
]

const initialForm = {
  code: '',
  title: '',
  type: 'concept',
  level: 'beginner',
  content: '',
  summary: '',
  category: '',
  subcategory: '',
  reviewGate: 'standard',
  verificationStatus: 'unverified',
  metadata: '{}'
}

export default function AdminKOForm() {
  const { code } = useParams()
  const navigate = useNavigate()
  const isEdit = !!code

  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [originalCode, setOriginalCode] = useState('')

  useEffect(() => {
    if (isEdit && code) {
      api.knowledgeV2.getByCode(code)
        .then(data => {
          const ko = data.knowledgeObject || data
          setForm({
            code: ko.code || '',
            title: ko.title || '',
            type: ko.type || 'concept',
            level: ko.level || 'beginner',
            content: ko.content || '',
            summary: ko.summary || '',
            category: ko.category || '',
            subcategory: ko.subcategory || '',
            reviewGate: ko.reviewGate || 'standard',
            verificationStatus: ko.verificationStatus || 'unverified',
            metadata: ko.metadata || '{}'
          })
          setOriginalCode(ko.code)
        })
        .catch(err => setApiError(err.message))
        .finally(() => setLoading(false))
    }
  }, [isEdit, code])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Başlık zorunludur'
    if (!form.type) errs.type = 'Tür seçilmelidir'
    if (!form.content.trim()) errs.content = 'İçerik zorunludur'
    if (isEdit && form.code !== originalCode && originalCode) {
      try {
        const current = api.knowledgeV2.getByCode(originalCode)
        if (current?.status === 'published') errs.code = 'Yayındaki bir KO\'nun kodu değiştirilemez'
      } catch {}
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    setApiError('')

    try {
      const payload = {
        title: form.title,
        type: form.type,
        content: form.content,
        level: form.level,
        reviewGate: form.reviewGate,
        verificationStatus: form.verificationStatus,
        category: form.category,
        metadata: form.metadata
      }
      if (form.code && !isEdit) payload.code = form.code
      if (form.summary) payload.summary = form.summary
      if (form.subcategory) payload.subcategory = form.subcategory

      if (isEdit) {
        await api.knowledgeV2.update(originalCode || code, payload)
      } else {
        await api.knowledgeV2.create(payload)
      }
      navigate('/admin/knowledge')
    } catch (err) {
      setApiError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading text="Bilgi nesnesi yükleniyor..." />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/knowledge')}>
          <ArrowLeft size={16} /> Geri
        </Button>
        <h2>{isEdit ? 'KO Düzenle' : 'Yeni KO Oluştur'}</h2>
      </div>

      {apiError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{apiError}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <div className="panel">
            <h3>Temel Bilgiler</h3>

            <Input
              label="Kod"
              value={form.code}
              onChange={e => handleChange('code', e.target.value)}
              placeholder="Örn: FIN-BREAKEVEN-001"
              disabled={isEdit}
              error={errors.code}
            />

            <Input
              label="Başlık"
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="KO başlığı"
              error={errors.title}
            />

            <Input
              label="Özet"
              value={form.summary}
              onChange={e => handleChange('summary', e.target.value)}
              placeholder="Kısa açıklama"
            />

            <Select
              label="Tür"
              value={form.type}
              onChange={value => handleChange('type', value)}
              options={TYPE_OPTIONS}
              error={errors.type}
            />

            <Select
              label="Seviye"
              value={form.level}
              onChange={value => handleChange('level', value)}
              options={LEVEL_OPTIONS}
            />

            <div className={styles.row}>
              <Input
                label="Kategori"
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
                placeholder="Örn: Finans"
              />
              <Input
                label="Alt Kategori"
                value={form.subcategory}
                onChange={e => handleChange('subcategory', e.target.value)}
                placeholder="Örn: Başabaş Analizi"
              />
            </div>
          </div>

          <div className={styles.sidePanel}>
            <div className="panel">
              <h3>Yönetim</h3>

              <Select
                label="İnceleme Kapısı"
                value={form.reviewGate}
                onChange={value => handleChange('reviewGate', value)}
                options={REVIEW_GATE_OPTIONS}
              />

              <Select
                label="Doğrulama"
                value={form.verificationStatus}
                onChange={value => handleChange('verificationStatus', value)}
                options={VERIFICATION_OPTIONS}
              />
            </div>

            <div className="panel" style={{ marginTop: 16 }}>
              <h3>İşlemler</h3>
              <Button type="submit" full disabled={saving} style={{ marginTop: 8 }}>
                <Save size={16} /> {saving ? 'Kaydediliyor...' : isEdit ? 'Değişiklikleri Kaydet' : 'KO Oluştur'}
              </Button>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <h3>İçerik</h3>
          <div className={styles.editorWrapper}>
            <textarea
              className={styles.editor}
              value={form.content}
              onChange={e => handleChange('content', e.target.value)}
              placeholder="KO içeriğini buraya yazın..."
              rows={14}
            />
          </div>
          {errors.content && <p className={styles.fieldError}>{errors.content}</p>}
        </div>
      </form>
    </div>
  )
}
