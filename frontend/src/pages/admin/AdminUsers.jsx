import { useState, useEffect, useRef } from 'react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Select, DataTable, Badge, Button, Modal } from '@/components/ui'
import { MoreVertical, Shield, AlertTriangle } from 'lucide-react'
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
      createdAt: u.createdAt || u.created_at
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
        <Badge variant={ROLE_BADGE[row.role] || 'default'}>{ROLE_LABELS[row.role] || row.role}</Badge>
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
    </div>
  )
}
