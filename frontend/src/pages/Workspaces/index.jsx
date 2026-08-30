import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useAuth } from '@/context/AuthContext'
import { Plus, Building2, Users, MapPin, Store } from 'lucide-react'
import Button from '@/components/ui/Button'
import DarkPanel from '@/components/ui/DarkPanel'
import styles from './WorkspaceList.module.css'
import { useTranslation } from 'react-i18next'

export default function WorkspaceList() {
  const { t } = useTranslation('workspace')
  const { workspaces, createWorkspace, loading } = useWorkspace()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', sector: '', city: '', currency: 'TRY' })
  const [creating, setCreating] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const ws = await createWorkspace(form)
      setShowCreate(false)
      setForm({ name: '', sector: '', city: '', currency: 'TRY' })
      navigate(`/app/workspaces/${ws.id}/tracker`)
    } catch { }
    finally { setCreating(false) }
  }

  if (loading) return <div className={styles.container}><p>{t('list.loading')}</p></div>

  return (
    <div className={styles.container}>
      {/* Sayfa adı üst barda yazıyor; görünür h1 yerine sr-only başlık. */}
      <h1 className="sr-only">{t('list.title')}</h1>
      {/* data-tour: karsilama turu tutunma noktasi (WelcomeTour.jsx) */}
      <div className={styles.header} data-tour="isletme-baslik">
        <p className={styles.subtitle}>
          {workspaces.length > 0 ? t('list.count', { count: workspaces.length }) : t('list.empty')}
        </p>
        {/* Sayfanın TEK turuncu ana CTA'sı */}
        {workspaces.length > 0 && (
          <div className={styles.headerActions}>
            {/*
              Pazaryeri kısayolu YALNIZ işletme varken.

              🔴 İşletme yokken göstermek ÇIKMAZ SOKAK olurdu:
              entegrasyonlar çalışma alanına bağlı ve panel o durumda
              "önce bir işletme oluşturun" diyor. Boş ekranda bunun
              yerine tek cümlelik bir açıklama var.
            */}
            <Button variant="secondary" onClick={() => navigate('/app/settings?bolum=integrations')}>
              <Store size={17} /> {t('list.connectStore')}
            </Button>
            <Button variant="cta" onClick={() => setShowCreate(true)}><Plus size={18} /> {t('list.newBusiness')}</Button>
          </div>
        )}
      </div>

      {workspaces.length === 0 ? (
        <DarkPanel className={styles.empty} bevel={false} sweep>
          <div className={styles.emptyIcon}><Building2 size={38} /></div>
          <span className={styles.emptyEyebrow}>{t('list.emptyHint')}</span>
          <h2>{t('list.emptyTitle')}</h2>
          <p>{t('list.emptyDesc')}</p>
          <Button variant="cta" onClick={() => setShowCreate(true)}><Plus size={17} /> {t('list.createFirst')}</Button>
          {/* Pazaryeri burada DÜĞME değil, açıklama: bağlantı çalışma
              alanına yazılıyor, işletme olmadan kurulamaz. Düğme koymak
              kullanıcıyı "önce bir işletme oluşturun" ekranına
              göndermek olurdu. */}
          <p className={styles.emptyNot}>
            {t('list.marketplaceNote')}
          </p>
        </DarkPanel>
      ) : (
        <div className={styles.grid}>
          {workspaces.map(ws => (
            <div key={ws.id} className={styles.card} onClick={() => navigate(`/app/workspaces/${ws.id}/tracker`)}>
              <div className={styles.cardInfo}>
                <div className={styles.cardName}>{ws.name}</div>
                <div className={styles.cardMeta}>
                  <span><Users size={14} /> {t('list.memberCount', { count: ws.memberCount })}</span>
                  {ws.sector && <span>{ws.sector}</span>}
                  {ws.city && <span><MapPin size={14} /> {ws.city}</span>}
                  <span className={styles.badge}>{ws.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className={styles.overlay} onClick={() => setShowCreate(false)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <h2>{t('list.createTitle')}</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.field}>
                <label>{t('list.nameLabel')}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={t('list.namePlaceholder')} autoFocus />
              </div>
              <div className={styles.field}>
                <label>{t('list.sector')}</label>
                <input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} placeholder={t('list.sectorPlaceholder')} />
              </div>
              <div className={styles.field}>
                <label>{t('list.city')}</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder={t('list.cityPlaceholder')} />
              </div>
              <div className={styles.actions}>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>{t('common:buttons.cancel')}</Button>
                <Button type="submit" disabled={!form.name.trim() || creating}>{creating ? t('list.creating') : t('list.create')}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
