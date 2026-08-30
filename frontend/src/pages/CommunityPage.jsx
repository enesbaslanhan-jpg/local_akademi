import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bookmark,
  AtSign,
  Maximize2,
  Plus,
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
  Search,
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
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import ImageViewer from '@/components/ui/ImageViewer'
import AkisVideosu from '@/components/ui/AkisVideosu'
import Button from '@/components/ui/Button'
import styles from './CommunityPage.module.css'
import { getFormatLocale } from '@/utils/formatters'

const API_URL = import.meta.env.VITE_API_URL || ''
const emptyOfficialPost = { title: '', summary: '', content: '', category: '', sourceTitle: '', sourceUrl: '', sourcePublishedAt: '' }

/* Kategori kodları backend sözleşmesi — değişmez. Görüntülenen etiket
   `community:news.categories.*`ten gelir. */
const CATEGORY_KEYS = {
  FINANS: 'finance',
  MEVZUAT: 'legal',
  VERGI: 'tax',
  IS_DUNYASI: 'business',
  DIJITALLESME: 'digital',
  DESTEK: 'support',
  GENEL_EKONOMI: 'economy',
}

function categoryLabel(code, t) {
  const key = CATEGORY_KEYS[code]
  return key ? t(`news.categories.${key}`) : code
}

export function timeAgo(dateStr, t) {
  if (!dateStr) return ''
  const diff = Math.max(0, Date.now() - new Date(dateStr).getTime())
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('feed.time.now')
  if (mins < 60) return t('feed.time.minutes', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('feed.time.hours', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('feed.time.days', { count: days })
  return new Date(dateStr).toLocaleDateString(getFormatLocale(), { day: 'numeric', month: 'long', year: 'numeric' })
}

/* Kullanıcı paylaşımlarının artık başlığı yok; listelerde metnin
   ilk parçası başlık yerine geçiyor. */
function ozet(post, t, uzunluk = 70) {
  const metin = (post.summary || '').trim()
  if (!metin) return t('feed.visualOnly')
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
  const { t } = useTranslation('community')
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
      setError(uploadError.message || t('feed.media.uploadFailed'))
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
        <span>{t('feed.media.image')}</span>
      </button>
      <button type="button" className={styles.toolButton} onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
        {videoIzinli ? <Video size={18} aria-hidden="true" /> : <Paperclip size={18} aria-hidden="true" />}
        <span>{videoIzinli ? t('feed.media.video') : t('feed.media.file')}</span>
      </button>
      {uploading && <span className={styles.uploadStatus}>{t('feed.media.uploading')}</span>}
      {media && (
        <div className={styles.selectedMedia}>
          {preview && media?.kind === 'video'
            ? <video src={preview} muted playsInline />
            : preview
              ? <img src={preview} alt={t('feed.media.previewAlt')} />
              : <FileText size={18} />}
          <span>{media.originalName}</span>
          <button type="button" onClick={removeMedia} aria-label={t('feed.media.removeAttachment')}><X size={16} /></button>
        </div>
      )}
      {error && <span className={styles.mediaError}>{error}</span>}
    </div>
  )
}

export function PostMedia({ media, featured = false, kucuk = false, yanPanel = null, overlayText = '', mediaActions = null }) {
  const { t } = useTranslation('community')
  const [buyutuldu, setBuyutuldu] = useState(false)
  if (!media) return null
  const url = mediaUrl(media)

  /* Büyütülmüş görünüm görsel ve video için AYNI kutuyu kullanıyor:
     odak tuzağı, Esc ve odağı geri verme orada zaten doğru yazılmış. */
  const buyutucu = buyutuldu && (
    <ImageViewer url={url} tur={media.kind} yan={yanPanel} overlayText={overlayText} mediaActions={mediaActions} onClose={() => setBuyutuldu(false)} />
  )

  if (media.kind === 'video') {
    /*
     * Tarayıcının kendi `controls`u AKIŞTA kullanılmıyor: ürün sahibi
     * "eskiden kalma bir yapı" dedi — yerleşik çubuk her tarayıcıda
     * farklı görünüyor ve temaya uymuyor. Büyütülmüş görünümde ise
     * yerleşik kontroller KALIYOR; orada kullanıcı videoyu yönetmek
     * istiyor ve gizlenen kontrol engel olurdu.
     */
    return (
      <>
        <AkisVideosu src={url} kucuk={kucuk} onAc={() => setBuyutuldu(true)} />
        {buyutucu}
      </>
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
          /* Kartın "gönderiyi aç" katmanı bu düğmeyi sarıyor; olay
             durdurulmazsa görsele tıklamak gönderi sayfasına giderdi. */
          onClick={olay => { olay.stopPropagation(); setBuyutuldu(true) }}
          aria-label={t('feed.media.zoomImage')}
        >
          <img className={featured ? styles.featuredImage : styles.postImage} src={url} alt="" loading={featured ? 'eager' : 'lazy'} />
          {/*
            * Videodaki cam kapsülün görseldeki karşılığı: büyütmenin
            * mümkün olduğunu söyleyen tek işaret. Olmadan görsel
            * tıklanabilir görünmüyordu — kullanıcı denemeyi akıl
            * etmedikçe büyütme özelliği hiç keşfedilmezdi.
            */}
          <span className={styles.buyutRozeti} aria-hidden="true">
            <Maximize2 size={15} />
          </span>
        </button>
        {buyutucu}
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
  const { t } = useTranslation('community')
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
  /*
   * Kutu artık DÜĞMEYLE açılıyor.
   *
   * Önce "hep açık" yapmıştım (X'te öyle diye). Ürün sahibi denedi ve
   * kutunun akışın üstünde sürekli yer kaplamasının rahatsız ettiğini
   * söyledi. Karar onun.
   *
   * `metin` sayfa düzeyinde tutuluyor: kutu kapanıp açılınca yazılan
   * yazı KAYBOLMUYOR. Kapatınca "acaba sildim mi" dedirtmek en kötü
   * sonuç olurdu.
   */
  const [kutuAcik, setKutuAcik] = useState(false)
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
  const [aramaMetni, setAramaMetni] = useState('')

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
      .then(sonuc => { if (!iptal) { setAlintilanan(sonuc.post); setKutuAcik(true) } })
      .catch(() => { /* Gönderi silinmişse alıntı kutusu açılmaz. */ })
      .finally(() => {
        window.history.replaceState({}, '', window.location.pathname)
      })
    return () => { iptal = true }
  }, [])

  const contributors = useMemo(() => Object.values(posts.reduce((result, post) => {
    const name = post.author?.name || t('feed.defaultAuthor')
    result[name] ||= { id: post.author?.id, name, count: 0 }
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
      setPending(moderation.posts || [])
      setReports(reportQueue.reports || [])
    } catch (loadError) {
      setError(loadError.message || t('feed.loadFailed'))
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
      setKutuAcik(false)
      setNotice(result.message)
      /* Paylaşım artık ANINDA yayımlanıyor; akışı hemen tazelemezsek
         kullanıcı kendi gönderisini göremez ve gitmedi sanır. */
      await load()
    } catch (submitError) {
      setError(submitError.message || t('feed.submitFailed'))
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
      setNotice(t('news.officialSaveNotice'))
    } catch (submitError) {
      setError(submitError.message || t('news.officialSaveFailed'))
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
      setNotice(t('news.publishedNotice', { title: post.title }))
    } catch (publishError) {
      setError(publishError.message || t('news.officialPublishFailed'))
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
      setNotice(t('news.aiDraftNotice'))
      await load()
    } catch (aiError) {
      setError(aiError.message || t('news.aiDraftFailed'))
    } finally {
      setAiLoading(false)
    }
  }

  async function moderate(postId, action) {
    const reason = action === 'reject' ? window.prompt(t('news.rejectReasonPrompt'))?.trim() : ''
    if (action === 'reject' && !reason) return
    try { await api.community.moderate(postId, action, reason); await load() }
    catch (moderationError) { setError(moderationError.message || t('news.moderationFailed')) }
  }

  /* Yazar kendi paylaşımını, yönetici her paylaşımı kaldırabilir —
     yetkiyi sunucu da ayrıca denetliyor, buradaki yalnız görünüm. */
  function kaldirilabilir(post) {
    return isAdmin || (post.author?.id != null && post.author.id === user?.id)
  }

  async function kaldir(postId) {
    if (!window.confirm(t('feed.removeConfirm'))) return
    try {
      await api.community.remove(postId)
      setNotice(t('feed.removeNotice'))
      await load()
    } catch (kaldirmaHatasi) {
      setError(kaldirmaHatasi.message || t('feed.removeFailed'))
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
      setError(hata.message || t('feed.actionFailed'))
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
      setNotice(t('feed.linkCopied'))
    } catch {
      setError(t('feed.linkCopyFailed'))
    }
  }

  function alintila(post) {
    setAlintilanan(post)
    setKutuAcik(true)
    document.getElementById('paylas')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const gonderiyiAc = postId => navigate(`/app/community/gonderi/${postId}`)

  async function reportPost(postId) {
    const allowed = ['spam', 'misinformation', 'harassment', 'unsafe', 'copyright', 'other']
    const reason = window.prompt(t('feed.reportPrompt'), 'misinformation')?.trim()
    if (!reason || !allowed.includes(reason)) return
    const details = reason === 'other' ? window.prompt(t('feed.reportDetailsPrompt'))?.trim() : undefined
    if (reason === 'other' && !details) return
    try { await api.community.report(postId, reason, details); setNotice(t('feed.reportSent')) }
    catch (reportError) { setError(reportError.message || t('feed.reportFailed')) }
  }

  async function resolveReport(reportId, action) {
    try { await api.community.resolveReport(reportId, action); await load() }
    catch (resolveError) { setError(resolveError.message || t('news.resolveReportFailed')) }
  }

  const featuredPost = isNews ? posts[0] : null
  const latestPosts = isNews ? posts.slice(1) : posts
  const gorunenPosts = useMemo(() => {
    const sorgu = aramaMetni.trim().toLocaleLowerCase(getFormatLocale())
    if (!sorgu) return posts
    return posts.filter(post => `${post.author?.name || ''} ${post.summary || ''}`
      .toLocaleLowerCase(getFormatLocale()).includes(sorgu))
  }, [aramaMetni, posts])

  return (
    <main className={`${styles.page} ${isNews ? styles.newsPage : styles.communityPage}`}>
      <header className={styles.pageHeading} data-tour="topluluk-baslik">
        <div>{isNews && <span className={styles.kicker}>{t('feed.kicker')}</span>}<h1>{isNews ? t('feed.headingNews') : t('feed.headingCommunity')}</h1>{isNews && <p>{t('feed.subtitleNews')}</p>}</div>
        {!isNews && (
          <Button
            variant="secondary"
            className={styles.createPostButton}
            onClick={() => setKutuAcik(true)}
          >
            <Plus size={17} aria-hidden="true" />
            <span>{t('feed.newPost')}</span>
          </Button>
        )}
      </header>

      {notice && <div className={styles.notice}>{notice}</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!isNews && (
        <div className={styles.communityGrid}>
          <div className={styles.mainColumn}>
            {/*
              * TEK KUTU, BAŞLIK YOK — X benzeri serbest paylaşım
              * (ürün kararı, 22.08.2026). Eskiden zorunlu başlık ve
              * 20 karakter alt sınırı vardı; kısa bir not paylaşmak
              * imkânsızdı. Kutu artık hep açık: "Gönderi oluştur"
              * düğmesine basmak fazladan bir adımdı.
              */}
            {kutuAcik && <section id="paylas" className={`${styles.composer} ${styles.composerAcik}`}>
              <button
                type="button"
                className={styles.kutuKapat}
                onClick={() => setKutuAcik(false)}
                aria-label={t('feed.composer.close')}
              >
                <X size={18} />
              </button>
              <div className={styles.composerTitle}>
                <span className={styles.authorAvatar}>{initials(user?.name)}</span>
                <span>
                  <h2>{alintilanan ? t('feed.composer.quoting') : t('feed.composer.prompt')}</h2>
                  <p>{t('feed.composer.hint')}</p>
                </span>
              </div>
              <form onSubmit={submitUserPost} className={styles.form}>
                <textarea aria-label={t('feed.composer.textAria')} placeholder={alintilanan ? t('feed.composer.placeholderQuote') : t('feed.composer.placeholder')} value={metin} onChange={event => setMetin(event.target.value)} maxLength={500} rows={3} />
                {alintilanan && (
                  <div className={styles.alintiSecili}>
                    <AlintiBlogu alinti={{ ...alintilanan, kaldirildi: false }} />
                    <button type="button" onClick={() => setAlintilanan(null)} aria-label={t('feed.composer.removeQuote')}><X size={16} /></button>
                  </div>
                )}
                <div className={styles.composerFooter}>
                  <div className={styles.composerTools}>
                    <MediaPicker media={userMedia} onChange={setUserMedia} disabled={submitting} videoIzinli />
                    <EtiketSecici kisiler={contributors} onSelect={kisi => {
                      const etiket = `@${kisi.name.trim().replace(/\s+/g, '_')}`
                      setMetin(mevcut => `${mevcut}${mevcut && !mevcut.endsWith(' ') ? ' ' : ''}${etiket} `)
                    }} />
                  </div>
                  <span className={styles.composerSayac}>
                    <small aria-live="polite">{metin.length}/500</small>
                    <Button type="submit" disabled={submitting || (!metin.trim() && !userMedia && !alintilanan)}><Send size={17} />{submitting ? t('feed.composer.submitting') : t('feed.composer.share')}</Button>
                  </span>
                </div>
              </form>
            </section>}
            {isAdmin && <AdminPanel {...{ showOfficialComposer: isNews, pending, reports, officialPost, setOfficialPost, officialMedia, setOfficialMedia, submitting, publishing, submitOfficialPost, createAndPublishOfficialPost, resetOfficialPost, adminPanelOpen, setAdminPanelOpen, aiSourceText, setAiSourceText, aiLoading, createAiOfficialDraft, moderate, resolveReport }} />}
            <section className={styles.feed} aria-live="polite">
              {loading && <FeedSkeleton />}
              {!loading && gorunenPosts.length === 0 && <EmptyState text={aramaMetni ? t('feed.empty.search') : t('feed.empty.feed')} />}
              {/* Tek tip akış: "öne çıkan tartışma" bloğu kalktı. Başlıksız
                  paylaşımlarda o blok boş bir başlık gösteriyordu, ayrıca
                  X'te de ilk gönderi büyütülmüyor. */}
              <div className={styles.discussionList}>{gorunenPosts.map(post => (
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
          <CommunityRail posts={posts} contributors={contributors} arama={aramaMetni} setArama={setAramaMetni} onAc={gonderiyiAc} isAdmin={isAdmin} />
        </div>
      )}

      {isNews && (
        <>
          {isAdmin && <AdminPanel {...{ showOfficialComposer: isNews, pending, reports, officialPost, setOfficialPost, officialMedia, setOfficialMedia, submitting, publishing, submitOfficialPost, createAndPublishOfficialPost, resetOfficialPost, adminPanelOpen, setAdminPanelOpen, aiSourceText, setAiSourceText, aiLoading, createAiOfficialDraft, moderate, resolveReport }} />}
          {loading ? <FeedSkeleton /> : posts.length === 0 ? <EmptyState text={t('news.emptyOfficial')} /> : (
            <div className={styles.newsGrid}>
              <div className={styles.newsMain}>
                <FeaturedNews post={featuredPost} onReport={reportPost} />
                <div className={styles.sectionHeading}><h2>{t('news.latest')}</h2><span>{t('news.sourceSummaries', { count: posts.length })}</span></div>
                <section className={styles.newsList}>{latestPosts.map(post => <NewsCard key={post.id} post={post} onReport={reportPost} />)}</section>
              </div>
              <aside className={styles.newsRail}>
                <section className={styles.railCard}><h2><TrendingUp size={19} /> {t('news.featuredRail')}</h2>{posts.slice(0, 5).map((post, index) => <a key={post.id} href={post.sourceUrl || '#'} target={post.sourceUrl ? '_blank' : undefined} rel="noreferrer noopener"><b>{String(index + 1).padStart(2, '0')}</b><span>{post.title}<small>{timeAgo(post.publishedAt, t)}</small></span></a>)}</section>
                <section className={styles.sourcePromise}><Star size={22} /><h2>{t('news.trustedTitle')}</h2><p>{t('news.trustedBody')}</p></section>
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
/*
 * Büyütülmüş medyanın yanındaki panel: gönderi metni ve yanıtları.
 * Ürün sahibinin "üstüne basınca direkt o açılmalı, altında yorumlar
 * falan" isteği.
 *
 * Yanıtlar AÇILDIĞINDA çekiliyor, akış yüklenirken değil: akıştaki her
 * gönderi için yanıt ağacı indirmek, kimsenin bakmayacağı veriyi
 * indirmek olurdu.
 */
function MedyaYanPaneli({ postId }) {
  const { t } = useTranslation('community')
  const [veri, setVeri] = useState(null)
  const [hata, setHata] = useState('')

  useEffect(() => {
    let iptal = false
    api.community.post(postId)
      .then(sonuc => { if (!iptal) setVeri(sonuc.post) })
      .catch(e => { if (!iptal) setHata(e.message || t('feed.panel.loadFailed')) })
    return () => { iptal = true }
  }, [postId, t])

  if (hata) return <p className={styles.postText}>{hata}</p>
  if (!veri) return <p className={styles.postText}>{t('feed.panel.loading')}</p>

  return (
    <section className={styles.medyaKonu} aria-label={t('feed.panel.speechAria')}>
      <div className={styles.medyaKonuBaslik}>{t('feed.panel.postLabel')}</div>
      <div className={styles.medyaGonderi}>
        <span className={styles.kucukAvatar}>{initials(veri.author?.name)}</span>
        <div>
          <div className={styles.postHead}>
            <strong>{veri.author?.name || t('feed.defaultAuthor')}</strong>
            <small>{timeAgo(veri.publishedAt, t)}</small>
          </div>
          {veri.summary && <p className={styles.postText}>{veri.summary}</p>}
          <p className={styles.baglamEtiketi}>{t('feed.panel.stats', { likes: veri.begeniSayisi, replies: veri.yanitSayisi })}</p>
        </div>
      </div>
      <div className={styles.medyaYanitlar}>
        <h3>{t('feed.panel.replies')}</h3>
        {veri.replies?.map(yanit => (
          <div key={yanit.id} className={styles.yanPanelYanit}>
            <span className={styles.kucukAvatar}>{initials(yanit.author?.name)}</span>
            <div>
              <div className={styles.postHead}>
                <strong>{yanit.author?.name || t('feed.defaultAuthor')}</strong>
                <small>{timeAgo(yanit.publishedAt, t)}</small>
              </div>
              {yanit.summary && <p className={styles.postText}>{yanit.summary}</p>}
            </div>
          </div>
        ))}
        {veri.yanitSayisi === 0 && <p className={styles.baglamEtiketi}>{t('feed.panel.repliesEmpty')}</p>}
      </div>
    </section>
  )
}

export function GonderiMenusu({ kaldirilabilir, onRemove, onReport }) {
  const { t } = useTranslation('community')
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
        aria-label={t('feed.actions.menu')}
      >
        <MoreHorizontal size={18} />
      </button>
      {acik && (
        <div className={styles.menuListesi} role="menu">
          <button type="button" role="menuitem" onClick={() => { setAcik(false); onReport() }}>
            <Flag size={15} /> {t('feed.actions.report')}
          </button>
          {kaldirilabilir && (
            <button
              type="button"
              role="menuitem"
              className={styles.menuYikici}
              onClick={() => { setAcik(false); onRemove() }}
            >
              <Trash2 size={15} /> {t('feed.actions.remove')}
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
export function AlintiBlogu({ alinti, onEtkilesim, onYanitla, onAlintila, onPaylas }) {
  const { t } = useTranslation('community')
  if (!alinti) return null
  if (alinti.kaldirildi) {
    return <div className={`${styles.alinti} ${styles.alintiYok}`}>{t('feed.quote.removed')}</div>
  }
  return (
    <div className={styles.alinti}>
      <div className={styles.alintiBasligi}>
        <span className={styles.kucukAvatar}>{initials(alinti.author?.name)}</span>
        <strong>{alinti.author?.name || t('feed.defaultAuthor')}</strong>
        <small>{timeAgo(alinti.publishedAt, t)}</small>
      </div>
      {alinti.summary && <p>{alinti.summary}</p>}
      {/* Alıntılanan medyayı büyütünce ALINTILANAN gönderinin kendi
          yanıtları görünüyor; alıntıyı yazanın değil. Kullanıcı o
          medyaya baktığı için onun bağlamını bekler. */}
      <PostMedia
        media={alinti.media}
        kucuk
        yanPanel={<MedyaYanPaneli postId={alinti.id} />}
        overlayText={alinti.summary}
        mediaActions={onEtkilesim && onYanitla && onAlintila && onPaylas ? (
          <IslemSatiri
            post={alinti}
            onEtkilesim={onEtkilesim}
            onYanitla={onYanitla}
            onAlintila={onAlintila}
            onPaylas={onPaylas}
            overlay
          />
        ) : null}
      />
    </div>
  )
}

function sayiyiYaz(n, t) {
  if (!n) return ''
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0).replace('.0', '')}${t('feed.countThousand')}`
}

/*
 * ISLEM SATIRI — Begen · Yanitla · Alintila · Paylas
 *
 * Sayilar SUNUCUDAN geliyor, istemcide artirilmiyor: baska biri ayni
 * anda begenirse yerel sayac yanlisa kayardi. Iyimser guncelleme
 * yalniz kendi isaretim (dolu/bos kalp) icin yapiliyor -- o benim
 * eylemim ve gecikmesi kotu hissettiriyor.
 */
export function IslemSatiri({ post, onEtkilesim, onYanitla, onAlintila, onPaylas, overlay = false }) {
  const { t } = useTranslation('community')
  return (
    <div className={`${styles.islemSatiri} ${overlay ? styles.islemSatiriOverlay : ''}`}>
      <button
        type="button"
        className={post.begendim ? styles.islemAktif : undefined}
        onClick={() => onEtkilesim(post, 'like', !post.begendim)}
        aria-pressed={post.begendim}
      >
        <Heart size={17} fill={post.begendim ? 'currentColor' : 'none'} />
        <span>{t('feed.actions.like')}</span>
        {post.begeniSayisi > 0 && <b>{sayiyiYaz(post.begeniSayisi, t)}</b>}
      </button>

      <button type="button" onClick={() => onYanitla(post)}>
        <MessageCircle size={17} />
        <span>{t('feed.actions.reply')}</span>
        {post.yanitSayisi > 0 && <b>{sayiyiYaz(post.yanitSayisi, t)}</b>}
      </button>

      <button type="button" onClick={event => { event.stopPropagation(); onAlintila(post) }}>
        <Repeat2 size={18} />
        <span>{t('feed.actions.quote')}</span>
        {post.alintiSayisi > 0 && <b>{sayiyiYaz(post.alintiSayisi, t)}</b>}
      </button>

      <button
        type="button"
        className={post.kaydettim ? styles.islemAktif : undefined}
        onClick={() => onEtkilesim(post, 'bookmark', !post.kaydettim)}
        aria-pressed={post.kaydettim}
        aria-label={post.kaydettim ? t('feed.actions.unsave') : t('feed.actions.save')}
      >
        <Bookmark size={17} fill={post.kaydettim ? 'currentColor' : 'none'} />
        <span>{t('feed.actions.save')}</span>
      </button>

      <button type="button" onClick={() => onPaylas(post)} aria-label={t('feed.actions.share')}>
        <Share2 size={17} />
        <span>{t('feed.actions.share')}</span>
      </button>
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
function EtiketliMetin({ children }) {
  const parcalar = String(children || '').split(/(@[\p{L}\p{N}_]+)/gu)
  return (
    <>{parcalar.map((parca, index) => parca.startsWith('@')
      ? <span className={styles.mention} key={`${parca}-${index}`}>{parca.replaceAll('_', ' ')}</span>
      : parca)}</>
  )
}

function EtiketSecici({ kisiler, onSelect }) {
  const { t } = useTranslation('community')
  const [acik, setAcik] = useState(false)
  if (!kisiler.length) return null
  return (
    <div className={styles.mentionPicker}>
      <button type="button" className={styles.toolButton} onClick={() => setAcik(deger => !deger)} aria-expanded={acik} aria-haspopup="listbox">
        <AtSign size={18} aria-hidden="true" /><span>{t('feed.mention.pick')}</span>
      </button>
      {acik && <div className={styles.mentionList} role="listbox" aria-label={t('feed.mention.listAria')}>
        {kisiler.map(kisi => <button key={kisi.id || kisi.name} type="button" role="option" onClick={() => { onSelect(kisi); setAcik(false) }}>
          <span className={styles.kucukAvatar}>{initials(kisi.name)}</span>{kisi.name}
        </button>)}
      </div>}
    </div>
  )
}

export function CommunityCard({ post, kaldirilabilir, onReport, onRemove, onEtkilesim, onYanitla, onAlintila, onPaylas, onAc, compact = false }) {
  const { t } = useTranslation('community')
  /*
   * Baslik yok: govde dogrudan metin. Avatar solda, icerik sagda tek
   * sutun -- eski duzen basliga gore kurulmustu ve yazarin ADINI
   * gizliyordu.
   */
  return (
    <article
      className={`${styles.communityCard} ${compact ? styles.compactCard : ''}`}
      onClick={event => {
        if (event.target.closest('button, a, input, textarea, select, [role="menu"]')) return
        onAc(post.id)
      }}
    >
      <span className={styles.authorAvatar}>{initials(post.author?.name)}</span>
      <div className={styles.postBody}>
        <div className={styles.postHead}>
          <strong>{post.author?.name || t('feed.defaultAuthor')}</strong>
          <small>{timeAgo(post.publishedAt, t)}</small>
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
          onClick={event => { event.stopPropagation(); onAc(post.id) }}
          onKeyDown={event => { if (event.key === 'Enter') onAc(post.id) }}
        >
          {post.summary && <p className={styles.postText}><EtiketliMetin>{post.summary}</EtiketliMetin></p>}
          <AlintiBlogu
            alinti={post.quotedPost}
            onEtkilesim={onEtkilesim}
            onYanitla={onYanitla}
            onAlintila={onAlintila}
            onPaylas={onPaylas}
          />
          <PostMedia
            media={post.media}
            yanPanel={<MedyaYanPaneli postId={post.id} />}
            overlayText={post.summary}
            mediaActions={post.media ? (
              <IslemSatiri
                post={post}
                onEtkilesim={onEtkilesim}
                onYanitla={onYanitla}
                onAlintila={onAlintila}
                onPaylas={onPaylas}
                overlay
              />
            ) : null}
          />
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
  const { t } = useTranslation('community')
  return <article className={styles.featuredNews}>
    <PostMedia media={post.media} featured />
    <div className={styles.featuredOverlay} />
    <div className={styles.featuredContent}><span className={styles.newsBadge}>{post.category ? `${categoryLabel(post.category, t)} · ` : ''}{t('news.badgeOfToday')}</span><h2>{post.title}</h2><p>{post.summary}</p>{post.content && <p className={styles.newsContent}>{post.content}</p>}<div><span><Clock size={15} /> {timeAgo(post.publishedAt, t)}</span>{post.sourceUrl && <a href={post.sourceUrl} target="_blank" rel="noreferrer noopener">{t('news.openSource')} <ExternalLink size={15} /></a>}<button type="button" onClick={() => onReport(post.id)}><Flag size={14} /> {t('feed.actions.report')}</button></div></div>
  </article>
}

function NewsCard({ post, onReport }) {
  const { t } = useTranslation('community')
  return <article className={styles.newsCard}><div className={styles.newsThumb}>{post.media?.kind === 'image' ? <PostMedia media={post.media} /> : <FileText size={34} />}</div><div className={styles.newsBody}><span>{post.category ? `${categoryLabel(post.category, t)} · ` : ''}{post.sourceTitle || t('news.defaultSource')}</span><h2>{post.title}</h2><p>{post.summary}</p>{post.content && <p className={styles.newsContent}>{post.content}</p>}<div><time>{timeAgo(post.publishedAt, t)}</time>{post.sourceUrl && <a href={post.sourceUrl} target="_blank" rel="noreferrer noopener">{t('news.goToSource')} <ExternalLink size={14} /></a>}<button type="button" onClick={() => onReport(post.id)} aria-label={t('news.reportNewsAria')}><Flag size={14} /></button></div></div></article>
}

/*
 * REKLAM GOSTERIMI.
 *
 * 🔴 OLUSTURMA BURADA DEGIL. Onceden `window.prompt` ile bu bilesenden
 * yapiliyordu; urun sahibi "islevsiz ve yanlis yerde" dedi. Artik
 * yonetim panelinde (AdminCommunity > Reklamlar). Bu bilesen yalniz
 * GOSTERIYOR.
 *
 * 🔴 GOSTERIM SAYACI EKRANDA GORUNUNCE ARTIYOR, sayfa yuklenince
 * degil. Sayfa yuklenmesinde saymak, hic goze carpmamis bir reklami
 * "goruldu" saymak olurdu -- yani sayi yalan soylerdi.
 *
 * KIMIN gordugu KAYDEDILMIYOR: sunucuda yalniz toplam sayac var.
 */
function ReklamKarti({ ad, isAdmin, onKaldir }) {
  const { t } = useTranslation('community')
  const kutuRef = useRef(null)
  const sayildiRef = useRef(false)

  useEffect(() => {
    const kutu = kutuRef.current
    if (!kutu) return undefined

    const gozlemci = new IntersectionObserver(([kayit]) => {
      /* Bir gorunumde BIR KEZ sayiliyor: kullanici asagi yukari
         kaydirdikca sayac sismemeli. */
      if (!kayit.isIntersecting || kayit.intersectionRatio < 0.5 || sayildiRef.current) return
      sayildiRef.current = true
      api.community.reklamOlayi(ad.id, 'impression')
      gozlemci.disconnect()
    }, { threshold: [0, 0.5] })

    gozlemci.observe(kutu)
    return () => gozlemci.disconnect()
  }, [ad.id])

  return (
    <section className={`${styles.railCard} ${styles.adCard}`} ref={kutuRef}>
      <small>{t('news.ads.label')}</small>
      <h2>{ad.title}</h2>
      {ad.media && <PostMedia media={ad.media} kucuk />}
      <p>{ad.body}</p>
      {ad.ctaUrl && (
        <a
          href={ad.ctaUrl}
          target="_blank"
          /* `nofollow`: tanitim baglantisi arama motoruna oneri
             sayilmamali. */
          rel="noreferrer noopener nofollow"
          onClick={() => api.community.reklamOlayi(ad.id, 'click')}
        >
          {ad.ctaLabel || t('news.ads.defaultCta')}
        </a>
      )}
      {isAdmin && <button type="button" onClick={() => onKaldir(ad.id)}>{t('feed.actions.remove')}</button>}
    </section>
  )
}

function CommunityAds({ isAdmin }) {
  const [ads, setAds] = useState([])

  const load = useCallback(() => api.community.ads()
    .then(r => setAds(r.ads || []))
    .catch(() => { /* Reklam kritik degil; ekrani bozmadan gec. */ }), [])

  useEffect(() => { load() }, [load])

  async function kaldir(adId) {
    await api.community.removeAd(adId)
    await load()
  }

  return <>{ads.map(ad => <ReklamKarti key={ad.id} ad={ad} isAdmin={isAdmin} onKaldir={kaldir} />)}</>
}

function CommunityRail({ posts, contributors, arama, setArama, onAc, isAdmin }) {
  const { t } = useTranslation('community')
  return <aside className={styles.communityRail} aria-label={t('feed.rail.label')}>
    <label className={styles.communitySearch}>
      <Search size={17} aria-hidden="true" />
      <input type="search" value={arama} onChange={event => setArama(event.target.value)} placeholder={t('feed.rail.searchPlaceholder')} aria-label={t('feed.rail.searchPlaceholder')} />
      {arama && <button type="button" onClick={() => setArama('')} aria-label={t('feed.rail.clearSearch')}><X size={15} /></button>}
    </label>
    <section className={styles.railCard}><h2><TrendingUp size={19} /> {t('feed.rail.trending')}</h2>{posts.length === 0 ? <p>{t('feed.rail.trendingEmpty')}</p> : posts.slice(0, 4).map((post, index) => <button type="button" className={styles.topicRow} key={post.id} onClick={() => onAc(post.id)}><span>{ozet(post, t)}</span><small>{index + 1}</small></button>)}</section>
    <section className={styles.railCard}><h2><Star size={19} /> {t('feed.rail.contributors')}</h2>{contributors.length === 0 ? <p>{t('feed.rail.contributorsEmpty')}</p> : contributors.map(person => <div className={styles.contributorRow} key={person.name}><span className={styles.authorAvatar}>{initials(person.name)}</span><span><strong>{person.name}</strong><small>{t('feed.rail.shareCount', { count: person.count })}</small></span></div>)}</section>
    <CommunityAds isAdmin={isAdmin} />
  </aside>
}

function AdminPanel(props) {
  const { t } = useTranslation('community')
  const { showOfficialComposer, pending, reports, officialPost, setOfficialPost, officialMedia, setOfficialMedia, submitting, publishing, submitOfficialPost, createAndPublishOfficialPost, resetOfficialPost, adminPanelOpen, setAdminPanelOpen, aiSourceText, setAiSourceText, aiLoading, createAiOfficialDraft, moderate, resolveReport } = props
  return <details id="yayin-araclari" className={styles.adminPanel} open={adminPanelOpen} onToggle={event => setAdminPanelOpen(event.currentTarget.open)}><summary><span>{showOfficialComposer ? t('news.admin.toolsNews') : t('news.admin.toolsPlain')}</span><small>{t('news.admin.queueSummary', { pending: pending.length, reports: reports.length })}</small></summary><div className={styles.adminContent}>{showOfficialComposer && <><h2>{t('news.admin.createTitle')}</h2><p>{t('news.admin.createHint')}</p><form onSubmit={submitOfficialPost} className={styles.form}><div className={styles.twoFields}><label>{t('news.admin.titleLabel')}<input value={officialPost.title} onChange={event => setOfficialPost({ ...officialPost, title: event.target.value })} required /></label><label>{t('news.admin.institutionLabel')}<input value={officialPost.sourceTitle} onChange={event => setOfficialPost({ ...officialPost, sourceTitle: event.target.value })} required /></label></div><div className={styles.twoFields}><label>{t('news.admin.categoryLabel')}<select value={officialPost.category} onChange={event => setOfficialPost({ ...officialPost, category: event.target.value })}><option value="">{t('news.admin.unselectedOption')}</option><option value="FINANS">{t('news.categories.finance')}</option><option value="MEVZUAT">{t('news.categories.legal')}</option><option value="VERGI">{t('news.categories.tax')}</option><option value="IS_DUNYASI">{t('news.categories.business')}</option><option value="DIJITALLESME">{t('news.categories.digital')}</option><option value="DESTEK">{t('news.categories.support')}</option><option value="GENEL_EKONOMI">{t('news.categories.economy')}</option></select></label><label>{t('news.admin.dateLabel')}<input type="datetime-local" value={officialPost.sourcePublishedAt} onChange={event => setOfficialPost({ ...officialPost, sourcePublishedAt: event.target.value })} /></label></div><label>{t('news.admin.urlLabel')}<input type="url" value={officialPost.sourceUrl} onChange={event => setOfficialPost({ ...officialPost, sourceUrl: event.target.value })} required /></label><label>{t('news.admin.summaryLabel')}<textarea value={officialPost.summary} onChange={event => setOfficialPost({ ...officialPost, summary: event.target.value })} minLength={20} maxLength={1200} rows={4} required /></label><label>{t('news.admin.contentLabel')}<textarea value={officialPost.content} onChange={event => setOfficialPost({ ...officialPost, content: event.target.value })} maxLength={10000} rows={6} placeholder={t('news.admin.contentPlaceholder')} /></label><div className={styles.composerFooter}><MediaPicker media={officialMedia} onChange={setOfficialMedia} disabled={submitting || publishing} /><span className={styles.publishActions}><button type="button" className={styles.primaryButton} onClick={createAndPublishOfficialPost} disabled={publishing || submitting}>{publishing ? t('news.admin.publishing') : t('news.admin.saveAndPublish')}</button><button className={styles.primaryButton} type="submit" disabled={submitting || publishing}>{submitting ? t('common:buttons.saving') : t('news.admin.saveDraft')}</button><button type="button" onClick={resetOfficialPost} disabled={submitting || publishing}>{t('news.admin.cancel')}</button></span></div></form><div className={styles.aiDraft}><h3>{t('news.admin.aiTitle')}</h3><textarea value={aiSourceText} onChange={event => setAiSourceText(event.target.value)} minLength={100} maxLength={12000} rows={4} placeholder={t('news.admin.aiPlaceholder')} /><button type="button" onClick={createAiOfficialDraft} disabled={aiLoading || !officialPost.sourceTitle || !officialPost.sourceUrl || aiSourceText.trim().length < 100}>{aiLoading ? t('news.admin.summarizing') : t('news.admin.aiCreate')}</button></div></>}<ModerationQueue pending={pending} reports={reports} moderate={moderate} resolveReport={resolveReport} /></div></details>
}

function ModerationQueue({ pending, reports, moderate, resolveReport }) {
  const { t } = useTranslation('community')
  return <div className={styles.moderationGrid}><section><h3>{t('news.admin.queueTitle', { count: pending.length })}</h3>{pending.map(post => <article key={post.id} className={styles.queueItem}><strong>{post.title}</strong><p>{post.summary}</p>{post.media && <div className={styles.pendingAttachment}><FileText size={16} /> {post.media.originalName}</div>}<div><button onClick={() => moderate(post.id, 'publish')}>{t('news.admin.publishAction')}</button><button onClick={() => moderate(post.id, 'reject')}>{t('news.admin.rejectAction')}</button></div></article>)}</section><section><h3>{t('news.admin.reportsTitle', { count: reports.length })}</h3>{reports.map(report => <article key={report.id} className={styles.queueItem}><strong>{report.post.title || ozet(report.post, t)}</strong><p>{report.details || report.reason}</p><div><button onClick={() => resolveReport(report.id, 'dismiss')}>{t('news.admin.dismissAction')}</button><button onClick={() => resolveReport(report.id, 'hide_post')}>{t('news.admin.hideAction')}</button></div></article>)}</section></div>
}

function FeedSkeleton() {
  const { t } = useTranslation('community')
  return <div className={styles.skeleton} aria-label={t('feed.contentLoading')}><span /><span /><span /></div>
}
function EmptyState({ text }) { return <div className={styles.empty}><Users size={34} /><p>{text}</p></div> }
