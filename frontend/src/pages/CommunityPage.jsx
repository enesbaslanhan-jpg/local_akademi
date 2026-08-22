import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bookmark,
  Clock,
  ExternalLink,
  FileText,
  Flag,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Repeat2,
  Send,
  Share2,
  Star,
  Trash2,
  TrendingUp,
  Users,
  Video,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import ImageViewer from '@/components/ui/ImageViewer'
import styles from './CommunityPage.module.css'

const API_URL = import.meta.env.VITE_API_URL || ''
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

export function timeAgo(dateStr) {
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

/* Kullanıcı paylaşımlarının artık başlığı yok; listelerde metnin
   ilk parçası başlık yerine geçiyor. */
function ozet(post, uzunluk = 70) {
  const metin = (post.summary || '').trim()
  if (!metin) return 'Görsel paylaşımı'
  return metin.length > uzunluk ? metin.slice(0, uzunluk).trimEnd() + '…' : metin
}

export function initials(name = 'LK') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

/*
 * Adres SUNUCUDAN geliyor, burada kurulmuyor.
 *
 * Medya rotasi artik imzali: <img src> ve <video src> Authorization
 * basligi tasiyamadigi icin erisim kisa omurlu bir HMAC ile
 * muhurleniyor. Adresi istemcide kurmak imzayi dusururdu.
 */
export function mediaUrl(media) {
  return media?.url ? `${API_URL}${media.url}` : ''
}

function MediaPicker({ media, onChange, disabled = false, videoIzinli = false }) {
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
      setPreview(/^(image|video)\//.test(file.type) ? URL.createObjectURL(file) : '')
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
        accept={videoIzinli
          ? "image/png,image/jpeg,video/mp4,video/webm"
          : "image/png,image/jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
        onChange={selectFile}
        disabled={disabled || uploading}
      />
      <button type="button" className={styles.toolButton} onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
        <ImageIcon size={18} aria-hidden="true" />
        <span>Görsel</span>
      </button>
      <button type="button" className={styles.toolButton} onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
        {videoIzinli ? <Video size={18} aria-hidden="true" /> : <Paperclip size={18} aria-hidden="true" />}
        <span>{videoIzinli ? 'Video' : 'Dosya'}</span>
      </button>
      {uploading && <span className={styles.uploadStatus}>Yükleniyor…</span>}
      {media && (
        <div className={styles.selectedMedia}>
          {preview && media?.kind === 'video'
            ? <video src={preview} muted playsInline />
            : preview
              ? <img src={preview} alt="Yüklenecek görsel önizlemesi" />
              : <FileText size={18} />}
          <span>{media.originalName}</span>
          <button type="button" onClick={removeMedia} aria-label="Ek dosyayı kaldır"><X size={16} /></button>
        </div>
      )}
      {error && <span className={styles.mediaError}>{error}</span>}
    </div>
  )
}

export function PostMedia({ media, featured = false, kucuk = false }) {
  const [buyutuldu, setBuyutuldu] = useState(false)
  if (!media) return null
  const url = mediaUrl(media)
  if (media.kind === 'video') {
    /*
     * `preload="metadata"` bilinçli: akışta on video varsa hepsini
     * indirmek mobil veriyi yakar. Sunucu Range isteklerini (206)
     * karşılıyor, ileri sarma bu sayede çalışıyor.
     */
    return (
      <video
        className={featured ? styles.featuredVideo : styles.postVideo}
        src={url}
        controls
        playsInline
        preload="metadata"
      />
    )
  }
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
  const { isAdmin, user } = useAuth()
  const navigate = useNavigate()
  const isNews = mode === 'news'
  const type = isNews ? 'official' : 'user'
  const [posts, setPosts] = useState([])
  const [pending, setPending] = useState([])
  const [reports, setReports] = useState([])
  const [metin, setMetin] = useState('')
  /* Alintilanacak gonderi. Dolu oldugunda kutu "alinti modu"na giriyor;
     ayri bir alinti kutusu acmak yerine mevcut kutuyu kullanmak,
     kullanicinin zaten bildigi tek yeri koruyor. */
  const [alintilanan, setAlintilanan] = useState(null)
  const [ozet, setOzet] = useState(null)
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
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)

  useEffect(() => {
    if (window.location.hash === '#yayin-araclari') {
      setAdminPanelOpen(true)
    }
  }, [])

  /*
   * Gönderi sayfasından "Alıntıla" ile dönüldüğünde kutuyu hazırlar.
   *
   * Alıntılanan gönderiyi adresten ID ile alıp SUNUCUDAN çekiyoruz;
   * gezinme durumunda taşımak, bağlantı doğrudan yapıştırıldığında
   * çalışmazdı.
   */
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('alinti')
    if (!id) return
    let iptal = false
    api.community.post(id)
      .then(sonuc => { if (!iptal) setAlintilanan(sonuc.post) })
      .catch(() => { /* Gönderi silinmişse alıntı kutusu açılmaz. */ })
      .finally(() => {
        window.history.replaceState({}, '', window.location.pathname)
      })
    return () => { iptal = true }
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
      /* Özet ayrı çağrı: akış sorgusuna eklemek onu ağırlaştırırdı ve
         özet yüklenemese bile akış görünmeli. */
      if (!isNews) api.community.benimOzetim().then(setOzet).catch(() => {})
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
      const result = await api.community.submit({
        metin,
        ...(userMedia ? { mediaId: userMedia.id } : {}),
        ...(alintilanan ? { quotedPostId: alintilanan.id } : {}),
      })
      setMetin('')
      setUserMedia(null)
      setAlintilanan(null)
      setNotice(result.message)
      /* Paylaşım artık ANINDA yayımlanıyor; akışı hemen tazelemezsek
         kullanıcı kendi gönderisini göremez ve gitmedi sanır. */
      await load()
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

  /* Yazar kendi paylaşımını, yönetici her paylaşımı kaldırabilir —
     yetkiyi sunucu da ayrıca denetliyor, buradaki yalnız görünüm. */
  function kaldirilabilir(post) {
    return isAdmin || (post.author?.id != null && post.author.id === user?.id)
  }

  async function kaldir(postId) {
    if (!window.confirm('Bu paylaşım kaldırılsın mı?')) return
    try {
      await api.community.remove(postId)
      setNotice('Paylaşım kaldırıldı.')
      await load()
    } catch (kaldirmaHatasi) {
      setError(kaldirmaHatasi.message || 'Paylaşım kaldırılamadı.')
    }
  }

  /*
   * BEGENI / KAYDETME
   *
   * Isaret HEMEN degisiyor (iyimser), sayi ise SUNUCUDAN gelen degerle
   * yaziliyor. Sayiyi da yerelde artirmak yanlis olurdu: baska biri
   * ayni anda begenmisse ekrandaki sayi gercekten sapardi.
   *
   * Hata durumunda isaret geri aliniyor -- kalici yalanci bir "beğendin"
   * isareti, kullanicinin bir daha denememesine yol acar.
   */
  async function etkilesimDegistir(post, tur, aktif) {
    const bayrak = tur === 'like' ? 'begendim' : 'kaydettim'
    const sayac = tur === 'like' ? 'begeniSayisi' : null

    setPosts(mevcut => mevcut.map(p => p.id === post.id ? { ...p, [bayrak]: aktif } : p))
    try {
      const sonuc = await api.community.etkilesim(post.id, tur, aktif)
      setPosts(mevcut => mevcut.map(p => p.id === post.id
        ? { ...p, [bayrak]: sonuc.aktif, ...(sayac ? { [sayac]: sonuc.sayi } : {}) }
        : p))
    } catch (hata) {
      setPosts(mevcut => mevcut.map(p => p.id === post.id ? { ...p, [bayrak]: !aktif } : p))
      setError(hata.message || 'İşlem tamamlanamadı.')
    }
  }

  function gonderiAdresi(postId) {
    return `${window.location.origin}/app/community/gonderi/${postId}`
  }

  /*
   * PAYLAS
   *
   * Ucuncu taraf paylasim dugmesi (Facebook/X SDK'si) KULLANILMIYOR:
   * izleme yuzeyi acar ve StorageNotice'taki "hicbir ucuncu taraf izleme
   * araci calistirmiyor" taahhudunu yalanlar. Tarayicinin kendi paylasim
   * penceresi ya da panoya kopyalama yeterli.
   */
  async function paylas(post) {
    const adres = gonderiAdresi(post.id)
    if (navigator.share) {
      try {
        await navigator.share({ title: 'LocalKarar', text: post.summary || '', url: adres })
        return
      } catch {
        /* Kullanici vazgecti; panoya kopyalamaya dusmeye gerek yok. */
        return
      }
    }
    try {
      await navigator.clipboard.writeText(adres)
      setNotice('Bağlantı kopyalandı.')
    } catch {
      setError('Bağlantı kopyalanamadı.')
    }
  }

  function alintila(post) {
    setAlintilanan(post)
    document.getElementById('paylas')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const gonderiyiAc = postId => navigate(`/app/community/gonderi/${postId}`)

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
      <header className={styles.pageHeading} data-tour="topluluk-baslik">
        <div><span className={styles.kicker}>{isNews ? 'LocalKarar Haber Merkezi' : 'YEREL İŞLETMELER'}</span><h1>{isNews ? 'Haberler' : 'Topluluk'}</h1><p>{isNews ? 'İşletmenizi etkileyen resmî gelişmeleri kaynaklı ve kısa özetlerle takip edin.' : 'Yerel işletmelerden gerçek deneyimler.'}</p></div>
      </header>

      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!isNews && (
        <div className={styles.communityGrid}>
          <SolProfilKarti user={user} ozet={ozet} />
          <div className={styles.mainColumn}>
            {/*
              * TEK KUTU, BAŞLIK YOK — X benzeri serbest paylaşım
              * (ürün kararı, 22.08.2026). Eskiden zorunlu başlık ve
              * 20 karakter alt sınırı vardı; kısa bir not paylaşmak
              * imkânsızdı. Kutu artık hep açık: "Gönderi oluştur"
              * düğmesine basmak fazladan bir adımdı.
              */}
            <section id="paylas" className={styles.composer}>
              <div className={styles.composerTitle}>
                <span className={styles.authorAvatar}>{initials(user?.name)}</span>
                <span>
                  <h2>{alintilanan ? 'Alıntılıyorsun' : 'Ne paylaşmak istersin?'}</h2>
                  <p>Yazdığın anda yayımlanır. Kendi paylaşımını istediğin zaman kaldırabilirsin.</p>
                </span>
              </div>
              <form onSubmit={submitUserPost} className={styles.form}>
                <textarea aria-label="Paylaşım metni" placeholder={alintilanan ? 'Bir şey eklemek ister misin?' : 'İşletmende neler oluyor?'} value={metin} onChange={event => setMetin(event.target.value)} maxLength={500} rows={3} />
                {alintilanan && (
                  <div className={styles.alintiSecili}>
                    <AlintiBlogu alinti={{ ...alintilanan, kaldirildi: false }} />
                    <button type="button" onClick={() => setAlintilanan(null)} aria-label="Alıntıyı kaldır"><X size={16} /></button>
                  </div>
                )}
                <div className={styles.composerFooter}>
                  <MediaPicker media={userMedia} onChange={setUserMedia} disabled={submitting} videoIzinli />
                  <span className={styles.composerSayac}>
                    <small aria-live="polite">{metin.length}/500</small>
                    <button className={styles.primaryButton} type="submit" disabled={submitting || (!metin.trim() && !userMedia && !alintilanan)}><Send size={17} />{submitting ? 'Gönderiliyor…' : 'Paylaş'}</button>
                  </span>
                </div>
              </form>
            </section>
            {isAdmin && <AdminPanel {...{ showOfficialComposer: isNews, pending, reports, officialPost, setOfficialPost, officialMedia, setOfficialMedia, submitting, publishing, submitOfficialPost, createAndPublishOfficialPost, resetOfficialPost, adminPanelOpen, setAdminPanelOpen, aiSourceText, setAiSourceText, aiLoading, createAiOfficialDraft, moderate, resolveReport }} />}
            <section className={styles.feed} aria-live="polite">
              {loading && <FeedSkeleton />}
              {!loading && posts.length === 0 && <EmptyState text="Henüz yayımlanmış paylaşım yok. İlk deneyimi sen paylaşabilirsin." />}
              {/* Tek tip akış: "öne çıkan tartışma" bloğu kalktı. Başlıksız
                  paylaşımlarda o blok boş bir başlık gösteriyordu, ayrıca
                  X'te de ilk gönderi büyütülmüyor. */}
              <div className={styles.discussionList}>{posts.map(post => (
                <CommunityCard
                  key={post.id}
                  post={post}
                  kaldirilabilir={kaldirilabilir(post)}
                  onReport={reportPost}
                  onRemove={kaldir}
                  onEtkilesim={etkilesimDegistir}
                  onYanitla={p => gonderiyiAc(p.id)}
                  onAlintila={alintila}
                  onPaylas={paylas}
                  onAc={gonderiyiAc}
                />
              ))}</div>
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

/*
 * "..." MENUSU
 *
 * Kaldir ve Raporla buradan cikiyor. Ikisi de yikici ya da geri
 * donusu olan islemler; alt siradaki dort dugmenin yaninda dursalardi
 * Begen'e basmak isterken Kaldir'a basmak an meselesiydi.
 *
 * Disari tiklaninca ve Esc ile kapaniyor -- acik kalan bir menu,
 * altindaki karti tiklanamaz yapar.
 */
export function GonderiMenusu({ kaldirilabilir, onRemove, onReport }) {
  const [acik, setAcik] = useState(false)
  const kutuRef = useRef(null)

  useEffect(() => {
    if (!acik) return
    function disariTiklandi(olay) {
      if (!kutuRef.current?.contains(olay.target)) setAcik(false)
    }
    function tusaBasildi(olay) {
      if (olay.key === 'Escape') setAcik(false)
    }
    document.addEventListener('mousedown', disariTiklandi)
    document.addEventListener('keydown', tusaBasildi)
    return () => {
      document.removeEventListener('mousedown', disariTiklandi)
      document.removeEventListener('keydown', tusaBasildi)
    }
  }, [acik])

  return (
    <div className={styles.menuSarmal} ref={kutuRef}>
      <button
        type="button"
        className={styles.menuDugmesi}
        onClick={() => setAcik(current => !current)}
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label="Gönderi işlemleri"
      >
        <MoreHorizontal size={18} />
      </button>
      {acik && (
        <div className={styles.menuListesi} role="menu">
          <button type="button" role="menuitem" onClick={() => { setAcik(false); onReport() }}>
            <Flag size={15} /> Raporla
          </button>
          {kaldirilabilir && (
            <button
              type="button"
              role="menuitem"
              className={styles.menuYikici}
              onClick={() => { setAcik(false); onRemove() }}
            >
              <Trash2 size={15} /> Kaldır
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/*
 * Alintilanan gonderi kartin ICINDE, cercevelenmis kucuk bir blok.
 *
 * Kaynak kaldirilmissa icerik GELMEZ -- sunucu `kaldirildi: true`
 * disinda hicbir sey gondermiyor. Aksi halde kaldirma yetkisi
 * alintiyla atlatilirdi.
 */
export function AlintiBlogu({ alinti }) {
  if (!alinti) return null
  if (alinti.kaldirildi) {
    return <div className={`${styles.alinti} ${styles.alintiYok}`}>Bu paylaşım kaldırıldı.</div>
  }
  return (
    <div className={styles.alinti}>
      <div className={styles.alintiBasligi}>
        <span className={styles.kucukAvatar}>{initials(alinti.author?.name)}</span>
        <strong>{alinti.author?.name || 'LocalKarar kullanıcısı'}</strong>
        <small>{timeAgo(alinti.publishedAt)}</small>
      </div>
      {alinti.summary && <p>{alinti.summary}</p>}
      <PostMedia media={alinti.media} kucuk />
    </div>
  )
}

function sayiyiYaz(n) {
  if (!n) return ''
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace('.0', '')}B`
}

/*
 * ISLEM SATIRI — Begen · Yanitla · Alintila · Paylas
 *
 * Sayilar SUNUCUDAN geliyor, istemcide artirilmiyor: baska biri ayni
 * anda begenirse yerel sayac yanlisa kayardi. Iyimser guncelleme
 * yalniz kendi isaretim (dolu/bos kalp) icin yapiliyor -- o benim
 * eylemim ve gecikmesi kotu hissettiriyor.
 */
export function IslemSatiri({ post, onEtkilesim, onYanitla, onAlintila, onPaylas }) {
  return (
    <div className={styles.islemSatiri}>
      <button
        type="button"
        className={post.begendim ? styles.islemAktif : undefined}
        onClick={() => onEtkilesim(post, 'like', !post.begendim)}
        aria-pressed={post.begendim}
      >
        <Heart size={17} fill={post.begendim ? 'currentColor' : 'none'} />
        <span>Beğen</span>
        {post.begeniSayisi > 0 && <b>{sayiyiYaz(post.begeniSayisi)}</b>}
      </button>

      <button type="button" onClick={() => onYanitla(post)}>
        <MessageCircle size={17} />
        <span>Yanıtla</span>
        {post.yanitSayisi > 0 && <b>{sayiyiYaz(post.yanitSayisi)}</b>}
      </button>

      <button type="button" onClick={() => onAlintila(post)}>
        <Repeat2 size={18} />
        <span>Alıntıla</span>
        {post.alintiSayisi > 0 && <b>{sayiyiYaz(post.alintiSayisi)}</b>}
      </button>

      <span className={styles.islemSag}>
        <button
          type="button"
          className={post.kaydettim ? styles.islemAktif : undefined}
          onClick={() => onEtkilesim(post, 'bookmark', !post.kaydettim)}
          aria-pressed={post.kaydettim}
          aria-label={post.kaydettim ? 'Kaydı kaldır' : 'Kaydet'}
        >
          <Bookmark size={17} fill={post.kaydettim ? 'currentColor' : 'none'} />
        </button>
        <button type="button" onClick={() => onPaylas(post)} aria-label="Paylaş">
          <Share2 size={17} />
        </button>
      </span>
    </div>
  )
}

/*
 * SOL PROFIL KARTI
 *
 * Referans tasarimda burada "Following / Followers" duruyordu. Bizde
 * TAKIP SISTEMI YOK -- ne takip tablosu ne takipci kavrami. Uydurma bir
 * sayi koymak yerine gercekten sahip oldugumuz uc sayi gosteriliyor:
 * paylasim, begeni, kayit. Takip eklenirse kart buyur, yalan soylemez.
 */
function SolProfilKarti({ user, ozet }) {
  return (
    <aside className={styles.solSutun} aria-label="Profil özeti">
      <section className={styles.profilKarti}>
        <span className={styles.authorAvatar}>{initials(user?.name)}</span>
        <h2>{user?.name || 'LocalKarar kullanıcısı'}</h2>
        <p>Yerel işletme sahibi</p>
        <div className={styles.profilSayilari}>
          <a href="/app/profil?liste=posts"><b>{ozet?.paylasim ?? '—'}</b><span>Paylaşım</span></a>
          <a href="/app/profil?liste=likes"><b>{ozet?.begeni ?? '—'}</b><span>Beğeni</span></a>
          <a href="/app/profil?liste=bookmarks"><b>{ozet?.kayit ?? '—'}</b><span>Kayıt</span></a>
        </div>
      </section>
    </aside>
  )
}

export function CommunityCard({ post, kaldirilabilir, onReport, onRemove, onEtkilesim, onYanitla, onAlintila, onPaylas, onAc }) {
  /*
   * Baslik yok: govde dogrudan metin. Avatar solda, icerik sagda tek
   * sutun -- eski duzen basliga gore kurulmustu ve yazarin ADINI
   * gizliyordu.
   */
  return (
    <article className={styles.communityCard}>
      <span className={styles.authorAvatar}>{initials(post.author?.name)}</span>
      <div className={styles.postBody}>
        <div className={styles.postHead}>
          <strong>{post.author?.name || 'LocalKarar kullanıcısı'}</strong>
          <small>{timeAgo(post.publishedAt)}</small>
          <GonderiMenusu
            kaldirilabilir={kaldirilabilir}
            onRemove={() => onRemove(post.id)}
            onReport={() => onReport(post.id)}
          />
        </div>

        {/* Metne ve medyaya tiklamak gonderiyi acar; islem dugmeleri
            kendi tiklamalarini durduruyor (asagida stopPropagation
            yok cunku dugmeler bu blogun DISINDA). */}
        <div
          className={styles.postAcilir}
          role="link"
          tabIndex={0}
          onClick={() => onAc(post.id)}
          onKeyDown={event => { if (event.key === 'Enter') onAc(post.id) }}
        >
          {post.summary && <p className={styles.postText}>{post.summary}</p>}
          <AlintiBlogu alinti={post.quotedPost} />
          <PostMedia media={post.media} />
        </div>

        <IslemSatiri
          post={post}
          onEtkilesim={onEtkilesim}
          onYanitla={onYanitla}
          onAlintila={onAlintila}
          onPaylas={onPaylas}
        />
      </div>
    </article>
  )
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
  return <aside className={styles.communityRail} aria-label="Topluluk özeti"><section className={styles.railCard}><h2><TrendingUp size={19} /> Gündemde</h2>{posts.length === 0 ? <p>Henüz gündem başlığı oluşmadı.</p> : posts.slice(0, 4).map((post, index) => <div className={styles.topicRow} key={post.id}><span>{ozet(post)}</span><small>{index + 1}</small></div>)}</section><section className={styles.railCard}><h2><Star size={19} /> Katkı sağlayanlar</h2>{contributors.length === 0 ? <p>İlk katkıyı paylaşarak sen başlatabilirsin.</p> : contributors.map(person => <div className={styles.contributorRow} key={person.name}><span className={styles.authorAvatar}>{initials(person.name)}</span><span><strong>{person.name}</strong><small>{person.count} paylaşım</small></span></div>)}</section></aside>
}

function AdminPanel(props) {
  const { showOfficialComposer, pending, reports, officialPost, setOfficialPost, officialMedia, setOfficialMedia, submitting, publishing, submitOfficialPost, createAndPublishOfficialPost, resetOfficialPost, adminPanelOpen, setAdminPanelOpen, aiSourceText, setAiSourceText, aiLoading, createAiOfficialDraft, moderate, resolveReport } = props
  return <details id="yayin-araclari" className={styles.adminPanel} open={adminPanelOpen} onToggle={event => setAdminPanelOpen(event.currentTarget.open)}><summary><span>{showOfficialComposer ? 'Yayın ve moderasyon araçları' : 'Moderasyon araçları'}</span><small>{pending.length} bekleyen · {reports.length} açık rapor</small></summary><div className={styles.adminContent}>{showOfficialComposer && <><h2>Resmî güncelleme oluştur</h2><p>Kendi kısa özetinizi, doğrudan resmî kaynak bağlantısını ve isteğe bağlı görsel veya dosyayı ekleyin.</p><form onSubmit={submitOfficialPost} className={styles.form}><div className={styles.twoFields}><label>Başlık<input value={officialPost.title} onChange={event => setOfficialPost({ ...officialPost, title: event.target.value })} required /></label><label>Kaynak kurum<input value={officialPost.sourceTitle} onChange={event => setOfficialPost({ ...officialPost, sourceTitle: event.target.value })} required /></label></div><div className={styles.twoFields}><label>Kategori<select value={officialPost.category} onChange={event => setOfficialPost({ ...officialPost, category: event.target.value })}><option value="">Seçilmedi</option><option value="FINANS">Finans</option><option value="MEVZUAT">Mevzuat</option><option value="VERGI">Vergi</option><option value="IS_DUNYASI">İş dünyası</option><option value="DIJITALLESME">Dijitalleşme</option><option value="DESTEK">Destekler</option><option value="GENEL_EKONOMI">Genel ekonomi</option></select></label><label>Kaynak tarihi<input type="datetime-local" value={officialPost.sourcePublishedAt} onChange={event => setOfficialPost({ ...officialPost, sourcePublishedAt: event.target.value })} /></label></div><label>Kaynak bağlantısı<input type="url" value={officialPost.sourceUrl} onChange={event => setOfficialPost({ ...officialPost, sourceUrl: event.target.value })} required /></label><label>Özgün kısa özet<textarea value={officialPost.summary} onChange={event => setOfficialPost({ ...officialPost, summary: event.target.value })} minLength={20} maxLength={1200} rows={4} required /></label><label>İçerik<textarea value={officialPost.content} onChange={event => setOfficialPost({ ...officialPost, content: event.target.value })} maxLength={10000} rows={6} placeholder="Gelişmeyi açıklayan uzun metin (isteğe bağlı)" /></label><div className={styles.composerFooter}><MediaPicker media={officialMedia} onChange={setOfficialMedia} disabled={submitting || publishing} /><span className={styles.publishActions}><button type="button" className={styles.primaryButton} onClick={createAndPublishOfficialPost} disabled={publishing || submitting}>{publishing ? 'Yayımlanıyor…' : 'Kaydet ve Yayınla'}</button><button className={styles.primaryButton} type="submit" disabled={submitting || publishing}>{submitting ? 'Kaydediliyor…' : 'Taslak olarak kaydet'}</button><button type="button" onClick={resetOfficialPost} disabled={submitting || publishing}>İptal</button></span></div></form><div className={styles.aiDraft}><h3>Yerel AI ile özet taslağı</h3><textarea value={aiSourceText} onChange={event => setAiSourceText(event.target.value)} minLength={100} maxLength={12000} rows={4} placeholder="Resmî duyuru metni…" /><button type="button" onClick={createAiOfficialDraft} disabled={aiLoading || !officialPost.sourceTitle || !officialPost.sourceUrl || aiSourceText.trim().length < 100}>{aiLoading ? 'Özetleniyor…' : 'AI taslağı oluştur'}</button></div></>}<ModerationQueue pending={pending} reports={reports} moderate={moderate} resolveReport={resolveReport} /></div></details>
}

function ModerationQueue({ pending, reports, moderate, resolveReport }) {
  return <div className={styles.moderationGrid}><section><h3>Moderasyon kuyruğu ({pending.length})</h3>{pending.map(post => <article key={post.id} className={styles.queueItem}><strong>{post.title}</strong><p>{post.summary}</p>{post.media && <div className={styles.pendingAttachment}><FileText size={16} /> {post.media.originalName}</div>}<div><button onClick={() => moderate(post.id, 'publish')}>Yayımla</button><button onClick={() => moderate(post.id, 'reject')}>Reddet</button></div></article>)}</section><section><h3>Açık raporlar ({reports.length})</h3>{reports.map(report => <article key={report.id} className={styles.queueItem}><strong>{report.post.title || ozet(report.post)}</strong><p>{report.details || report.reason}</p><div><button onClick={() => resolveReport(report.id, 'dismiss')}>Kapat</button><button onClick={() => resolveReport(report.id, 'hide_post')}>Gizle</button></div></article>)}</section></div>
}

function FeedSkeleton() { return <div className={styles.skeleton} aria-label="İçerik yükleniyor"><span /><span /><span /></div> }
function EmptyState({ text }) { return <div className={styles.empty}><Users size={34} /><p>{text}</p></div> }
