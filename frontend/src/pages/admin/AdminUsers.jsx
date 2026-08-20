import { useState, useEffect, useRef } from 'react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Select, DataTable, Badge, Button, Modal } from '@/components/ui'
import { MoreVertical, Shield, AlertTriangle, UserCheck, UserMinus, Trash2 } from 'lucide-react'
import styles from './AdminUsers.module.css'

const ROLE_LABELS = {
  learner: 'Öğrenci',
  content_editor: 'İçerik Editörü',
  subject_expert: 'Konu Uzmanı',
  admin: 'Admin'
}

const ROLE_BADGE = {
  learner: 'default',
  content_editor: 'info',
  subject_expert: 'warning',
  admin: 'danger'
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '-'
  }
}

const VALID_ROLES = Object.keys(ROLE_LABELS)

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const toast = useToast()

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
        toast.success(`${row.email} askıya alındı. Açık oturumları kapatıldı.`)
      } else if (eylem === 'unsuspend') {
        await api.admin.unsuspendUser(row.id)
        toast.success(`${row.email} yeniden aktif.`)
      } else {
        await api.admin.anonymizeUser(row.id)
        toast.success('Hesap anonimleştirildi.')
      }
      setModerationUser(null)
      setModerationReason('')
      fetchUsers()
    } catch (err) {
      toast.error(err.message || 'İşlem tamamlanamadı.')
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
      toast.error('Kendi admin rolünü kaldıramazsın')
      return
    }

    setRoleLoading(true)
    api.admin.updateUserRole(roleChangeUser.id, newRole)
      .then(() => {
        toast.success(`Rol "${ROLE_LABELS[newRole] || newRole}" olarak güncellendi`)
        setUsers(prev => prev.map(u => u.id === roleChangeUser.id ? { ...u, role: newRole } : u))
        setRoleChangeUser(null)
      })
      .catch(err => toast.error(err.message || 'Rol güncellenemedi'))
      .finally(() => setRoleLoading(false))
  }

  const columns = [
    {
      key: 'name',
      label: 'Kullanıcı',
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
      label: 'E-posta',
      sortable: true
    },
    {
      key: 'role',
      label: 'Rol',
      sortable: true,
      render: (row) => (
        <span className={styles.roleCell}>
          <Badge variant={ROLE_BADGE[row.role] || 'default'}>{ROLE_LABELS[row.role] || row.role}</Badge>
          {/* Askı durumu listede görünmeli; yoksa kimin kapalı olduğu
              ancak menü açılınca anlaşılırdı. */}
          {row.anonymized
            ? <Badge variant="default">Anonim</Badge>
            : row.suspendedAt && <Badge variant="danger">Askıda</Badge>}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'Kayıt Tarihi',
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
            aria-label="İşlemler"
            aria-expanded={openDropdownId === row.id}
          >
            <MoreVertical size={18} />
          </button>
          {openDropdownId === row.id && (
            <div className={styles.dropdown} role="menu">
              <button className={styles.dropdownItem} role="menuitem" onClick={() => openRoleModal(row)}>
                <Shield size={16} /> Rol Değiştir
              </button>
              {/* Kendi hesabına uygulanamaz: kendini askıya alan admin
                  sistemden kilitlenir ve geri dönemez. Sunucu da reddediyor,
                  burada da göstermiyoruz. */}
              {row.id !== currentUser?.id && !row.anonymized && (
                row.suspendedAt ? (
                  <button className={styles.dropdownItem} role="menuitem"
                    onClick={() => { setOpenDropdownId(null); setModerationUser({ row, eylem: 'unsuspend' }) }}>
                    <UserCheck size={16} /> Askıyı Kaldır
                  </button>
                ) : (
                  <button className={styles.dropdownItem} role="menuitem"
                    onClick={() => { setOpenDropdownId(null); setModerationReason(''); setModerationUser({ row, eylem: 'suspend' }) }}>
                    <UserMinus size={16} /> Askıya Al
                  </button>
                )
              )}
              {row.id !== currentUser?.id && !row.anonymized && (
                <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} role="menuitem"
                  onClick={() => { setOpenDropdownId(null); setModerationUser({ row, eylem: 'anonymize' }) }}>
                  <Trash2 size={16} /> Hesabı Anonimleştir
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
        <h2>Kullanıcı Yönetimi</h2>
      </div>

      <div className={styles.filters}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <input
            type="search"
            placeholder="Kullanıcı ara..."
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearchSubmit()}
            aria-label="Kullanıcı ara"
          />
        </div>
        <Select
          className={styles.filterSelect}
          aria-label="Rol filtresi"
          placeholder="Tüm Roller"
          options={Object.entries(ROLE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          value={roleFilter}
          onChange={setRoleFilter}
        />
      </div>

      {error && (
        <div className={styles.errorInline}>
          <AlertTriangle size={16} />
          <span>{error} — <button onClick={fetchUsers} style={{ background: 'none', border: 'none', color: 'var(--danger)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}>Tekrar dene</button></span>
        </div>
      )}

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="Kullanıcı bulunamadı"
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
        <Modal open={true} onClose={closeRoleModal} title="Rol Değiştir" size="sm">
          <div className={styles.roleModalBody}>
            <div className={styles.roleModalInfo}>
              <div><b>Kullanıcı:</b> {roleChangeUser.name || roleChangeUser.email}</div>
              <div><b>Mevcut Rol:</b> {ROLE_LABELS[roleChangeUser.role] || roleChangeUser.role}</div>
            </div>

            <Select
              className={styles.roleModalSelect}
              aria-label="Yeni rol seçin"
              options={Object.entries(ROLE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
              value={newRole}
              onChange={setNewRole}
            />

            {isSelfAdminRemoval && (
              <div className={styles.roleModalWarning}>
                <strong>Uyarı:</strong> Kendi admin rolünü kaldıramazsın. Bu işlem için başka bir admin yetkilisine ihtiyacın var.
              </div>
            )}

            <div className={styles.roleModalActions}>
              <Button variant="ghost" onClick={closeRoleModal} disabled={roleLoading}>İptal</Button>
              <Button variant="primary" onClick={handleRoleSave} disabled={isRoleChangeDisabled || isSelfAdminRemoval} loading={roleLoading}>
                {roleLoading ? 'Kaydediliyor...' : 'Kaydet'}
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
            title={anonim ? 'Hesabı Anonimleştir' : askiyaAl ? 'Hesabı Askıya Al' : 'Askıyı Kaldır'}
            size="sm"
          >
            <div className={styles.roleModalBody}>
              <div className={styles.roleModalInfo}>
                <div><b>Kullanıcı:</b> {row.name || row.email}</div>
                <div><b>E-posta:</b> {row.email}</div>
              </div>

              {askiyaAl && (
                <>
                  <p className={styles.moderationNote}>
                    Hesap kapanır ve <b>açık oturumları anında sonlandırılır</b>.
                    Giriş yapamaz. Bu işlem geri alınabilir.
                  </p>
                  <label className={styles.reasonField}>
                    <span>Sebep (denetim kaydına yazılır, isteğe bağlı)</span>
                    <input
                      value={moderationReason}
                      onChange={e => setModerationReason(e.target.value)}
                      maxLength={500}
                      placeholder="Örn. topluluk kurallarının ihlali"
                    />
                  </label>
                </>
              )}

              {eylem === 'unsuspend' && (
                <p className={styles.moderationNote}>
                  Hesap yeniden aktif olur. Kullanıcının <b>yeniden giriş yapması</b>
                  {' '}gerekir; askıdan önceki oturumları geçersiz kalır.
                </p>
              )}

              {anonim && (
                <div className={styles.dangerNote}>
                  <AlertTriangle size={16} />
                  <div>
                    <b>Bu işlem geri alınamaz.</b>
                    <p>
                      E-posta, ad ve profil fotoğrafı kalıcı olarak silinir. Hesap
                      kaydı <b>silinmez</b> — denetim kayıtları, topluluk gönderileri
                      ve yasal saklama yükümlülükleri kayda bağlı olduğu için
                      ilişkiler korunur.
                    </p>
                  </div>
                </div>
              )}

              <div className={styles.roleModalActions}>
                <Button variant="ghost" onClick={() => { setModerationUser(null); setModerationReason('') }}>
                  Vazgeç
                </Button>
                <Button
                  variant={anonim || askiyaAl ? 'danger' : 'primary'}
                  disabled={moderationLoading}
                  onClick={() => moderasyonUygula(row, eylem)}
                >
                  {moderationLoading
                    ? 'İşleniyor…'
                    : anonim ? 'Anonimleştir' : askiyaAl ? 'Askıya Al' : 'Askıyı Kaldır'}
                </Button>
              </div>
            </div>
          </Modal>
        )
      })()}
    </div>
  )
}
