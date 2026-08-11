import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import Button from '@/components/ui/Button'
import { Select } from '@/components/ui'
import styles from './Contacts.module.css'

const emptyContact = { type: 'customer', name: '', legalName: '', contactPerson: '', email: '', phone: '', city: '', address: '', notes: '' }

export default function Contacts() {
  const { workspaceId } = useParams()
  const [contacts, setContacts] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyContact)
  const [saving, setSaving] = useState(false)

  async function loadContacts() {
    const data = await api.workspace.contacts.list(workspaceId)
    setContacts(data)
  }

  useEffect(() => { loadContacts() }, [workspaceId])

  function openCreate() {
    setEditingId(null)
    setForm(emptyContact)
    setShowForm(true)
  }

  function openEdit(c) {
    setEditingId(c.id)
    setForm({ type: c.type, name: c.name, legalName: c.legalName || '', contactPerson: c.contactPerson || '', email: c.email || '', phone: c.phone || '', city: c.city || '', address: c.address || '', notes: c.notes || '' })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await api.workspace.contacts.update(workspaceId, editingId, form)
      } else {
        await api.workspace.contacts.create(workspaceId, form)
      }
      setShowForm(false)
      await loadContacts()
    } catch { }
    finally { setSaving(false) }
  }

  async function handleArchive(contactId) {
    if (!confirm('Bu kişiyi arşivlemek istediğinize emin misiniz?')) return
    await api.workspace.contacts.archive(workspaceId, contactId)
    await loadContacts()
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <h3>Kişiler ({contacts.length})</h3>
        <Button onClick={openCreate}>Yeni Kişi</Button>
      </div>

      {contacts.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 32 }}>Henüz kişi eklenmemiş.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr><th>Ad</th><th>Tür</th><th>E-posta</th><th>Telefon</th><th>Şehir</th><th></th></tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id}>
                <td>
                  <span className={styles.nameCell}>
                    <span className={styles.avatar} aria-hidden="true">
                      {(c.name || '?').trim().charAt(0)}
                    </span>
                    {c.name}
                  </span>
                </td>
                <td><span className={styles.badge}>{c.type}</span></td>
                <td>{c.email || '-'}</td>
                <td>{c.phone || '-'}</td>
                <td>{c.city || '-'}</td>
                <td>
                  <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginRight: 8, fontSize: '0.85rem' }}>Düzenle</button>
                  <button onClick={() => handleArchive(c.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem' }}>Arşivle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className={styles.overlay} onClick={() => setShowForm(false)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <h3>{editingId ? 'Kişiyi Düzenle' : 'Yeni Kişi'}</h3>
            <form onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label>Tür</label>
                <Select aria-label="Tür" options={[{ value: 'customer', label: 'Müşteri' }, { value: 'supplier', label: 'Tedarikçi' }, { value: 'partner', label: 'İş Ortağı' }, { value: 'other', label: 'Diğer' }]} value={form.type} onChange={v => setForm(f => ({ ...f, type: v }))} />
              </div>
              <div className={styles.field}>
                <label>Ad *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className={styles.field}>
                <label>Unvan</label>
                <input value={form.legalName} onChange={e => setForm(f => ({ ...f, legalName: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Yetkili Kişi</label>
                <input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>E-posta</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} type="email" />
              </div>
              <div className={styles.field}>
                <label>Telefon</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Şehir</label>
                <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Adres</label>
                <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <label>Notlar</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className={styles.actions}>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>İptal</Button>
                <Button type="submit" disabled={!form.name.trim() || saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
