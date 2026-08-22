import { useEffect, useState } from 'react'
import { Ban, MessageCircle, Plus, Search, Send, UserPlus } from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import styles from './CommunitySocialPage.module.css'

export default function CommunitySocialPage({ mode }) {
  const { user } = useAuth()
  const [people, setPeople] = useState([]), [following, setFollowing] = useState([]), [blocked, setBlocked] = useState([])
  const [threads, setThreads] = useState([]), [active, setActive] = useState(null), [messages, setMessages] = useState([])
  const [query, setQuery] = useState(''), [body, setBody] = useState(''), [error, setError] = useState('')

  async function loadPeople() { const r = await api.community.people(query); setPeople(r.people || []); setFollowing(r.followingIds || []); setBlocked(r.blockedIds || []) }
  async function loadThreads() { const r = await api.community.threads(); setThreads(r.threads || []) }
  useEffect(() => { (mode === 'people' ? loadPeople() : loadThreads()).catch(e => setError(e.message)) }, [mode])
  useEffect(() => { if (active) api.community.messages(active.id).then(r => setMessages(r.messages || [])).catch(e => setError(e.message)) }, [active])

  async function toggle(person, kind) {
    const list = kind === 'follow' ? following : blocked, on = !list.includes(person.id)
    await (kind === 'follow' ? api.community.follow(person.id, on) : api.community.block(person.id, on)); await loadPeople()
  }
  async function newThread(group = false) {
    const directory = await api.community.people(); setPeople(directory.people || [])
    const raw = window.prompt(group ? 'Grup adı ve üyeler (Örnek: Esnaf Grubu | Ayşe Kaya, Mehmet Demir)' : 'Sohbet edilecek kişinin tam adı')
    if (!raw) return
    const [name, namesText] = group ? raw.split('|') : ['', raw]
    const names = namesText.split(',').map(value => value.trim().toLocaleLowerCase('tr-TR')).filter(Boolean)
    const ids = (directory.people || []).filter(person => names.includes(person.name.toLocaleLowerCase('tr-TR'))).map(person => person.id)
    if (!ids.length || ids.length !== names.length) { setError('Yazdığın adlardan biri bulunamadı. Tam görünen adı kullan.'); return }
    const r = await api.community.createThread({ ...(name.trim() ? { name: name.trim() } : {}), memberIds: ids }); await loadThreads(); setActive(r.thread)
  }
  async function send(event) { event.preventDefault(); if (!body.trim()) return; await api.community.sendMessage(active.id, body); setBody(''); const r = await api.community.messages(active.id); setMessages(r.messages || []) }

  if (mode === 'people') return <main className={styles.page}><header><h1>Topluluk kişileri</h1><p>Takip ettiklerini ve engellediğin hesapları yönet.</p></header>{error && <p className={styles.error}>{error}</p>}<label className={styles.search}><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Kişi ara"/><Button onClick={loadPeople}>Ara</Button></label><div className={styles.people}>{people.map(p => <article key={p.id}><span>{p.name}</span><small>{p.role}</small><div><button onClick={() => toggle(p, 'follow')} disabled={blocked.includes(p.id)}><UserPlus size={16}/>{following.includes(p.id) ? 'Takibi bırak' : 'Takip et'}</button><button onClick={() => toggle(p, 'block')}><Ban size={16}/>{blocked.includes(p.id) ? 'Engeli kaldır' : 'Engelle'}</button></div></article>)}</div></main>

  return <main className={styles.page}><header><div><h1>Sohbetler</h1><p>Birebir konuş veya çalışma grubu oluştur.</p></div><span><Button variant="secondary" onClick={() => newThread(false)}><MessageCircle size={16}/> Yeni sohbet</Button><Button onClick={() => newThread(true)}><Plus size={16}/> Grup oluştur</Button></span></header>{error && <p className={styles.error}>{error}</p>}<div className={styles.chat}><aside>{threads.map(t => <button key={t.id} onClick={() => setActive(t)} className={active?.id === t.id ? styles.active : ''}><strong>{t.name || t.members.filter(m => m.user.id !== user.id).map(m => m.user.name).join(', ')}</strong><small>{t.messages?.[0]?.body || 'Henüz mesaj yok'}</small></button>)}</aside><section>{!active ? <p>Bir sohbet seç.</p> : <><div className={styles.messages}>{messages.map(m => <div key={m.id} className={m.senderId === user.id ? styles.mine : ''}><strong>{m.sender?.name}</strong><p>{m.body}</p></div>)}</div><form onSubmit={send}><input value={body} onChange={e => setBody(e.target.value)} placeholder="Mesaj yaz…" maxLength={2000}/><Button type="submit" disabled={!body.trim()}><Send size={16}/></Button></form></>}</section></div></main>
}
