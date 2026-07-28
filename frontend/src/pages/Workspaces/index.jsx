import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useAuth } from '@/context/AuthContext'
import { Plus, Building2, Users, MapPin } from 'lucide-react'
import Button from '@/components/ui/Button'
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
      navigate(`/app/workspaces/${ws.id}/overview`)
    } catch { }
    finally { setCreating(false) }
  }

  if (loading) return <div className={styles.container}><p>Yükleniyor...</p></div>

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>İşletmelerim</h1>
        <Button onClick={() => setShowCreate(true)}><Plus size={18} /> Yeni İşletme</Button>
      </div>

      {workspaces.length === 0 ? (
        <div className={styles.empty}>
          <Building2 size={48} />
          <p>Henüz bir işletme kaydınız bulunmuyor.</p>
          <Button onClick={() => setShowCreate(true)}>İlk İşletmeyi Oluştur</Button>
        </div>
      ) : (
        <div className={styles.grid}>
          {workspaces.map(ws => (
            <div key={ws.id} className={styles.card} onClick={() => navigate(`/app/workspaces/${ws.id}/overview`)}>
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
