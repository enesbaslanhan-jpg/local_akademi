import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useAuth } from '@/context/AuthContext'
import { Plus, Building2, Users, MapPin } from 'lucide-react'
import Button from '@/components/ui/Button'
import DarkPanel from '@/components/ui/DarkPanel'
import styles from './WorkspaceList.module.css'

export default function WorkspaceList() {
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

  if (loading) return <div className={styles.container}><p>Yükleniyor...</p></div>

  return (
    <div className={styles.container}>
      {/* Sayfa adı üst barda yazıyor; görünür h1 yerine sr-only başlık. */}
      <h1 className="sr-only">İşletmelerim</h1>
      <div className={styles.header}>
        <p className={styles.subtitle}>
          {workspaces.length > 0 ? `${workspaces.length} işletme` : 'Henüz işletme yok'}
        </p>
        {/* Sayfanın TEK turuncu ana CTA'sı */}
        {workspaces.length > 0 && <Button variant="cta" onClick={() => setShowCreate(true)}><Plus size={18} /> Yeni İşletme</Button>}
      </div>

      {workspaces.length === 0 ? (
        <DarkPanel className={styles.empty} bevel={false} sweep>
          <div className={styles.emptyIcon}><Building2 size={38} /></div>
          <span className={styles.emptyEyebrow}>İşletme Kontrol Merkezi</span>
          <h2>İşletmenin bugünkü durumunu tek ekranda gör</h2>
          <p>Ödeme, tahsilat, görev ve yaklaşan işlemleri gerçek kayıtlarınla takip etmeye başla.</p>
          <Button variant="cta" onClick={() => setShowCreate(true)}><Plus size={17} /> İlk İşletmeyi Oluştur</Button>
        </DarkPanel>
      ) : (
        <div className={styles.grid}>
          {workspaces.map(ws => (
            <div key={ws.id} className={styles.card} onClick={() => navigate(`/app/workspaces/${ws.id}/tracker`)}>
              <div className={styles.cardInfo}>
                <div className={styles.cardName}>{ws.name}</div>
                <div className={styles.cardMeta}>
                  <span><Users size={14} /> {ws.memberCount} üye</span>
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
            <h2>Yeni İşletme</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.field}>
                <label>İşletme Adı *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: ABC Tekstil" autoFocus />
              </div>
              <div className={styles.field}>
                <label>Sektör</label>
                <input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} placeholder="Örn: Tekstil" />
              </div>
              <div className={styles.field}>
                <label>Şehir</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Örn: İstanbul" />
              </div>
              <div className={styles.actions}>
                <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>İptal</Button>
                <Button type="submit" disabled={!form.name.trim() || creating}>{creating ? 'Oluşturuluyor...' : 'Oluştur'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
