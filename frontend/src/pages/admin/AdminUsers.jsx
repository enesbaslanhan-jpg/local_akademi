import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Select, DataTable, Badge, Button, Modal } from '@/components/ui'
import { MoreVertical, Shield, AlertTriangle, UserCheck, UserMinus, Trash2 } from 'lucide-react'
import styles from './AdminUsers.module.css'
import { getFormatLocale } from '@/utils/formatters'

const ROLE_KEYS = ['learner', 'content_editor', 'subject_expert', 'admin']

const ROLE_BADGE = {
  learner: 'default',
  content_editor: 'info',
  subject_expert: 'warning',
  admin: 'danger'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString(getFormatLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '-'
  }
}

const VALID_ROLES = ROLE_KEYS

export default function AdminUsers() {
  const { t } = useTranslation('admin')
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const roleLabel = (role) => t(`users.roles.${role}`) || role

  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [roleChangeUser, setRoleChangeUser] = useState(null)
  /* `{ row, eylem }` — onay kutusu açıkken dolu. */
  const [moderationUser, setModerationUser] = useState(null)
  const [moderationReason, setModerationReason] = useState('')
  const [moderationLoading, setModerationLoading] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [roleLoading, setRoleLoading] = useState(false)

  const searchTimerRef = useRef(null)

  const handleSearchChange = (val) => {
    setSearchInput(val)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setSearch(val), 350)
  }

  const handleSearchSubmit = () => setSearch(searchInput)

  function normalizeUsers(raw) {
    if (Array.isArray(raw)) {
      return { users: raw.map(normalizeUser), total: raw.length }
    }
    const list = (raw.users || []).map(normalizeUser)
    return {
      users: list,
      total: raw.total ?? list.length,
      adminCount: raw.adminCount
    }
  }

  function normalizeUser(u) {
    return {
      id: u.id,
      email: u.email,
      name: u.name || u.display_name,
      role: u.role,
      createdAt: u.createdAt || u.created_at,
      suspendedAt: u.suspendedAt || null,
      anonymized: Boolean(u.anonymized)
    }
  }

  /*
   * Askıya alma / askıyı kaldırma / anonimleştirme.
   *
   * Kalıcı silme YOK: denetim kayıtları, topluluk gönderileri ve yasal
   * saklama yükümlülükleri kaydın kendisine bağlı. "Sil" isteği
   * anonimleştirmeyle karşılanıyor — kişisel alanlar temizlenir, ilişkiler
   * ayakta kalır. Bu yüzden onay metni de bunu açıkça söylüyor.
   */
  async function moderasyonUygula(row, eylem) {
    if (moderationLoading) return
    setModerationLoading(true)
    try {
      if (eylem === 'suspend') {
        await api.admin.suspendUser(row.id, moderationReason.trim())
        toast.success(t('users.toasts.suspended', { email: row.email }))
      } else if (eylem === 'unsuspend') {
        await api.admin.unsuspendUser(row.id)
        toast.success(t('users.toasts.unsuspended', { email: row.email }))
      } else {
        await api.admin.anonymizeUser(row.id)
        toast.success(t('users.toasts.anonymized'))
      }
      setModerationUser(null)
      setModerationReason('')
      fetchUsers()
    } catch (err) {
      toast.error(err.message || t('users.toasts.actionFailed'))
    } finally {
      setModerationLoading(false)
    }
  }

  const fetchUsers = () => {
    setLoading(true)
    setError('')
    api.admin.listUsers({ search, role: roleFilter, sortBy, sortOrder: sortDir, page, limit: pageSize })
      .then(raw => {
        const { users: normalized, total: t, adminCount: ac } = normalizeUsers(raw)
        setUsers(normalized)
        setTotal(t)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [search, roleFilter, sortBy, sortDir, page])

  useEffect(() => { setPage(1) }, [search, roleFilter])

  useEffect(() => {
    if (!openDropdownId) return
    const handler = (e) => {
      if (!e.target.closest(`.${styles.actionBtn}`) && !e.target.closest(`.${styles.dropdown}`)) {
        setOpenDropdownId(null)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openDropdownId])

  function handleSort(key) {
    if (sortBy === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortBy(key); setSortDir('asc') }
  }

  function handleActionClick(e, userId) {
    e.stopPropagation()
    setOpenDropdownId(prev => prev === userId ? null : userId)
  }

  function openRoleModal(user) {
    setRoleChangeUser(user)
    setNewRole(user.role)
    setOpenDropdownId(null)
  }

  function closeRoleModal() {
    if (roleLoading) return
    setRoleChangeUser(null)
  }

  function handleRoleSave() {
    if (!roleChangeUser || newRole === roleChangeUser.role) return

    if (roleChangeUser.id === currentUser?.id && roleChangeUser.role === 'admin' && newRole !== 'admin') {
      toast.error(t('users.toasts.selfRoleRemove'))
      return
    }

    setRoleLoading(true)
    api.admin.updateUserRole(roleChangeUser.id, newRole)
      .then(() => {
        toast.success(t('users.toasts.roleUpdated', { role: roleLabel(newRole) }))
        setUsers(prev => prev.map(u => u.id === roleChangeUser.id ? { ...u, role: newRole } : u))
        setRoleChangeUser(null)
      })
      .catch(err => toast.error(err.message || t('users.toasts.roleUpdateFailed')))
      .finally(() => setRoleLoading(false))
  }

  const columns = [
    {
      key: 'name',
      label: t('users.table.user'),
      sortable: true,
      render: (row) => (
        <div className={styles.nameCell}>
          <span className={styles.avatar}>{(row.name || row.email || '?')[0].toUpperCase()}</span>
          <span>{row.name || row.email || '-'}</span>
        </div>
      )
    },
    {
      key: 'email',
      label: t('users.table.email'),
      sortable: true
    },
    {
      key: 'role',
      label: t('users.table.role'),
      sortable: true,
      render: (row) => (
        <span className={styles.roleCell}>
          <Badge variant={ROLE_BADGE[row.role] || 'default'}>{roleLabel(row.role)}</Badge>
          {/* Askı durumu listede görünmeli; yoksa kimin kapalı olduğu
              ancak menü açılınca anlaşılırdı. */}
          {row.anonymized
            ? <Badge variant="default">{t('users.table.anonymous')}</Badge>
            : row.suspendedAt && <Badge variant="danger">{t('users.table.suspended')}</Badge>}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: t('users.table.created'),
      sortable: true,
      render: (row) => formatDate(row.createdAt)
    },
    {
      key: 'actions',
      label: '',
      width: '60px',
      render: (row) => (
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            className={styles.actionBtn}
            onClick={(e) => handleActionClick(e, row.id)}
            aria-label={t('users.table.actions')}
            aria-expanded={openDropdownId === row.id}
          >
            <MoreVertical size={18} />
          </button>
          {openDropdownId === row.id && (
            <div className={styles.dropdown} role="menu">
              <button className={styles.dropdownItem} role="menuitem" onClick={() => openRoleModal(row)}>
                <Shield size={16} /> {t('users.menu.changeRole')}
              </button>
              {/* Kendi hesabına uygulanamaz: kendini askıya alan admin
                  sistemden kilitlenir ve geri dönemez. Sunucu da reddediyor,
                  burada da göstermiyoruz. */}
              {row.id !== currentUser?.id && !row.anonymized && (
                row.suspendedAt ? (
                  <button className={styles.dropdownItem} role="menuitem"
                    onClick={() => { setOpenDropdownId(null); setModerationUser({ row, eylem: 'unsuspend' }) }}>
                    <UserCheck size={16} /> {t('users.menu.unsuspend')}
                  </button>
                ) : (
                  <button className={styles.dropdownItem} role="menuitem"
                    onClick={() => { setOpenDropdownId(null); setModerationReason(''); setModerationUser({ row, eylem: 'suspend' }) }}>
                    <UserMinus size={16} /> {t('users.menu.suspend')}
                  </button>
                )
              )}
              {row.id !== currentUser?.id && !row.anonymized && (
                <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} role="menuitem"
                  onClick={() => { setOpenDropdownId(null); setModerationUser({ row, eylem: 'anonymize' }) }}>
                  <Trash2 size={16} /> {t('users.menu.anonymize')}
                </button>
              )}
            </div>
          )}
        </div>
      )
    }
  ]

  const isRoleChangeDisabled = roleLoading || (roleChangeUser && newRole === roleChangeUser.role)
  const isSelfAdminRemoval = roleChangeUser?.id === currentUser?.id && roleChangeUser?.role === 'admin' && newRole !== 'admin'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>{t('users.heading')}</h2>
      </div>

      <div className={styles.filters}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <input
            type="search"
            placeholder={t('users.searchPlaceholder')}
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
            aria-label={t('users.searchAria')}
          />
        </div>
        <Select
          className={styles.filterSelect}
          aria-label={t('users.table.role')}
          placeholder={t('users.roleFilter')}
          options={ROLE_KEYS.map(k => ({ value: k, label: roleLabel(k) }))}
          value={roleFilter}
          onChange={setRoleFilter}
        />
      </div>

      {error && (
        <div className={styles.errorInline}>
          <AlertTriangle size={16} />
          <span>{error} — <button onClick={fetchUsers} style={{ background: 'none', border: 'none', color: 'var(--danger)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>{t('users.retry')}</button></span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage={t('users.emptyMessage')}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onSort={handleSort}
        sortKey={sortBy}
        sortDir={sortDir}
        keyField="id"
      />

      {roleChangeUser && (
        <Modal open={true} onClose={closeRoleModal} title={t('users.roleModal.title')} size="sm">
          <div className={styles.roleModalBody}>
            <div className={styles.roleModalInfo}>
              <div><b>{t('users.roleModal.userLabel')}</b> {roleChangeUser.name || roleChangeUser.email}</div>
              <div><b>{t('users.roleModal.currentRole')}</b> {roleLabel(roleChangeUser.role)}</div>
            </div>

            <Select
              className={styles.roleModalSelect}
              aria-label={t('users.roleModal.selectNewAria')}
              options={ROLE_KEYS.map(k => ({ value: k, label: roleLabel(k) }))}
              value={newRole}
              onChange={setNewRole}
            />

            {isSelfAdminRemoval && (
              <div className={styles.roleModalWarning}>
                <strong>{t('users.roleModal.warningHeader')}</strong> {t('users.roleModal.warningSelf')}
              </div>
            )}

            <div className={styles.roleModalActions}>
              <Button variant="ghost" onClick={closeRoleModal} disabled={roleLoading}>{t('users.roleModal.cancel')}</Button>
              <Button variant="primary" onClick={handleRoleSave} disabled={isRoleChangeDisabled || isSelfAdminRemoval} loading={roleLoading}>
                {roleLoading ? t('users.roleModal.saving') : t('users.roleModal.save')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {moderationUser && (() => {
        const { row, eylem } = moderationUser
        const anonim = eylem === 'anonymize'
        const askiyaAl = eylem === 'suspend'
        return (
          <Modal
            open={true}
            onClose={() => { setModerationUser(null); setModerationReason('') }}
            title={anonim ? t('users.actionModals.anonymizeTitle') : askiyaAl ? t('users.actionModals.suspendTitle') : t('users.actionModals.unsuspendTitle')}
            size="sm"
          >
            <div className={styles.roleModalBody}>
              <div className={styles.roleModalInfo}>
                <div><b>{t('users.actionModals.userLabel')}</b> {row.name || row.email}</div>
                <div><b>{t('users.actionModals.emailLabel')}</b> {row.email}</div>
              </div>

              {askiyaAl && (
                <>
                  <p className={styles.moderationNote}>
                    {t('users.actionModals.suspendDescription')}
                  </p>
                  <label className={styles.reasonField}>
                    <span>{t('users.actionModals.reasonLabel')}</span>
                    <input
                      value={moderationReason}
                      onChange={e => setModerationReason(e.target.value)}
                      maxLength={500}
                      placeholder={t('users.actionModals.reasonPlaceholder')}
                    />
                  </label>
                </>
              )}

              {eylem === 'unsuspend' && (
                  <p className={styles.moderationNote}>
                    {t('users.actionModals.unsuspendDescription')}
                  </p>
              )}

              {anonim && (
                <div className={styles.dangerNote}>
                  <AlertTriangle size={16} />
                  <div>
                    <b>{t('users.actionModals.anonymizeIrreversible')}</b>
                    <p>
                      {t('users.actionModals.anonymizeDescription')}
                    </p>
                  </div>
                </div>
              )}

              <div className={styles.roleModalActions}>
                <Button variant="ghost" onClick={() => { setModerationUser(null); setModerationReason('') }}>
                  {t('users.actionModals.cancel')}
                </Button>
                <Button
                  variant={anonim || askiyaAl ? 'danger' : 'primary'}
                  disabled={moderationLoading}
                  onClick={() => moderasyonUygula(row, eylem)}
                >
                  {moderationLoading
                    ? t('users.actionModals.processing')
                    : anonim ? t('users.actionModals.confirmAnonymize') : askiyaAl ? t('users.actionModals.confirmSuspend') : t('users.actionModals.confirmUnsuspend')}
                </Button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
