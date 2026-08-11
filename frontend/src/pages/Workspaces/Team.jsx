import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui'
import styles from './Team.module.css'

export default function Team() {
  const { workspaceId } = useParams()
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'staff' })
  const [sending, setSending] = useState(false)
  const [inviteToken, setInviteToken] = useState(null)

  async function loadData() {
    const [m, i] = await Promise.all([
      api.workspace.members.list(workspaceId),
      api.workspace.invitations.list(workspaceId)
    ])
    setMembers(m)
    setInvitations(i.filter(inv => inv.status === 'pending'))
  }

  useEffect(() => { loadData() }, [workspaceId])

  async function handleInvite(e) {
    e.preventDefault()
    setSending(true)
    setInviteToken(null)
    try {
      const result = await api.workspace.invitations.create(workspaceId, inviteForm)
      setInviteToken(result.token)
      setInviteForm({ email: '', role: 'staff' })
      await loadData()
    } catch { }
    finally { setSending(false) }
  }

  async function handleRoleChange(memberId, role) {
    await api.workspace.members.updateRole(workspaceId, memberId, role)
    await loadData()
  }

  async function handleRemoveMember(memberId) {
    if (!confirm('Bu üyeyi çıkarmak istediğinize emin misiniz?')) return
    await api.workspace.members.remove(workspaceId, memberId)
    await loadData()
  }

  async function handleCancelInvitation(invitationId) {
    await api.workspace.invitations.cancel(workspaceId, invitationId)
    await loadData()
  }

  return (
    <div>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3>Ekip Üyeleri ({members.length})</h3>
          <Button onClick={() => setShowInvite(true)}>Davet Et</Button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr><th>Ad</th><th>E-posta</th><th>Rol</th><th>Durum</th><th></th></tr>
          </thead>
          <tbody>
            {members.map(m => (
              <tr key={m.id}>
                <td>
                  <span className={styles.nameCell}>
                    <span className={styles.avatar} aria-hidden="true">
                      {(m.name || m.email || '?').trim().charAt(0)}
                    </span>
                    {m.name}
                  </span>
                </td>
                <td>{m.email}</td>
                <td>
                  <Select className={styles.select} aria-label="Rol" options={[{ value: 'owner', label: 'Sahip' }, { value: 'admin', label: 'Yönetici' }, { value: 'staff', label: 'Personel' }, { value: 'viewer', label: 'İzleyici' }]} value={m.role} onChange={v => handleRoleChange(m.id, v)} />
                </td>
                <td><span className={styles.badge}>{m.status}</span></td>
                <td>
                  {m.role !== 'owner' && (
                    <button onClick={() => handleRemoveMember(m.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}>Çıkar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invitations.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>Bekleyen Davetler ({invitations.length})</h3>
          </div>
          <table className={styles.table}>
            <thead><tr><th>E-posta</th><th>Rol</th><th></th></tr></thead>
            <tbody>
              {invitations.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.email}</td>
                  <td>{inv.role}</td>
                  <td><button onClick={() => handleCancelInvitation(inv.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}>İptal</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <div className={styles.overlay} onClick={() => { setShowInvite(false); setInviteToken(null) }}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <h3>Ekip Üyesi Davet Et</h3>
            {inviteToken ? (
              <div>
                <p style={{ marginBottom: 12 }}>Davet bağlantısı oluşturuldu. (Geliştirme aşamasında e-posta gönderimi yerine token gösteriliyor)</p>
                <div className={styles.field}>
                  <label>Davet Kodu</label>
                  <input value={inviteToken} readOnly onClick={e => e.target.select()} />
                </div>
                <div className={styles.actions}>
                  <Button onClick={() => { setShowInvite(false); setInviteToken(null) }}>Kapat</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite}>
                <div className={styles.field}>
                  <label>E-posta</label>
                  <input value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} type="email" required placeholder="ornek@email.com" />
                </div>
                <div className={styles.field}>
                  <label>Rol</label>
                  <Select aria-label="Rol" options={[{ value: 'admin', label: 'Yönetici' }, { value: 'staff', label: 'Personel' }, { value: 'viewer', label: 'İzleyici' }]} value={inviteForm.role} onChange={v => setInviteForm(f => ({ ...f, role: v }))} />
                </div>
                <div className={styles.actions}>
                  <Button type="button" variant="secondary" onClick={() => setShowInvite(false)}>İptal</Button>
                  <Button type="submit" disabled={!inviteForm.email || sending}>{sending ? 'Gönderiliyor...' : 'Davet Et'}</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
