import { useState, useEffect } from 'react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Select } from '@/components/ui'
import styles from './OnboardingPage.module.css'

const STAGES = [
  { value: 'startup', label: 'Kuruluş / Erken Aşama' },
  { value: 'growth', label: 'Büyüme' },
  { value: 'mature', label: 'Olgun' }
]

const EMPLOYEE_RANGES = [
  { value: '1', label: 'Sadece ben' },
  { value: '3', label: '2-5' },
  { value: '10', label: '6-20' },
  { value: '35', label: '21-50' },
  { value: '51', label: '51+' }
]

const CHANNELS = [
  { value: 'retail_store', label: 'Fiziksel Mağaza' },
  { value: 'ecommerce', label: 'E-Ticaret' },
  { value: 'marketplace', label: 'Pazaryeri (Trendyol, Hepsiburada vb.)' },
  { value: 'other', label: 'Sosyal Medya / Diğer' },
  { value: 'wholesale', label: 'Toptan Satış' },
  { value: 'service', label: 'Hizmet İşletmesi' },
  { value: 'export', label: 'İhracat' }
]

const GOALS = [
  { value: 'increase_sales', label: 'Satışları Artırmak' },
  { value: 'digital_transform', label: 'Dijital Dönüşüm' },
  { value: 'new_markets', label: 'Yeni Pazarlara Açılmak' },
  { value: 'brand_awareness', label: 'Marka Bilinirliği' },
  { value: 'operational', label: 'Operasyonel Verimlilik' },
  { value: 'product_dev', label: 'Ürün Geliştirme' }
]

const CHALLENGES_LIST = [
  { value: 'digital_skills', label: 'Bilgi / Dijital Beceri Eksikliği' },
  { value: 'cash_flow', label: 'Bütçe ve Nakit Akışı' },
  { value: 'employee_finding', label: 'Ekip/Eleman Eksikliği' },
  { value: 'customer_acquisition', label: 'Müşteri Kazanımı' },
  { value: 'competition', label: 'Rekabet' },
  { value: 'regulation', label: 'Mevzuat' },
  { value: 'technology_adoption', label: 'Teknoloji Altyapısı' },
  { value: 'other', label: 'Diğer' }
]

const LEARNING_OPTIONS = [
  { value: '30', label: '30 dk (günde yarım saat)' },
  { value: '60', label: '60 dk (günde 1 saat)' },
  { value: '120', label: '120 dk (günde 2 saat)' },
  { value: '300', label: '5 saat (haftada)' },
  { value: '600', label: '10 saat (haftada)' }
]

export default function OnboardingPage() {
  const { completeOnboarding } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [existing, setExisting] = useState(null)
  const [form, setForm] = useState({
    businessStage: '',
    employeeCount: '',
    salesChannels: [],
    primaryGoal: '',
    challenges: [],
    weeklyLearningMinutes: '60',
    businessName: '',
    sector: '',
    monthlySales: '',
    monthlyExpenses: '',
    description: ''
  })

  useEffect(() => {
    api.onboarding.getProfile().then(data => {
      if (data) {
        setExisting(data)
        setForm(prev => ({
          ...prev,
          businessStage: data.businessStage || '',
          employeeCount: data.employeeCount?.toString() || '',
          salesChannels: data.salesChannels || [],
          primaryGoal: data.primaryGoal || '',
          challenges: data.challenges || [],
          weeklyLearningMinutes: data.weeklyLearningMinutes?.toString() || '60',
          businessName: data.name || '',
          sector: data.sector || '',
          monthlySales: data.monthlySales || '',
          monthlyExpenses: data.monthlyExpenses || ''
        }))
      }
    }).catch(() => {})
  }, [])

  function toggleChannel(value) {
    setForm(prev => ({
      ...prev,
      salesChannels: prev.salesChannels.includes(value)
        ? prev.salesChannels.filter(c => c !== value)
        : [...prev.salesChannels, value]
    }))
  }

  function toggleChallenge(value) {
    setForm(prev => ({
      ...prev,
      challenges: prev.challenges.includes(value)
        ? prev.challenges.filter(c => c !== value)
        : [...prev.challenges, value]
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await api.onboarding.updateProfile({
        name: form.businessName,
        sector: form.sector,
        businessStage: form.businessStage || null,
        employeeCount: form.employeeCount ? Number.parseInt(form.employeeCount, 10) : null,
        salesChannels: form.salesChannels,
        primaryGoal: form.primaryGoal || null,
        challenges: form.challenges,
        weeklyLearningMinutes: parseInt(form.weeklyLearningMinutes) || 60,
        ...(form.monthlySales !== '' && { monthlySales: Number(form.monthlySales) }),
        ...(form.monthlyExpenses !== '' && { monthlyExpenses: Number(form.monthlyExpenses) })
      })
      await completeOnboarding()
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Profil kaydedilemedi. Lütfen bilgileri kontrol edin.')
    } finally {
      setSaving(false)
    }
  }

  const steps = [
    { label: 'İşletme', description: 'İşletmenizin temel bilgileri' },
    { label: 'Kanallar', description: 'Satış kanalları ve ölçek' },
    { label: 'Hedefler', description: 'Öncelikleriniz ve zorluklar' },
    { label: 'Özet', description: 'Bilgilerinizi gözden geçirin' }
  ]

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>İşletme Profili Oluşturun</h1>
        <p className={styles.subtitle}>
          LocalKarar deneyiminizi işletmenize özel hale getirmek için birkaç soru.
        </p>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={() => navigate('/app/dashboard', { replace: true })}>
          Şimdilik Atla ve Uygulamaya Geç
        </button>
      </div>

      <div className={styles.progress}>
        {steps.map((s, i) => (
          <div
            key={i}
            className={`${styles.stepDot} ${i <= step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}
          >
            <div className={styles.stepNumber}>{i < step ? '✓' : i + 1}</div>
            <div className={styles.stepLabel}>
              <span className={styles.stepName}>{s.label}</span>
              <span className={styles.stepDesc}>{s.description}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        {step === 0 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>İşletme Bilgileri</h2>

            <div className={styles.field}>
              <label className={styles.label}>İşletme Adı (isteğe bağlı)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Örn: ABC Teknoloji"
                value={form.businessName}
                onChange={e => setForm(prev => ({ ...prev, businessName: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Sektör (isteğe bağlı)</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Örn: Perakende, Teknoloji, Hizmet"
                value={form.sector}
                onChange={e => setForm(prev => ({ ...prev, sector: e.target.value }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>İşletme Aşaması</label>
              <Select
                className={styles.select}
                aria-label="İşletme Aşaması"
                placeholder="Seçiniz"
                options={STAGES.map(s => ({ value: s.value, label: s.label }))}
                value={form.businessStage}
                onChange={v => setForm(prev => ({ ...prev, businessStage: v }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Çalışan Sayısı</label>
              <Select
                className={styles.select}
                aria-label="Çalışan Sayısı"
                placeholder="Seçiniz"
                options={EMPLOYEE_RANGES.map(r => ({ value: r.value, label: r.label }))}
                value={form.employeeCount}
                onChange={v => setForm(prev => ({ ...prev, employeeCount: v }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Haftalık öğrenmeye ayırabileceğiniz süre</label>
              <Select
                className={styles.select}
                aria-label="Haftalık öğrenmeye ayrılan süre"
                options={LEARNING_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                value={form.weeklyLearningMinutes}
                onChange={v => setForm(prev => ({ ...prev, weeklyLearningMinutes: v }))}
              />
            </div>

            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label className={styles.label}>Kısa Açıklama (isteğe bağlı)</label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="İşletmenizi kısaca tanıtın..."
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Satış Kanalları ve Ölçek</h2>

            <div className={styles.field}>
              <label className={styles.label}>Satış Kanalları (birden fazla seçebilirsiniz)</label>
              <div className={styles.checkboxGroup}>
                {CHANNELS.map(ch => (
                  <label key={ch.value} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.salesChannels.includes(ch.value)}
                      onChange={() => toggleChannel(ch.value)}
                    />
                    <span>{ch.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Aylık Ortalama Ciro (₺, isteğe bağlı)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Örn: 100000"
                  value={form.monthlySales}
                  onChange={e => setForm(prev => ({ ...prev, monthlySales: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Aylık Ortalama Gider (₺, isteğe bağlı)</label>
                <input
                  type="number"
                  className={styles.input}
                  placeholder="Örn: 80000"
                  value={form.monthlyExpenses}
                  onChange={e => setForm(prev => ({ ...prev, monthlyExpenses: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Öncelikleriniz ve Zorluklar</h2>

            <div className={styles.field}>
              <label className={styles.label}>Birincil Hedefiniz</label>
              <Select
                className={styles.select}
                aria-label="Birincil Hedef"
                placeholder="Seçiniz"
                options={GOALS.map(g => ({ value: g.value, label: g.label }))}
                value={form.primaryGoal}
                onChange={v => setForm(prev => ({ ...prev, primaryGoal: v }))}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Karşılaştığınız Zorluklar (birden fazla seçebilirsiniz)</label>
              <div className={styles.checkboxGroup}>
                {CHALLENGES_LIST.map(ch => (
                  <label key={ch.value} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.challenges.includes(ch.value)}
                      onChange={() => toggleChallenge(ch.value)}
                    />
                    <span>{ch.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.stepContent}>
            <h2 className={styles.stepTitle}>Bilgilerinizi Gözden Geçirin</h2>
            <div className={styles.summary}>
              <div className={styles.summaryGroup}>
                <h3>İşletme Bilgileri</h3>
                <p><strong>Ad:</strong> {form.businessName || '—'}</p>
                <p><strong>Sektör:</strong> {form.sector || '—'}</p>
                <p><strong>Aşama:</strong> {STAGES.find(s => s.value === form.businessStage)?.label || '—'}</p>
                <p><strong>Çalışan:</strong> {EMPLOYEE_RANGES.find(r => r.value === form.employeeCount)?.label || '—'}</p>
                <p><strong>Haftalık öğrenme:</strong> {LEARNING_OPTIONS.find(o => o.value === form.weeklyLearningMinutes)?.label || form.weeklyLearningMinutes} dk</p>
              </div>
              <div className={styles.summaryGroup}>
                <h3>Satış Kanalları</h3>
                <p>{form.salesChannels.length ? form.salesChannels.map(c => CHANNELS.find(ch => ch.value === c)?.label).join(', ') : '—'}</p>
                <p><strong>Ciro:</strong> {form.monthlySales ? `${Number(form.monthlySales).toLocaleString()} ₺` : '—'}</p>
                <p><strong>Gider:</strong> {form.monthlyExpenses ? `${Number(form.monthlyExpenses).toLocaleString()} ₺` : '—'}</p>
              </div>
              <div className={styles.summaryGroup}>
                <h3>Hedef ve Zorluklar</h3>
                <p><strong>Hedef:</strong> {GOALS.find(g => g.value === form.primaryGoal)?.label || '—'}</p>
                <p><strong>Zorluklar:</strong> {form.challenges.length ? form.challenges.map(c => CHALLENGES_LIST.find(ch => ch.value === c)?.label).join(', ') : '—'}</p>
              </div>
            </div>
          </div>
        )}

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          {step > 0 && (
            <button className={styles.btnSecondary} onClick={() => setStep(prev => prev - 1)}>
              Geri
            </button>
          )}
          {step < 3 ? (
            <button className={styles.btnPrimary} onClick={() => setStep(prev => prev + 1)}>
              Devam
            </button>
          ) : (
            <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Tamamla ve Başla'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
