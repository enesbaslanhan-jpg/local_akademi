import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, FilePenLine, Flag, Newspaper, RefreshCw, Users } from 'lucide-react'
import { api } from '@/services/api'
import { Button, EmptyState } from '@/components/ui'
import styles from './AdminCommunity.module.css'

const TABS = [
  ['news', 'Haberler', Newspaper],
  ['community', 'Topluluk', Users],
  ['reports', 'Şikâyetler', Flag],
]

export default function AdminCommunity() {
  const [tab, setTab] = useState('news')
  const [data, setData] = useState({ moderation: [], reports: [], news: [], community: [], automatedNews: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [reasons, setReasons] = useState({})
  const [form, setForm] = useState({ title: '', summary: '', sourceTitle: '', sourceUrl: '', sourcePublishedAt: '' })
  const [formMessage, setFormMessage] = useState('')

  function load() {
    setLoading(true)
    setError('')
    Promise.all([
      api.community.moderation(),
      api.community.reports(),
      api.community.list('official'),
      api.community.list('user'),
      api.news.list({ limit: 50 }),
    ]).then(([moderation, reports, news, community, automatedNews]) => setData({
      moderation: moderation.posts || [], reports: reports.reports || [],
      news: news.posts || [], community: community.posts || [], automatedNews: automatedNews.items || [],
    })).catch(err => setError(err.message || 'Yönetim verileri alınamadı.')).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const pending = useMemo(() => data.moderation.filter(post => tab === 'news' ? post.postType === 'official' : post.postType === 'user'), [data.moderation, tab])
  const published = tab === 'news' ? data.news : data.community

  async function moderate(post, action) {
    const reason = reasons[post.id]?.trim() || ''
    if (action === 'reject' && !reason) return setError('Reddetmek için moderasyon nedeni yazın.')
    setBusy(post.id); setError('')
    try { await api.community.moderate(post.id, action, reason || undefined); load() }
    catch (err) { setError(err.message || 'Moderasyon işlemi tamamlanamadı.') }
    finally { setBusy('') }
  }

  /*
   * YAYINDAN KALDIRMA.
   *
   * Bu ekran "backend'de böyle bir uç yok" diyordu ve eylem
   * göstermiyordu. Not ESKİYDİ: `DELETE /community/:postId` 22.08.2026'da
   * eklendi (yazar kendi gönderisini, yönetici her gönderiyi
   * kaldırabilir) ve testleri var. Ekran var olan yeteneği
   * kullanmıyordu.
   *
   * Kaldırma GERÇEK SİLME değil, durum değişikliği: şikâyet kayıtları
   * gönderiye bağlı ve "kim neyi ne zaman kaldırdı" izi duruyor.
   */
  async function kaldir(post) {
    if (!window.confirm(`"${post.title || 'Bu paylaşım'}" yayından kaldırılsın mı?`)) return
    setBusy(post.id); setError('')
    try { await api.community.remove(post.id); load() }
    catch (err) { setError(err.message || 'Paylaşım kaldırılamadı.') }
    finally { setBusy('') }
  }

  async function resolveReport(report, action) {
    setBusy(report.id); setError('')
    try { await api.community.resolveReport(report.id, action, reasons[report.id]?.trim() || undefined); load() }
    catch (err) { setError(err.message || 'Şikâyet işlenemedi.') }
    finally { setBusy('') }
  }

  async function createNews(event) {
    event.preventDefault(); setBusy('create'); setFormMessage(''); setError('')
    try {
      await api.community.createOfficial({
        title: form.title, summary: form.summary, sourceTitle: form.sourceTitle, sourceUrl: form.sourceUrl,
        ...(form.sourcePublishedAt ? { sourcePublishedAt: new Date(form.sourcePublishedAt).toISOString() } : {}),
      })
      setForm({ title: '', summary: '', sourceTitle: '', sourceUrl: '', sourcePublishedAt: '' })
      setFormMessage('Haber taslağı oluşturuldu; yayın öncesi moderasyon kuyruğuna alındı.')
      load()
    } catch (err) { setError(err.message || 'Haber taslağı oluşturulamadı.') }
    finally { setBusy('') }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span>YAYIN & MODERASYON</span><h1>Haberler ve Topluluk</h1><p>Resmî yayınları kullanıcı gönderilerinden ayrı yönetin.</p></div><button type="button" onClick={load} disabled={loading}><RefreshCw size={15} /> Yenile</button></header>

      <nav className={styles.tabs} aria-label="Yönetim bölümleri">{TABS.map(([id, label, Icon]) => <button key={id} className={tab === id ? styles.active : ''} onClick={() => setTab(id)}><Icon size={16} />{label}{id === 'reports' && data.reports.length > 0 ? <b>{data.reports.length}</b> : null}</button>)}</nav>
      {error && <div className={styles.error}><AlertTriangle size={16} />{error}</div>}

      {tab === 'news' && <section className={styles.createPanel}><div><FilePenLine size={18} /><h2>Manuel haber taslağı</h2><p>Kaynaklı resmî içerik oluşturur. Otomatik ingestion kayıtlarıyla birleştirilmez ve doğrudan yayınlanmaz.</p></div><form onSubmit={createNews}><label>Başlık<input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} minLength={5} maxLength={180} required /></label><label>Özet<textarea value={form.summary} onChange={e => setForm(v => ({ ...v, summary: e.target.value }))} minLength={20} maxLength={1200} required /></label><div className={styles.formGrid}><label>Kaynak adı<input value={form.sourceTitle} onChange={e => setForm(v => ({ ...v, sourceTitle: e.target.value }))} required /></label><label>Kaynak bağlantısı<input type="url" value={form.sourceUrl} onChange={e => setForm(v => ({ ...v, sourceUrl: e.target.value }))} required /></label><label>Kaynak tarihi<input type="datetime-local" value={form.sourcePublishedAt} onChange={e => setForm(v => ({ ...v, sourcePublishedAt: e.target.value }))} /></label></div><footer>{formMessage && <span><Check size={14} />{formMessage}</span>}<Button type="submit" disabled={busy === 'create'}>{busy === 'create' ? 'Oluşturuluyor…' : 'Taslak oluştur'}</Button></footer></form></section>}

      {tab !== 'reports' && <>
        <section className={styles.panel}><header><h2>{tab === 'news' ? 'Haber yayın kuyruğu' : 'Topluluk moderasyon kuyruğu'}</h2><span>{pending.length} bekleyen</span></header>{loading ? <p className={styles.muted}>Yükleniyor…</p> : pending.length === 0 ? <EmptyState message="Bekleyen içerik yok." /> : <div className={styles.rows}>{pending.map(post => <article key={post.id}><div className={styles.rowHead}><span>{post.postType === 'official' ? 'Manuel resmî kaynak' : 'Kullanıcı gönderisi'}</span><time>{new Date(post.createdAt).toLocaleString('tr-TR')}</time></div><h3>{post.title}</h3><p>{post.summary}</p><small>Yazar: {post.author?.name || post.author?.email || 'Bilinmiyor'} · Durum: {post.status}</small>{post.sourceUrl && <a href={post.sourceUrl} target="_blank" rel="noreferrer">{post.sourceTitle || 'Kaynağı aç'}</a>}<textarea placeholder="Ret nedeni / moderasyon notu" value={reasons[post.id] || ''} onChange={e => setReasons(v => ({ ...v, [post.id]: e.target.value }))} /><div className={styles.actions}><button onClick={() => moderate(post, 'reject')} disabled={busy === post.id}>Reddet</button><Button onClick={() => moderate(post, 'publish')} disabled={busy === post.id}>Yayınla</Button></div></article>)}</div>}</section>
        <section className={styles.panel}><header><h2>Yayındaki {tab === 'news' ? 'haberler' : 'gönderiler'}</h2><span>{published.length} kayıt</span></header><p className={styles.capabilityNote}>Kaldırma gerçek silme değildir: gönderi listelerden düşer, şikâyet ve denetim izi korunur. Düzenleme ve arşivleme uçları henüz yok, o yüzden burada gösterilmiyor.</p>{published.length === 0 ? <EmptyState message="Yayında içerik yok." /> : <div className={styles.published}>{published.map(post => <article key={post.id}><div><strong>{post.title}</strong><small>{post.author?.name || (post.postType === 'official' ? 'Resmî kaynak' : 'Kullanıcı')} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('tr-TR') : 'Tarih yok'}</small></div><Button variant="ghost" disabled={busy === post.id} onClick={() => kaldir(post)}>{busy === post.id ? 'Kaldırılıyor…' : 'Yayından kaldır'}</Button></article>)}</div>}</section>
        {tab === 'news' && <section className={styles.panel}><header><h2>Otomatik resmî haber akışı</h2><span>{data.automatedNews.length} kayıt</span></header><p className={styles.capabilityNote}>Bu kayıtlar NewsArticle ingestion hattından gelir ve manuel CommunityPost taslaklarından ayrı tutulur. Backend yalnız yayın listesini sağlıyor; ingestion durumu veya arşivleme için admin endpointi yoktur.</p>{data.automatedNews.length === 0 ? <EmptyState message="Otomatik akışta yayın bulunamadı." /> : <div className={styles.published}>{data.automatedNews.map(article => <article key={article.id}><div><strong>{article.title}</strong><small>{article.sourceName} · {new Date(article.sourcePublishedAt).toLocaleDateString('tr-TR')}</small></div><span>Otomatik</span></article>)}</div>}</section>}
      </>}

      {tab === 'reports' && <section className={styles.panel}><header><h2>Açık şikâyetler</h2><span>{data.reports.length} kayıt</span></header>{data.reports.length === 0 ? <EmptyState message="Açık şikâyet yok." /> : <div className={styles.rows}>{data.reports.map(report => <article key={report.id}><div className={styles.rowHead}><span>{report.reason}</span><time>{new Date(report.createdAt).toLocaleString('tr-TR')}</time></div><h3>{report.post?.title || 'Gönderi'}</h3><p>{report.details || report.post?.summary}</p><small>Bildiren: {report.reporter?.name || 'Kullanıcı'} · Gönderi durumu: {report.post?.status}</small><textarea placeholder="Çözüm notu" value={reasons[report.id] || ''} onChange={e => setReasons(v => ({ ...v, [report.id]: e.target.value }))} /><div className={styles.actions}><button onClick={() => resolveReport(report, 'dismiss')} disabled={busy === report.id}>Şikâyeti kapat</button><Button variant="danger" onClick={() => resolveReport(report, 'hide_post')} disabled={busy === report.id}>Gönderiyi gizle</Button></div></article>)}</div>}</section>}
    </main>
  )
}
