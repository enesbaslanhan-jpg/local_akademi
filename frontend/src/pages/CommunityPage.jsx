import { useEffect, useState } from 'react'
import { ExternalLink, Newspaper, Send, Users } from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import styles from './CommunityPage.module.css'

const emptyUserPost = { title: '', summary: '' }
const emptyOfficialPost = {
  title: '',
  summary: '',
  sourceTitle: '',
  sourceUrl: '',
}

export default function CommunityPage() {
  const { isAdmin } = useAuth()
  const [type, setType] = useState('')
  const [posts, setPosts] = useState([])
  const [pending, setPending] = useState([])
  const [reports, setReports] = useState([])
  const [userPost, setUserPost] = useState(emptyUserPost)
  const [officialPost, setOfficialPost] = useState(emptyOfficialPost)
  const [aiSourceText, setAiSourceText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [feed, moderation, reportQueue] = await Promise.all([
        api.community.list(type),
        isAdmin
          ? api.community.moderation()
          : Promise.resolve({ posts: [] }),
        isAdmin
          ? api.community.reports()
          : Promise.resolve({ reports: [] }),
      ])
      setPosts(feed.posts || [])
      setPending(moderation.posts || [])
      setReports(reportQueue.reports || [])
    } catch (err) {
      setError(err.message || 'Paylaşım alanı yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [type, isAdmin])

  async function submitUserPost(event) {
    event.preventDefault()
    setError('')
    try {
      const result = await api.community.submit(userPost)
      setUserPost(emptyUserPost)
      setNotice(result.message)
      if (isAdmin) await load()
    } catch (err) {
      setError(err.message || 'Paylaşım gönderilemedi.')
    }
  }

  async function submitOfficialPost(event) {
    event.preventDefault()
    setError('')
    try {
      await api.community.createOfficial(officialPost)
      setOfficialPost(emptyOfficialPost)
      setNotice('Resmî güncelleme taslak olarak kaydedildi.')
      await load()
    } catch (err) {
      setError(err.message || 'Resmî güncelleme kaydedilemedi.')
    }
  }

  async function createAiOfficialDraft() {
    setAiLoading(true)
    setError('')
    try {
      await api.community.createAiOfficial({
        sourceTitle: officialPost.sourceTitle,
        sourceUrl: officialPost.sourceUrl,
        sourceText: aiSourceText,
      })
      setAiSourceText('')
      setNotice('Yerel AI özeti taslak olarak oluşturuldu; yayınlamadan önce inceleyin.')
      await load()
    } catch (err) {
      setError(err.message || 'Yerel AI özeti oluşturulamadı.')
    } finally {
      setAiLoading(false)
    }
  }

  async function moderate(postId, action) {
    const reason =
      action === 'reject'
        ? window.prompt('Ret nedeni')?.trim()
        : ''
    if (action === 'reject' && !reason) return
    try {
      await api.community.moderate(postId, action, reason)
      await load()
    } catch (err) {
      setError(err.message || 'Moderasyon işlemi başarısız.')
    }
  }

  async function reportPost(postId) {
    const allowed = [
      'spam', 'misinformation', 'harassment',
      'unsafe', 'copyright', 'other',
    ]
    const reason = window.prompt(
      'Rapor nedeni: spam, misinformation, harassment, unsafe, copyright veya other',
      'misinformation',
    )?.trim()
    if (!reason || !allowed.includes(reason)) return
    const details = reason === 'other'
      ? window.prompt('Kısa açıklama')?.trim()
      : undefined
    if (reason === 'other' && !details) return
    try {
      await api.community.report(postId, reason, details)
      setNotice('Rapor moderasyon ekibine iletildi.')
    } catch (err) {
      setError(err.message || 'Rapor gönderilemedi.')
    }
  }

  async function resolveReport(reportId, action) {
    try {
      await api.community.resolveReport(reportId, action)
      await load()
    } catch (err) {
      setError(err.message || 'Rapor çözülemedi.')
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Kaynaklı ve kontrollü</span>
          <h1>Güncellemeler ve Paylaşım</h1>
          <p>
            Resmî duyuruların kısa özetlerini okuyun, kendi işletme
            deneyiminizi toplulukla paylaşın.
          </p>
        </div>
        <Newspaper size={38} aria-hidden="true" />
      </header>

      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.composer}>
        <div>
          <Users size={22} aria-hidden="true" />
          <h2>Deneyimini paylaş</h2>
          <p>Gönderiler yayınlanmadan önce moderasyondan geçer.</p>
        </div>
        <form onSubmit={submitUserPost} className={styles.form}>
          <label>
            Başlık
            <input
              value={userPost.title}
              onChange={event =>
                setUserPost({ ...userPost, title: event.target.value })
              }
              minLength={5}
              maxLength={180}
              required
            />
          </label>
          <label>
            Kısa ve özgün paylaşım
            <textarea
              value={userPost.summary}
              onChange={event =>
                setUserPost({ ...userPost, summary: event.target.value })
              }
              minLength={20}
              maxLength={1200}
              rows={4}
              required
            />
          </label>
          <button type="submit">
            <Send size={17} /> Moderasyona gönder
          </button>
        </form>
      </section>

      {isAdmin && (
        <section className={styles.adminPanel}>
          <h2>Resmî güncelleme taslağı</h2>
          <p>
            Telifli haber metnini kopyalamayın; kendi kısa özetinizi ve
            doğrudan resmî kaynak bağlantısını girin.
          </p>
          <form onSubmit={submitOfficialPost} className={styles.form}>
            {Object.entries({
              title: 'Başlık',
              sourceTitle: 'Kaynak kurum',
              sourceUrl: 'Kaynak bağlantısı',
            }).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type={key === 'sourceUrl' ? 'url' : 'text'}
                  value={officialPost[key]}
                  onChange={event =>
                    setOfficialPost({
                      ...officialPost,
                      [key]: event.target.value,
                    })
                  }
                  required
                />
              </label>
            ))}
            <label>
              Özgün kısa özet
              <textarea
                value={officialPost.summary}
                onChange={event =>
                  setOfficialPost({
                    ...officialPost,
                    summary: event.target.value,
                  })
                }
                minLength={20}
                maxLength={1200}
                rows={4}
                required
              />
            </label>
            <button type="submit">Taslak oluştur</button>
          </form>

          <div className={styles.aiDraft}>
            <h3>Yerel AI ile özgün özet taslağı</h3>
            <p>
              Yukarıdaki kaynak kurum ve bağlantıyı doldurun. Aşağıdaki kaynak
              metni yalnız özetleme isteğinde kullanılır, veritabanında saklanmaz.
            </p>
            <textarea
              value={aiSourceText}
              onChange={event => setAiSourceText(event.target.value)}
              minLength={100}
              maxLength={12000}
              rows={6}
              placeholder="Resmî duyuru metni…"
            />
            <button
              type="button"
              onClick={createAiOfficialDraft}
              disabled={
                aiLoading ||
                !officialPost.sourceTitle ||
                !officialPost.sourceUrl ||
                aiSourceText.trim().length < 100
              }
            >
              {aiLoading ? 'Yerel AI özetliyor…' : 'AI taslağı oluştur'}
            </button>
          </div>

          <h3>Moderasyon kuyruğu ({pending.length})</h3>
          <div className={styles.queue}>
            {pending.map(post => (
              <article key={post.id} className={styles.queueItem}>
                <strong>{post.title}</strong>
                <span>{post.postType === 'official' ? 'Resmî' : 'Kullanıcı'}</span>
                <p>{post.summary}</p>
                <div>
                  <button onClick={() => moderate(post.id, 'publish')}>
                    Yayınla
                  </button>
                  <button
                    className={styles.reject}
                    onClick={() => moderate(post.id, 'reject')}
                  >
                    Reddet
                  </button>
                </div>
              </article>
            ))}
          </div>

          <h3>Açık kullanıcı raporları ({reports.length})</h3>
          <div className={styles.queue}>
            {reports.map(report => (
              <article key={report.id} className={styles.queueItem}>
                <strong>{report.post.title}</strong>
                <span>{report.reason}</span>
                {report.details && <p>{report.details}</p>}
                <div>
                  <button onClick={() => resolveReport(report.id, 'dismiss')}>
                    Raporu kapat
                  </button>
                  <button
                    className={styles.reject}
                    onClick={() => resolveReport(report.id, 'hide_post')}
                  >
                    Gönderiyi gizle
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className={styles.filters} role="group" aria-label="Paylaşım filtresi">
        {[
          ['', 'Tümü'],
          ['official', 'Resmî güncellemeler'],
          ['user', 'Topluluk'],
        ].map(([value, label]) => (
          <button
            key={value}
            className={type === value ? styles.active : ''}
            onClick={() => setType(value)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className={styles.feed} aria-live="polite">
        {loading && <p>Paylaşımlar yükleniyor…</p>}
        {!loading && posts.length === 0 && (
          <p className={styles.empty}>Henüz yayımlanmış paylaşım yok.</p>
        )}
        {posts.map(post => (
          <article key={post.id} className={styles.card}>
            <div className={styles.cardMeta}>
              <span className={post.postType === 'official' ? styles.official : styles.user}>
                {post.postType === 'official' ? 'Resmî özet' : 'Topluluk'}
              </span>
              <time>
                {new Date(post.publishedAt).toLocaleDateString('tr-TR')}
              </time>
            </div>
            <h2>{post.title}</h2>
            <p>{post.summary}</p>
            {post.sourceUrl ? (
              <a href={post.sourceUrl} target="_blank" rel="noreferrer noopener">
                {post.sourceTitle || 'Resmî kaynağı aç'}
                <ExternalLink size={15} />
              </a>
            ) : (
              <small>{post.author?.name || 'LocalAkademi kullanıcısı'}</small>
            )}
            <button
              type="button"
              className={styles.reportButton}
              onClick={() => reportPost(post.id)}
            >
              Raporla
            </button>
          </article>
        ))}
      </section>
    </main>
  )
}
