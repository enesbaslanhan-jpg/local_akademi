import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui'
import styles from './Team.module.css'
import { useTranslation } from 'react-i18next'

export default function Team() {
  const { t } = useTranslation('workspace')
  const roleOptions = ['owner', 'admin', 'staff', 'viewer'].map(value => ({ value, label: t(`team.role.${value}`) }))
  const { workspaceId } = useParams()
  const [members, setMembers] = useState([])
  const [invitations, setInvitations] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'staff' })
  const [sending, setSending] = useState(false)
  /* Token artik gosterilmiyor: yalniz e-postayla gidiyor. Burada
     tutulan sey, davetin HANGI ADRESE gonderildigi. */
  const [inviteSent, setInviteSent] = useState(null)
  const [inviteError, setInviteError] = useState('')

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
    setInviteSent(null)
    setInviteError('')
    try {
      const result = await api.workspace.invitations.create(workspaceId, inviteForm)
      setInviteSent(result.email || inviteForm.email)
      setInviteForm({ email: '', role: 'staff' })
      await loadData()
    } catch (err) {
      /* Onceden hata SESSIZCE yutuluyordu (`catch { }`): davet
         gonderilemese bile ekranda hicbir sey olmuyordu. Posta
         gonderimi eklendigi icin artik gercek bir basarisizlik yolu
         da var (sunucu 502 donuyor), gizlenmesi kabul edilemez. */
      setInviteError(err.message || t('team.inviteFailed'))
    }
    finally { setSending(false) }
  }

  async function handleRoleChange(memberId, role) {
    await api.workspace.members.updateRole(workspaceId, memberId, role)
    await loadData()
  }

  async function handleRemoveMember(memberId) {
    if (!confirm(t('team.confirmRemove'))) return
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
          <h3>{t('team.title')} ({members.length})</h3>
          <Button onClick={() => setShowInvite(true)}>{t('team.invite')}</Button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr><th>{t('team.col.name')}</th><th>{t('team.col.email')}</th><th>{t('team.col.role')}</th><th>{t('team.col.status')}</th><th></th></tr>
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
                  <Select className={styles.select} aria-label={t('team.col.role')} options={roleOptions} value={m.role} onChange={v => handleRoleChange(m.id, v)} />
                </td>
                <td><span className={styles.badge}>{m.status}</span></td>
                <td>
                  {m.role !== 'owner' && (
                    <button onClick={() => handleRemoveMember(m.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}>{t('team.remove')}</button>
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
            <h3>{t('team.pendingInvitations')} ({invitations.length})</h3>
          </div>
          <table className={styles.table}>
            <thead><tr><th>{t('team.col.email')}</th><th>{t('team.col.role')}</th><th></th></tr></thead>
            <tbody>
              {invitations.map(inv => (
                <tr key={inv.id}>
                  <td>{inv.email}</td>
                  <td>{inv.role}</td>
                  <td><button onClick={() => handleCancelInvitation(inv.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}>{t('common:buttons.cancel')}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <div className={styles.overlay} onClick={() => { setShowInvite(false); setInviteSent(null); setInviteError('') }}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <h3>{t('team.inviteTitle')}</h3>
            {inviteSent ? (
              <div>
                <p style={{ marginBottom: 12 }}>
                  {t('team.inviteSentMessage', { email: inviteSent })}
                </p>
                <div className={styles.actions}>
                  <Button onClick={() => { setShowInvite(false); setInviteSent(null) }}>{t('common:buttons.close')}</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite}>
                <div className={styles.field}>
                  <label>{t('team.col.email')}</label>
                  <input value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} type="email" required placeholder="ornek@email.com" />
                </div>
                <div className={styles.field}>
                  <label>{t('team.col.role')}</label>
                  <Select aria-label={t('team.col.role')} options={roleOptions.filter(option => option.value !== 'owner')} value={inviteForm.role} onChange={v => setInviteForm(f => ({ ...f, role: v }))} />
                </div>
                {inviteError && <p role="alert" style={{ color: 'var(--danger)', fontSize: '0.82rem', margin: '0 0 10px' }}>{inviteError}</p>}
                <div className={styles.actions}>
                  <Button type="button" variant="secondary" onClick={() => setShowInvite(false)}>{t('common:buttons.cancel')}</Button>
                  <Button type="submit" disabled={!inviteForm.email || sending}>{sending ? t('team.sending') : t('team.invite')}</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
