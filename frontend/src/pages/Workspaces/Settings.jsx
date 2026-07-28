import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import Button from '@/components/ui/Button'
import styles from './Settings.module.css'

export default function Settings() {
  const { workspaceId } = useParams()
  const [form, setForm] = useState({ timezone: 'Europe/Istanbul', locale: 'tr-TR', defaultCurrency: 'TRY', weekStartsOn: 1 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    api.workspace.settings.get(workspaceId).then(s => {
      setForm({ timezone: s.timezone, locale: s.locale, defaultCurrency: s.defaultCurrency, weekStartsOn: s.weekStartsOn })
    }).catch(() => {})
  }, [workspaceId])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      await api.workspace.settings.update(workspaceId, form)
      setMsg({ type: 'success', text: 'Ayarlar kaydedildi.' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Kaydetme başarısız.' })
    } finally { setSaving(false) }
  }

  return (
    <div className={styles.card}>
      {msg && <div className={`${styles.message} ${msg.type === 'success' ? styles.success : styles.error}`}>{msg.text}</div>}
      <form onSubmit={handleSave}>
        <div className={styles.field}>
          <label>Saat Dilimi</label>
          <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}>
            <option value="Europe/Istanbul">İstanbul (GMT+3)</option>
            <option value="Europe/London">Londra (GMT+0/+1)</option>
            <option value="America/New_York">New York (GMT-5/-4)</option>
          </select>
        </div>
        <div className={styles.field}>
          <label>Dil / Bölge</label>
          <select value={form.locale} onChange={e => setForm(f => ({ ...f, locale: e.target.value }))}>
            <option value="tr-TR">Türkçe (Türkiye)</option>
            <option value="en-US">English (US)</option>
          </select>
        </div>
        <div className={styles.field}>
          <label>Para Birimi</label>
          <select value={form.defaultCurrency} onChange={e => setForm(f => ({ ...f, defaultCurrency: e.target.value }))}>
            <option value="TRY">₺ TRY</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
        </div>
        <div className={styles.field}>
          <label>Hafta Başlangıcı</label>
          <select value={form.weekStartsOn} onChange={e => setForm(f => ({ ...f, weekStartsOn: Number(e.target.value) }))}>
            <option value={1}>Pazartesi</option>
            <option value={0}>Pazar</option>
          </select>
        </div>
        <div className={styles.actions}>
          <Button type="submit" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
        </div>
      </form>
    </div>
  )
}
