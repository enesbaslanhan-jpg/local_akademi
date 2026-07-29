import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import Button from '@/components/ui/Button'
import styles from './Settings.module.css'

const emptyProfile = {
  name: '',
  legalName: '',
  sector: '',
  city: '',
  businessStage: '',
  employeeCount: '',
  salesChannels: '',
  primaryGoal: '',
  challenges: '',
  monthlySales: '',
  monthlyExpenses: '',
  cashBalance: '',
  debtBalance: ''
}

const emptyPreferences = {
  timezone: 'Europe/Istanbul',
  locale: 'tr-TR',
  defaultCurrency: 'TRY',
  weekStartsOn: 1
}

function listToText(value) {
  return Array.isArray(value) ? value.join(', ') : ''
}

function textToList(value) {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function numberOrZero(value) {
  return value === '' ? 0 : Number(value)
}

export default function Settings() {
  const { workspaceId } = useParams()
  const { refreshActiveWorkspace } = useWorkspace()
  const [profile, setProfile] = useState(emptyProfile)
  const [preferences, setPreferences] = useState(emptyPreferences)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.workspace.get(workspaceId),
      api.workspace.settings.get(workspaceId)
    ]).then(([workspace, settings]) => {
      setProfile({
        name: workspace.name || '',
        legalName: workspace.legalName || '',
        sector: workspace.sector || '',
        city: workspace.city || '',
        businessStage: workspace.businessStage || '',
        employeeCount: workspace.employeeCount ?? '',
        salesChannels: listToText(workspace.salesChannels),
        primaryGoal: workspace.primaryGoal || '',
        challenges: listToText(workspace.challenges),
        monthlySales: workspace.monthlySales ?? '',
        monthlyExpenses: workspace.monthlyExpenses ?? '',
        cashBalance: workspace.cashBalance ?? '',
        debtBalance: workspace.debtBalance ?? ''
      })
      setPreferences({
        timezone: settings.timezone,
        locale: settings.locale,
        defaultCurrency: settings.defaultCurrency,
        weekStartsOn: settings.weekStartsOn
      })
    }).catch(error => {
      setMsg({ type: 'error', text: error.message || 'İşletme bilgileri yüklenemedi.' })
    }).finally(() => setLoading(false))
  }, [workspaceId])

  async function saveProfile(event) {
    event.preventDefault()
    setSavingProfile(true)
    setMsg(null)
    try {
      await api.workspace.update(workspaceId, {
        name: profile.name.trim(),
        legalName: profile.legalName.trim() || null,
        sector: profile.sector.trim(),
        city: profile.city.trim(),
        businessStage: profile.businessStage || null,
        employeeCount: profile.employeeCount === '' ? null : Number(profile.employeeCount),
        salesChannels: textToList(profile.salesChannels),
        primaryGoal: profile.primaryGoal.trim() || null,
        challenges: textToList(profile.challenges),
        monthlySales: numberOrZero(profile.monthlySales),
        monthlyExpenses: numberOrZero(profile.monthlyExpenses),
        cashBalance: numberOrZero(profile.cashBalance),
        debtBalance: numberOrZero(profile.debtBalance)
      })
      await refreshActiveWorkspace()
      setMsg({ type: 'success', text: 'İşletme bilgileri kaydedildi.' })
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'İşletme bilgileri kaydedilemedi.' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePreferences(event) {
    event.preventDefault()
    setSavingPreferences(true)
    setMsg(null)
    try {
      await api.workspace.settings.update(workspaceId, preferences)
      setMsg({ type: 'success', text: 'Çalışma alanı tercihleri kaydedildi.' })
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'Tercihler kaydedilemedi.' })
    } finally {
      setSavingPreferences(false)
    }
  }

  function setProfileField(field, value) {
    setProfile(current => ({ ...current, [field]: value }))
  }

  if (loading) return <div className={styles.loading}>İşletme bilgileri yükleniyor…</div>

  return (
    <div className={styles.page}>
      {msg && <div className={`${styles.message} ${msg.type === 'success' ? styles.success : styles.error}`}>{msg.text}</div>}

      <form className={styles.card} onSubmit={saveProfile}>
        <div className={styles.heading}>
          <h2>İşletme Profili</h2>
          <p>Mentor önerileri ve işletme takibi bu bilgiler kullanılarak kişiselleştirilir.</p>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>İşletme adı *
            <input required value={profile.name} onChange={event => setProfileField('name', event.target.value)} />
          </label>
          <label className={styles.field}>Resmî unvan
            <input value={profile.legalName} onChange={event => setProfileField('legalName', event.target.value)} />
          </label>
          <label className={styles.field}>Sektör
            <input value={profile.sector} onChange={event => setProfileField('sector', event.target.value)} placeholder="Örn. E-ticaret, tekstil" />
          </label>
          <label className={styles.field}>Şehir
            <input value={profile.city} onChange={event => setProfileField('city', event.target.value)} />
          </label>
          <label className={styles.field}>İşletme aşaması
            <select value={profile.businessStage} onChange={event => setProfileField('businessStage', event.target.value)}>
              <option value="">Seçilmedi</option>
              <option value="idea">Fikir aşaması</option>
              <option value="startup">Yeni kuruldu</option>
              <option value="growth">Büyüme aşaması</option>
              <option value="established">Yerleşik işletme</option>
              <option value="transformation">Dönüşüm aşaması</option>
            </select>
          </label>
          <label className={styles.field}>Çalışan sayısı
            <input type="number" min="0" value={profile.employeeCount} onChange={event => setProfileField('employeeCount', event.target.value)} />
          </label>
        </div>

        <label className={styles.field}>Satış kanalları
          <input value={profile.salesChannels} onChange={event => setProfileField('salesChannels', event.target.value)} placeholder="Mağaza, web sitesi, Trendyol, Instagram" />
          <small>Birden fazla kanalı virgülle ayırın.</small>
        </label>
        <label className={styles.field}>Öncelikli hedef
          <input value={profile.primaryGoal} onChange={event => setProfileField('primaryGoal', event.target.value)} placeholder="Örn. E-ticaret satışlarını artırmak" />
        </label>
        <label className={styles.field}>Temel zorluklar
          <input value={profile.challenges} onChange={event => setProfileField('challenges', event.target.value)} placeholder="Nakit akışı, müşteri bulma, kargo maliyeti" />
          <small>Birden fazla konuyu virgülle ayırın.</small>
        </label>

        <h3 className={styles.subheading}>Finansal özet</h3>
        <div className={styles.grid}>
          <label className={styles.field}>Aylık satış
            <input type="number" min="0" step="0.01" value={profile.monthlySales} onChange={event => setProfileField('monthlySales', event.target.value)} />
          </label>
          <label className={styles.field}>Aylık gider
            <input type="number" min="0" step="0.01" value={profile.monthlyExpenses} onChange={event => setProfileField('monthlyExpenses', event.target.value)} />
          </label>
          <label className={styles.field}>Nakit bakiyesi
            <input type="number" min="0" step="0.01" value={profile.cashBalance} onChange={event => setProfileField('cashBalance', event.target.value)} />
          </label>
          <label className={styles.field}>Borç bakiyesi
            <input type="number" min="0" step="0.01" value={profile.debtBalance} onChange={event => setProfileField('debtBalance', event.target.value)} />
          </label>
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={!profile.name.trim() || savingProfile}>
            {savingProfile ? 'Kaydediliyor...' : 'İşletme Bilgilerini Kaydet'}
          </Button>
        </div>
      </form>

      <form className={styles.card} onSubmit={savePreferences}>
        <div className={styles.heading}>
          <h2>Çalışma Alanı Tercihleri</h2>
          <p>Takvim, para birimi ve bölgesel gösterim ayarları.</p>
        </div>
        <div className={styles.grid}>
          <label className={styles.field}>Saat dilimi
            <select value={preferences.timezone} onChange={event => setPreferences(current => ({ ...current, timezone: event.target.value }))}>
              <option value="Europe/Istanbul">İstanbul (GMT+3)</option>
              <option value="Europe/London">Londra (GMT+0/+1)</option>
              <option value="America/New_York">New York (GMT-5/-4)</option>
            </select>
          </label>
          <label className={styles.field}>Dil / bölge
            <select value={preferences.locale} onChange={event => setPreferences(current => ({ ...current, locale: event.target.value }))}>
              <option value="tr-TR">Türkçe (Türkiye)</option>
              <option value="en-US">English (US)</option>
            </select>
          </label>
          <label className={styles.field}>Para birimi
            <select value={preferences.defaultCurrency} onChange={event => setPreferences(current => ({ ...current, defaultCurrency: event.target.value }))}>
              <option value="TRY">₺ TRY</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>
          </label>
          <label className={styles.field}>Hafta başlangıcı
            <select value={preferences.weekStartsOn} onChange={event => setPreferences(current => ({ ...current, weekStartsOn: Number(event.target.value) }))}>
              <option value={1}>Pazartesi</option>
              <option value={0}>Pazar</option>
            </select>
          </label>
        </div>
        <div className={styles.actions}>
          <Button type="submit" disabled={savingPreferences}>{savingPreferences ? 'Kaydediliyor...' : 'Tercihleri Kaydet'}</Button>
        </div>
      </form>
    </div>
  )
}
