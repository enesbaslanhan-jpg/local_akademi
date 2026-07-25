import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/services/api'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api.onboarding.getProfile().then(d => setProfile(d.profile)).catch(() => {})
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await api.onboarding.updateProfile({ businessName: name })
      setMessage('Kaydedildi')
    } catch {
      setMessage('Hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className="grid-2">
        <div className="panel">
          <h2>Kullanıcı Bilgileri</h2>
          <div className="stats-row">
            <small>E-posta</small>
            <b>{user?.email}</b>
          </div>
          <div className="stats-row">
            <small>Rol</small>
            <b>{user?.role || 'learner'}</b>
          </div>
          <form onSubmit={handleSave} className={styles.form}>
            <div className="stats-row">
              <small>Ad</small>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <button type="submit" className={styles.btn} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Güncelle'}
            </button>
            {message && <p className={styles.message}>{message}</p>}
          </form>
        </div>

        <div className="panel">
          <h2>Uygulama Bilgisi</h2>
          <div className="stats-row">
            <small>Sürüm</small>
            <b>1.0.0</b>
          </div>
          <div className="stats-row">
            <small>Backend</small>
            <b>Node.js + Fastify</b>
          </div>
          <div className="stats-row">
            <small>Veritabanı</small>
            <b>SQLite + Prisma</b>
          </div>
        </div>
      </div>

      {profile && (
        <div className="panel" style={{ marginTop: '1rem' }}>
          <h2>İşletme Profili</h2>
          <div className="stats-row">
            <small>Aşama</small>
            <b>{profile.businessStage || '—'}</b>
          </div>
          <div className="stats-row">
            <small>Çalışan</small>
            <b>{profile.employeeCount || '—'}</b>
          </div>
          <div className="stats-row">
            <small>Hedef</small>
            <b>{profile.primaryGoal || '—'}</b>
          </div>
        </div>
      )}
    </div>
  )
}
