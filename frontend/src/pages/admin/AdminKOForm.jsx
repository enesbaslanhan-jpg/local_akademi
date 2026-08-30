import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { Button, Input, Select, Loading } from '@/components/ui'
import { ArrowLeft, Save } from 'lucide-react'
import styles from './AdminKOForm.module.css'

const TYPE_KEYS = ['concept', 'fact', 'procedure', 'principle']
const LEVEL_KEYS = ['beginner', 'intermediate', 'advanced']
const REVIEW_GATE_KEYS = ['standard', 'requires_professional_approval', 'requires_current_official_source_and_legal_approval']
const VERIFICATION_KEYS = ['unverified', 'pending_review', 'verified']

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
  const { t } = useTranslation('admin')
  const { code } = useParams()
  const navigate = useNavigate()
  const isEdit = !!code

  const typeOptions = TYPE_KEYS.map(k => ({ value: k, label: t(`knowledge.type.${k}`) }))
  const levelOptions = LEVEL_KEYS.map(k => ({ value: k, label: t(`knowledge.level.${k}`) }))
  const reviewGateOptions = REVIEW_GATE_KEYS.map(k => ({ value: k, label: t(`form.reviewGate.${k}`) }))
  const verificationOptions = VERIFICATION_KEYS.map(k => ({ value: k, label: t(`form.verification.${k}`) }))

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
    if (!form.title.trim()) errs.title = t('form.validation.titleRequired')
    if (!form.type) errs.type = t('form.validation.typeRequired')
    if (!form.content.trim()) errs.content = t('form.validation.contentRequired')
    if (isEdit && form.code !== originalCode && originalCode) {
      try {
        const current = api.knowledgeV2.getByCode(originalCode)
        if (current?.status === 'published') errs.code = t('form.validation.codeChangeForbidden')
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

  if (loading) return <Loading text={t('form.loading')} />

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/knowledge')}>
          <ArrowLeft size={16} /> {t('form.back')}
        </Button>
        <h2>{isEdit ? t('form.editHeading') : t('form.newHeading')}</h2>
      </div>

      {apiError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{apiError}</div>}

      <form onSubmit={handleSubmit}>
        <div className={styles.grid}>
          <div className="panel">
            <h3>{t('form.sections.basicInfo')}</h3>

            <Input
              label={t('form.fields.code')}
              value={form.code}
              onChange={e => handleChange('code', e.target.value)}
              placeholder={t('form.placeholders.code')}
              disabled={isEdit}
              error={errors.code}
            />

            <Input
              label={t('form.fields.title')}
              value={form.title}
              onChange={e => handleChange('title', e.target.value)}
              placeholder={t('form.placeholders.title')}
              error={errors.title}
            />

            <Input
              label={t('form.fields.summary')}
              value={form.summary}
              onChange={e => handleChange('summary', e.target.value)}
              placeholder={t('form.placeholders.summary')}
            />

            <Select
              label={t('form.fields.type')}
              value={form.type}
              onChange={value => handleChange('type', value)}
              options={typeOptions}
              error={errors.type}
            />

            <Select
              label={t('form.fields.level')}
              value={form.level}
              onChange={value => handleChange('level', value)}
              options={levelOptions}
            />

            <div className={styles.row}>
              <Input
                label={t('form.fields.category')}
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
                placeholder={t('form.placeholders.category')}
              />
              <Input
                label={t('form.fields.subcategory')}
                value={form.subcategory}
                onChange={e => handleChange('subcategory', e.target.value)}
                placeholder={t('form.placeholders.subcategory')}
              />
            </div>
          </div>

          <div className={styles.sidePanel}>
            <div className="panel">
              <h3>{t('form.sections.management')}</h3>

              <Select
                label={t('form.fields.reviewGate')}
                value={form.reviewGate}
                onChange={value => handleChange('reviewGate', value)}
                options={reviewGateOptions}
              />

              <Select
                label={t('form.fields.verification')}
                value={form.verificationStatus}
                onChange={value => handleChange('verificationStatus', value)}
                options={verificationOptions}
              />
            </div>

            <div className="panel" style={{ marginTop: 16 }}>
              <h3>{t('form.sections.actions')}</h3>
              <Button type="submit" full disabled={saving} style={{ marginTop: 8 }}>
                <Save size={16} /> {saving ? t('form.saving') : isEdit ? t('form.saveChanges') : t('form.createKo')}
              </Button>
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <h3>{t('form.sections.content')}</h3>
          <div className={styles.editorWrapper}>
            <textarea
              className={styles.editor}
              value={form.content}
              onChange={e => handleChange('content', e.target.value)}
              placeholder={t('form.placeholders.content')}
              rows={14}
            />
          </div>
          {errors.content && <p className={styles.fieldError}>{errors.content}</p>}
        </div>
      </form>
    </div>
  )
}
