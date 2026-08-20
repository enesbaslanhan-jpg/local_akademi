import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Clock,
  ExternalLink,
  FileText,
  Flag,
  Image as ImageIcon,
  Paperclip,
  Send,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import ImageViewer from '@/components/ui/ImageViewer'
import styles from './CommunityPage.module.css'

const API_URL = import.meta.env.VITE_API_URL || ''
const emptyUserPost = { title: '', summary: '' }
const emptyOfficialPost = { title: '', summary: '', content: '', category: '', sourceTitle: '', sourceUrl: '', sourcePublishedAt: '' }

const CATEGORY_LABELS = {
  FINANS: 'Finans',
  MEVZUAT: 'Mevzuat',
  VERGI: 'Vergi',
  IS_DUNYASI: 'İş dünyası',
  DIJITALLESME: 'Dijitalleşme',
  DESTEK: 'Destekler',
  GENEL_EKONOMI: 'Genel ekonomi',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'az önce'
  if (mins < 60) return `${mins} dk önce`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} gün önce`
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function initials(name = 'LK') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function mediaUrl(media) {
  return media?.id ? `${API_URL}/community/media/${media.id}` : ''
}

function MediaPicker({ media, onChange, disabled = false }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  async function selectFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setUploading(true)
    try {
      if (media?.id) await api.community.discardMedia(media.id).catch(() => {})
      if (preview) URL.revokeObjectURL(preview)
      const result = await api.community.uploadMedia(file)
      setPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '')
      onChange(result.media)
    } catch (uploadError) {
      setError(uploadError.message || 'Dosya yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  async function removeMedia() {
    if (media?.id) await api.community.discardMedia(media.id).catch(() => {})
    if (preview) URL.revokeObjectURL(preview)
    setPreview('')
    setError('')
    onChange(null)
  }

  return (
    <div className={styles.mediaPicker}>
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={selectFile}
        disabled={disabled || uploading}
      />
      <button type="button" className={styles.toolButton} onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
        <ImageIcon size={18} aria-hidden="true" />
        <span>Görsel</span>
      </button>
      <button type="button" className={styles.toolButton} onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
        <Paperclip size={18} aria-hidden="true" />
        <span>Dosya</span>
      </button>
      {uploading && <span className={styles.uploadStatus}>Yükleniyor…</span>}
      {media && (
        <div className={styles.selectedMedia}>
          {preview ? <img src={preview} alt="Yüklenecek görsel önizlemesi" /> : <FileText size={18} />}
          <span>{media.originalName}</span>
          <button type="button" onClick={removeMedia} aria-label="Ek dosyayı kaldır"><X size={16} /></button>
        </div>
      )}
      {error && <span className={styles.mediaError}>{error}</span>}
    </div>
  )
}

function PostMedia({ media, featured = false }) {
  const [buyutuldu, setBuyutuldu] = useState(false)
  if (!media) return null
  const url = mediaUrl(media)
  if (media.kind === 'image') {
    /*
     * Görsel bir DÜĞMENİN içinde: tıklanabilir bir <img> klavyeyle
     * açılamaz ve ekran okuyucuya tıklanabilir olduğunu söylemez.
     */
    return (
      <>
        <button
          type="button"
          className={styles.imageButton}
          onClick={() => setBuyutuldu(true)}
          aria-label="Görseli büyüt"
        >
          <img className={featured ? styles.featuredImage : styles.postImage} src={url} alt="" loading={featured ? 'eager' : 'lazy'} />
        </button>
        {buyutuldu && <ImageViewer url={url} onClose={() => setBuyutuldu(false)} />}
      </>
    )
  }
  return (
    <a className={styles.fileAttachment} href={url} target="_blank" rel="noreferrer noopener">
      <FileText size={20} />
      <span><strong>{media.originalName}</strong><small>{Math.ceil(media.sizeBytes / 1024)} KB</small></span>
    </a>
  )
}

export default function CommunityPage({ mode = 'news' }) {
  const { isAdmin } = useAuth()
  const isNews = mode === 'news'
  const type = isNews ? 'official' : 'user'
  const [posts, setPosts] = useState([])
  const [pending, setPending] = useState([])
  const [reports, setReports] = useState([])
  const [userPost, setUserPost] = useState(emptyUserPost)
  const [userMedia, setUserMedia] = useState(null)
  const [officialPost, setOfficialPost] = useState(emptyOfficialPost)
  const [officialMedia, setOfficialMedia] = useState(null)
  const [aiSourceText, setAiSourceText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)

  useEffect(() => {
    if (window.location.hash === '#yayin-araclari') {
      setAdminPanelOpen(true)
    }
  }, [])

  const contributors = useMemo(() => Object.values(posts.reduce((result, post) => {
    const name = post.author?.name || 'LocalKarar kullanıcısı'
    result[name] ||= { name, count: 0 }
    result[name].count += 1
    return result
  }, {})).sort((a, b) => b.count - a.count).slice(0, 4), [posts])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [feed, moderation, reportQueue] = await Promise.all([
        api.community.list(type),
        isAdmin ? api.community.moderation() : Promise.resolve({ posts: [] }),
        isAdmin ? api.community.reports() : Promise.resolve({ reports: [] }),
      ])
      setPosts(feed.posts || [])
      setPending(moderation.posts || [])
      setReports(reportQueue.reports || [])
    } catch (loadError) {
      setError(loadError.message || 'Akış yüklenemedi.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [type, isAdmin])

  async function submitUserPost(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const result = await api.community.submit({ ...userPost, ...(userMedia ? { mediaId: userMedia.id } : {}) })
      setUserPost(emptyUserPost)
      setUserMedia(null)
      setComposerOpen(false)
      setNotice(result.message)
      if (isAdmin) await load()
    } catch (submitError) {
      setError(submitError.message || 'Paylaşım gönderilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitOfficialPost(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await createOfficialDraft(false)
      setNotice('Resmî güncelleme moderasyon taslağına kaydedildi.')
    } catch (submitError) {
      setError(submitError.message || 'Resmî güncelleme kaydedilemedi.')
    } finally {
      setSubmitting(false)
    }
  }

  async function createAndPublishOfficialPost(event) {
    event.preventDefault()
    setPublishing(true)
    setError('')
    try {
      const { post } = await createOfficialDraft(true)
      setNotice(`"${post.title}" yayımlandı.`)
    } catch (publishError) {
      setError(publishError.message || 'Resmî güncelleme yayımlanamadı.')
    } finally {
      setPublishing(false)
    }
  }

  async function createOfficialDraft(publish) {
    const result = await api.community.createOfficial({
      ...officialPost,
      ...(officialPost.category ? { category: officialPost.category } : {}),
      ...(officialPost.sourcePublishedAt ? { sourcePublishedAt: new Date(officialPost.sourcePublishedAt).toISOString() } : {}),
      ...(officialMedia ? { mediaId: officialMedia.id } : {}),
    })
    if (publish && result.post?.id) {
      await api.community.moderate(result.post.id, 'publish')
    }
    setOfficialPost(emptyOfficialPost)
    setOfficialMedia(null)
    await load()
    return result
  }

  function resetOfficialPost() {
    setOfficialPost(emptyOfficialPost)
    setOfficialMedia(null)
    setError('')
  }

  async function createAiOfficialDraft() {
    setAiLoading(true)
    setError('')
    try {
      await api.community.createAiOfficial({ sourceTitle: officialPost.sourceTitle, sourceUrl: officialPost.sourceUrl, sourceText: aiSourceText })
      setAiSourceText('')
      setNotice('Yerel AI özeti taslak olarak oluşturuldu; yayımlamadan önce inceleyin.')
      await load()
    } catch (aiError) {
      setError(aiError.message || 'Yerel AI özeti oluşturulamadı.')
    } finally {
      setAiLoading(false)
    }
  }

  async function moderate(postId, action) {
    const reason = action === 'reject' ? window.prompt('Ret nedeni')?.trim() : ''
    if (action === 'reject' && !reason) return
    try { await api.community.moderate(postId, action, reason); await load() }
    catch (moderationError) { setError(moderationError.message || 'Moderasyon işlemi başarısız.') }
  }

  async function reportPost(postId) {
    const allowed = ['spam', 'misinformation', 'harassment', 'unsafe', 'copyright', 'other']
    const reason = window.prompt('Rapor nedeni: spam, misinformation, harassment, unsafe, copyright veya other', 'misinformation')?.trim()
    if (!reason || !allowed.includes(reason)) return
    const details = reason === 'other' ? window.prompt('Kısa açıklama')?.trim() : undefined
    if (reason === 'other' && !details) return
    try { await api.community.report(postId, reason, details); setNotice('Rapor moderasyon ekibine iletildi.') }
    catch (reportError) { setError(reportError.message || 'Rapor gönderilemedi.') }
  }

  async function resolveReport(reportId, action) {
    try { await api.community.resolveReport(reportId, action); await load() }
    catch (resolveError) { setError(resolveError.message || 'Rapor çözülemedi.') }
  }

  const featuredPost = isNews ? posts[0] : null
  const latestPosts = isNews ? posts.slice(1) : posts

  return (
    <main className={`${styles.page} ${isNews ? styles.newsPage : styles.communityPage}`}>
      <header className={styles.pageHeading}>
        <div><span className={styles.kicker}>{isNews ? 'LocalKarar Haber Merkezi' : 'YEREL İŞLETMELER'}</span><h1>{isNews ? 'Haberler' : 'Topluluk'}</h1><p>{isNews ? 'İşletmenizi etkileyen resmî gelişmeleri kaynaklı ve kısa özetlerle takip edin.' : 'Yerel işletmelerden gerçek deneyimler.'}</p></div>
        {!isNews && <button type="button" className={styles.createPostButton} onClick={() => setComposerOpen(current => !current)}>{composerOpen ? 'Kapat' : 'Gönderi oluştur'}</button>}
      </header>

      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!isNews && (
        <div className={styles.communityGrid}>
          <div className={styles.mainColumn}>
            {composerOpen && <section id="paylas" className={styles.composer}>
              <div className={styles.composerTitle}>
                <span className={styles.authorAvatar}>LK</span>
                <span><h2>Deneyimini paylaş</h2><p>Gönderiler yayımlanmadan önce moderasyondan geçer.</p></span>
              </div>
              <form onSubmit={submitUserPost} className={styles.form}>
                <input aria-label="Paylaşım başlığı" placeholder="Başlık ekle" value={userPost.title} onChange={event => setUserPost({ ...userPost, title: event.target.value })} minLength={5} maxLength={180} required />
                <textarea aria-label="Paylaşım metni" placeholder="İşletmende ne öğrendin?" value={userPost.summary} onChange={event => setUserPost({ ...userPost, summary: event.target.value })} minLength={20} maxLength={1200} rows={3} required />
                <div className={styles.composerFooter}>
                  <MediaPicker media={userMedia} onChange={setUserMedia} disabled={submitting} />
                  <button className={styles.primaryButton} type="submit" disabled={submitting}><Send size={17} />{submitting ? 'Gönderiliyor…' : 'Paylaş'}</button>
                </div>
              </form>
            </section>}
            {isAdmin && <AdminPanel {...{ showOfficialComposer: isNews, pending, reports, officialPost, setOfficialPost, officialMedia, setOfficialMedia, submitting, publishing, submitOfficialPost, createAndPublishOfficialPost, resetOfficialPost, adminPanelOpen, setAdminPanelOpen, aiSourceText, setAiSourceText, aiLoading, createAiOfficialDraft, moderate, resolveReport }} />}
            <section className={styles.feed} aria-live="polite">
              {loading && <FeedSkeleton />}
              {!loading && posts.length === 0 && <EmptyState text="Henüz yayımlanmış paylaşım yok. İlk deneyimi sen paylaşabilirsin." />}
              {posts[0] && <article className={styles.featuredDiscussion}><span>Öne çıkan tartışma</span><h2>{posts[0].title}</h2><p>{posts[0].summary}</p><small>{posts[0].author?.name || 'LocalKarar kullanıcısı'} · {timeAgo(posts[0].publishedAt)}</small><PostMedia media={posts[0].media} /></article>}
              <div className={styles.discussionList}>{posts.slice(1).map(post => <CommunityCard key={post.id} post={post} onReport={reportPost} />)}</div>
            </section>
          </div>
          <CommunityRail posts={posts} contributors={contributors} />
        </div>
      )}

      {isNews && (
        <>
          {isAdmin && <AdminPanel {...{ showOfficialComposer: isNews, pending, reports, officialPost, setOfficialPost, officialMedia, setOfficialMedia, submitting, publishing, submitOfficialPost, createAndPublishOfficialPost, resetOfficialPost, adminPanelOpen, setAdminPanelOpen, aiSourceText, setAiSourceText, aiLoading, createAiOfficialDraft, moderate, resolveReport }} />}
          {loading ? <FeedSkeleton /> : posts.length === 0 ? <EmptyState text="Henüz yayımlanmış resmî haber yok." /> : (
            <div className={styles.newsGrid}>
              <div className={styles.newsMain}>
                <FeaturedNews post={featuredPost} onReport={reportPost} />
                <div className={styles.sectionHeading}><h2>Son gelişmeler</h2><span>{posts.length} kaynaklı özet</span></div>
                <section className={styles.newsList}>{latestPosts.map(post => <NewsCard key={post.id} post={post} onReport={reportPost} />)}</section>
              </div>
              <aside className={styles.newsRail}>
                <section className={styles.railCard}><h2><TrendingUp size={19} /> Öne çıkanlar</h2>{posts.slice(0, 5).map((post, index) => <a key={post.id} href={post.sourceUrl || '#'} target={post.sourceUrl ? '_blank' : undefined} rel="noreferrer noopener"><b>{String(index + 1).padStart(2, '0')}</b><span>{post.title}<small>{timeAgo(post.publishedAt)}</small></span></a>)}</section>
                <section className={styles.sourcePromise}><Star size={22} /><h2>Kaynağı belli</h2><p>Her haber özeti doğrudan resmî bağlantısıyla yayımlanır.</p></section>
              </aside>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function CommunityCard({ post, onReport }) {
  return <article className={styles.communityCard}>
    <div className={styles.authorRow}><span className={styles.authorAvatar}>{initials(post.author?.name)}</span><span><strong>{post.author?.name || 'LocalKarar kullanıcısı'}</strong><small>{timeAgo(post.publishedAt)}</small></span></div>
    <h2>{post.title}</h2><p>{post.summary}</p><PostMedia media={post.media} />
    <div className={styles.cardActions}><span>Topluluk paylaşımı</span><button type="button" onClick={() => onReport(post.id)}><Flag size={15} /> Raporla</button></div>
  </article>
}

function FeaturedNews({ post, onReport }) {
  return <article className={styles.featuredNews}>
    <PostMedia media={post.media} featured />
    <div className={styles.featuredOverlay} />
    <div className={styles.featuredContent}><span className={styles.newsBadge}>{post.category ? `${CATEGORY_LABELS[post.category] || post.category} · ` : ''}Günün gelişmesi</span><h2>{post.title}</h2><p>{post.summary}</p>{post.content && <p className={styles.newsContent}>{post.content}</p>}<div><span><Clock size={15} /> {timeAgo(post.publishedAt)}</span>{post.sourceUrl && <a href={post.sourceUrl} target="_blank" rel="noreferrer noopener">Resmî kaynağı aç <ExternalLink size={15} /></a>}<button type="button" onClick={() => onReport(post.id)}><Flag size={14} /> Raporla</button></div></div>
  </article>
}

function NewsCard({ post, onReport }) {
  return <article className={styles.newsCard}><div className={styles.newsThumb}>{post.media?.kind === 'image' ? <PostMedia media={post.media} /> : <FileText size={34} />}</div><div className={styles.newsBody}><span>{post.category ? `${CATEGORY_LABELS[post.category] || post.category} · ` : ''}{post.sourceTitle || 'Resmî kaynak'}</span><h2>{post.title}</h2><p>{post.summary}</p>{post.content && <p className={styles.newsContent}>{post.content}</p>}<div><time>{timeAgo(post.publishedAt)}</time>{post.sourceUrl && <a href={post.sourceUrl} target="_blank" rel="noreferrer noopener">Kaynağa git <ExternalLink size={14} /></a>}<button type="button" onClick={() => onReport(post.id)} aria-label="Haberi raporla"><Flag size={14} /></button></div></div></article>
}

function CommunityRail({ posts, contributors }) {
  return <aside className={styles.communityRail} aria-label="Topluluk özeti"><section className={styles.railCard}><h2><TrendingUp size={19} /> Gündemde</h2>{posts.length === 0 ? <p>Henüz gündem başlığı oluşmadı.</p> : posts.slice(0, 4).map((post, index) => <div className={styles.topicRow} key={post.id}><span>{post.title}</span><small>{index + 1}</small></div>)}</section><section className={styles.railCard}><h2><Star size={19} /> Katkı sağlayanlar</h2>{contributors.length === 0 ? <p>İlk katkıyı paylaşarak sen başlatabilirsin.</p> : contributors.map(person => <div className={styles.contributorRow} key={person.name}><span className={styles.authorAvatar}>{initials(person.name)}</span><span><strong>{person.name}</strong><small>{person.count} paylaşım</small></span></div>)}</section></aside>
}

function AdminPanel(props) {
  const { showOfficialComposer, pending, reports, officialPost, setOfficialPost, officialMedia, setOfficialMedia, submitting, publishing, submitOfficialPost, createAndPublishOfficialPost, resetOfficialPost, adminPanelOpen, setAdminPanelOpen, aiSourceText, setAiSourceText, aiLoading, createAiOfficialDraft, moderate, resolveReport } = props
  return <details id="yayin-araclari" className={styles.adminPanel} open={adminPanelOpen} onToggle={event => setAdminPanelOpen(event.currentTarget.open)}><summary><span>{showOfficialComposer ? 'Yayın ve moderasyon araçları' : 'Moderasyon araçları'}</span><small>{pending.length} bekleyen · {reports.length} açık rapor</small></summary><div className={styles.adminContent}>{showOfficialComposer && <><h2>Resmî güncelleme oluştur</h2><p>Kendi kısa özetinizi, doğrudan resmî kaynak bağlantısını ve isteğe bağlı görsel veya dosyayı ekleyin.</p><form onSubmit={submitOfficialPost} className={styles.form}><div className={styles.twoFields}><label>Başlık<input value={officialPost.title} onChange={event => setOfficialPost({ ...officialPost, title: event.target.value })} required /></label><label>Kaynak kurum<input value={officialPost.sourceTitle} onChange={event => setOfficialPost({ ...officialPost, sourceTitle: event.target.value })} required /></label></div><div className={styles.twoFields}><label>Kategori<select value={officialPost.category} onChange={event => setOfficialPost({ ...officialPost, category: event.target.value })}><option value="">Seçilmedi</option><option value="FINANS">Finans</option><option value="MEVZUAT">Mevzuat</option><option value="VERGI">Vergi</option><option value="IS_DUNYASI">İş dünyası</option><option value="DIJITALLESME">Dijitalleşme</option><option value="DESTEK">Destekler</option><option value="GENEL_EKONOMI">Genel ekonomi</option></select></label><label>Kaynak tarihi<input type="datetime-local" value={officialPost.sourcePublishedAt} onChange={event => setOfficialPost({ ...officialPost, sourcePublishedAt: event.target.value })} /></label></div><label>Kaynak bağlantısı<input type="url" value={officialPost.sourceUrl} onChange={event => setOfficialPost({ ...officialPost, sourceUrl: event.target.value })} required /></label><label>Özgün kısa özet<textarea value={officialPost.summary} onChange={event => setOfficialPost({ ...officialPost, summary: event.target.value })} minLength={20} maxLength={1200} rows={4} required /></label><label>İçerik<textarea value={officialPost.content} onChange={event => setOfficialPost({ ...officialPost, content: event.target.value })} maxLength={10000} rows={6} placeholder="Gelişmeyi açıklayan uzun metin (isteğe bağlı)" /></label><div className={styles.composerFooter}><MediaPicker media={officialMedia} onChange={setOfficialMedia} disabled={submitting || publishing} /><span className={styles.publishActions}><button type="button" className={styles.primaryButton} onClick={createAndPublishOfficialPost} disabled={publishing || submitting}>{publishing ? 'Yayımlanıyor…' : 'Kaydet ve Yayınla'}</button><button className={styles.primaryButton} type="submit" disabled={submitting || publishing}>{submitting ? 'Kaydediliyor…' : 'Taslak olarak kaydet'}</button><button type="button" onClick={resetOfficialPost} disabled={submitting || publishing}>İptal</button></span></div></form><div className={styles.aiDraft}><h3>Yerel AI ile özet taslağı</h3><textarea value={aiSourceText} onChange={event => setAiSourceText(event.target.value)} minLength={100} maxLength={12000} rows={4} placeholder="Resmî duyuru metni…" /><button type="button" onClick={createAiOfficialDraft} disabled={aiLoading || !officialPost.sourceTitle || !officialPost.sourceUrl || aiSourceText.trim().length < 100}>{aiLoading ? 'Özetleniyor…' : 'AI taslağı oluştur'}</button></div></>}<ModerationQueue pending={pending} reports={reports} moderate={moderate} resolveReport={resolveReport} /></div></details>
}

function ModerationQueue({ pending, reports, moderate, resolveReport }) {
  return <div className={styles.moderationGrid}><section><h3>Moderasyon kuyruğu ({pending.length})</h3>{pending.map(post => <article key={post.id} className={styles.queueItem}><strong>{post.title}</strong><p>{post.summary}</p>{post.media && <div className={styles.pendingAttachment}><FileText size={16} /> {post.media.originalName}</div>}<div><button onClick={() => moderate(post.id, 'publish')}>Yayımla</button><button onClick={() => moderate(post.id, 'reject')}>Reddet</button></div></article>)}</section><section><h3>Açık raporlar ({reports.length})</h3>{reports.map(report => <article key={report.id} className={styles.queueItem}><strong>{report.post.title}</strong><p>{report.details || report.reason}</p><div><button onClick={() => resolveReport(report.id, 'dismiss')}>Kapat</button><button onClick={() => resolveReport(report.id, 'hide_post')}>Gizle</button></div></article>)}</section></div>
}

function FeedSkeleton() { return <div className={styles.skeleton} aria-label="İçerik yükleniyor"><span /><span /><span /></div> }
function EmptyState({ text }) { return <div className={styles.empty}><Users size={34} /><p>{text}</p></div> }
