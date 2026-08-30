import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, FilePenLine, Flag, Image as ImageIcon, Megaphone, Newspaper, RefreshCw, Users, X } from 'lucide-react'
import { api } from '@/services/api'
import { Button, EmptyState } from '@/components/ui'
import styles from './AdminCommunity.module.css'
import { getFormatLocale } from '@/utils/formatters'

const TAB_KEYS = ['news', 'community', 'reports', 'ads']
const TAB_ICONS = { news: Newspaper, community: Users, reports: Flag, ads: Megaphone }

/*
 * REKLAM PANELI.
 *
 * Onceden topluluk sag rayinda `window.prompt` ucusuyla yapiliyordu:
 * baslik sor, metin sor, baglanti sor. Medya eklenemiyordu ve urun
 * sahibi "islevsiz ve yanlis yerde" dedi. Artik burada, duzgun bir
 * formla.
 *
 * 🔴 SAYACLAR TOPLAM, KISI BAGLANMIYOR (urun karari). Kisi bazinda
 * olcum gercek izlemedir ve StorageNotice'taki "hicbir ucuncu taraf
 * izleme araci calistirmiyor" taahhudunu bozardi. Panelde "1.240
 * gosterim, 37 tiklama" yaziyor; KIMIN gordugu hicbir yerde yok.
 */
function ReklamPaneli() {
  const { t } = useTranslation('admin')
  const [ads, setAds] = useState([])
  const [form, setForm] = useState({ title: '', body: '', ctaLabel: '', ctaUrl: '' })
  const [media, setMedia] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(() => api.community.tumReklamlar()
    .then(r => setAds(r.ads || []))
    .catch(e => setError(e.message || t('community.ads.loadError'))), [])

  useEffect(() => { load() }, [load])

  async function medyaSec(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy('media'); setError('')
    try {
      /* Topluluk medya hatti: sihirli bayt dogrulamasi ve imzali adres
         zaten orada. Ikinci bir yukleme yolu yazilmadi. */
      const sonuc = await api.community.uploadMedia(file)
      setMedia(sonuc.media)
    } catch (e) {
      setError(e.message || t('community.ads.mediaUploadError'))
    } finally { setBusy('') }
  }

  async function olustur(event) {
    event.preventDefault()
    setBusy('create'); setError(''); setMessage('')
    try {
      await api.community.createAd({
        title: form.title,
        body: form.body,
        ...(form.ctaUrl ? { ctaUrl: form.ctaUrl, ctaLabel: form.ctaLabel || t('community.ads.ctaDefault') } : {}),
        ...(media ? { mediaId: media.id } : {}),
      })
      setForm({ title: '', body: '', ctaLabel: '', ctaUrl: '' })
      setMedia(null)
      setMessage(t('community.ads.created'))
      await load()
    } catch (e) {
      setError(e.message || t('community.ads.createError'))
    } finally { setBusy('') }
  }

  async function kaldir(ad) {
    setBusy(ad.id); setError('')
    try { await api.community.removeAd(ad.id); await load() }
    catch (e) { setError(e.message || t('community.ads.removeError')) }
    finally { setBusy('') }
  }

  return (
    <>
      {error && <div className={styles.error}><AlertTriangle size={15} />{error}</div>}

      <section className={styles.createPanel}>
        <div>
          <Megaphone size={18} />
          <h2>{t('community.ads.formHeading')}</h2>
          <p>{t('community.ads.formDescription')}</p>
        </div>
        <form onSubmit={olustur}>
          <label>{t('community.ads.titleLabel')}<input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} minLength={2} maxLength={100} required /></label>
          <label>{t('community.ads.bodyLabel')}<textarea value={form.body} onChange={e => setForm(v => ({ ...v, body: e.target.value }))} minLength={2} maxLength={500} required /></label>
          <div className={styles.formGrid}>
            <label>{t('community.ads.ctaLabel')}<input value={form.ctaLabel} onChange={e => setForm(v => ({ ...v, ctaLabel: e.target.value }))} maxLength={40} placeholder={t('community.ads.ctaPlaceholder')} /></label>
            <label>{t('community.ads.urlLabel')}<input type="url" value={form.ctaUrl} onChange={e => setForm(v => ({ ...v, ctaUrl: e.target.value }))} placeholder="https://" /></label>
          </div>

          <label className={styles.medyaSec}>
            <ImageIcon size={16} />
            <span>{media ? media.originalName : t('community.ads.addMedia')}</span>
            <input className="sr-only" type="file" accept="image/png,image/jpeg,video/mp4,video/webm" onChange={medyaSec} disabled={busy === 'media'} />
          </label>
          {media && (
            <button type="button" className={styles.medyaKaldir} onClick={() => setMedia(null)}>
              <X size={14} /> {t('community.ads.removeMedia')}
            </button>
          )}

          <footer>
            {message && <span><Check size={14} />{message}</span>}
            <Button type="submit" disabled={busy === 'create' || busy === 'media'}>
              {busy === 'create' ? t('community.ads.publishing') : t('community.ads.publish')}
            </Button>
          </footer>
        </form>
      </section>

      <section className={styles.panel}>
        <header><h2>{t('community.ads.listHeading')}</h2><span>{ads.length} {t('community.ads.recordCount')}</span></header>
        <p className={styles.capabilityNote}>
          {t('community.ads.counterNote')}
        </p>
        {ads.length === 0 ? <EmptyState message={t('community.ads.empty')} /> : (
          <div className={styles.published}>
            {ads.map(ad => (
              <article key={ad.id}>
                <div>
                  <strong>{ad.title}</strong>
                  <small>
                    {ad.impressions} {t('community.ads.impressions')} · {ad.clicks} {t('community.ads.clicks')}
                    {ad.media ? ` · ${t('community.ads.withMedia')}` : ''}
                    {ad.active ? '' : ` · ${t('community.ads.passive')}`}
                  </small>
                </div>
                {ad.active
                  ? <Button variant="ghost" disabled={busy === ad.id} onClick={() => kaldir(ad)}>{busy === ad.id ? t('community.ads.removing') : t('community.ads.removeFromFeed')}</Button>
                  : <span>{t('community.ads.passive')}</span>}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

/*
 * KULLANICI SIKAYETLERI.
 *
 * Gonderi sikayetlerinden AYRI bir kuyruk: `CommunityReport`
 * gonderiye bagli, bu kisiye. Taciz tek bir gonderide olmayabilir --
 * birden cok mesajda ya da davranis oruntusunde olabilir.
 *
 * 🔴 COZUM BURADA YAPTIRIM UYGULAMIYOR, yalnizca kaydi kapatiyor.
 * Askiya alma Kullanicilar ekraninda: orada denetim kaydi yaziliyor
 * ve acik oturumlar dusuruluyor. Ayni isi iki yerde yapmak, birinde
 * denetim kaydi olan digerinde olmayan iki yol yaratirdi.
 */
function KullaniciSikayetleri() {
  const { t } = useTranslation('admin')
  const [reports, setReports] = useState([])
  const [notes, setNotes] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => api.community.kullaniciSikayetleri()
    .then(r => setReports(r.reports || []))
    .catch(e => setError(e.message || t('community.userReports.loadError'))), [])

  useEffect(() => { load() }, [load])

  async function coz(report, resolution) {
    setBusy(report.id); setError('')
    try {
      await api.community.sikayetiCoz(report.id, resolution, notes[report.id]?.trim() || undefined)
      await load()
    } catch (e) {
      setError(e.message || t('community.userReports.resolveError'))
    } finally { setBusy('') }
  }

  return (
    <section className={styles.panel}>
      <header><h2>{t('community.userReports.heading')}</h2><span>{reports.length} {t('community.userReports.open')}</span></header>
      {error && <div className={styles.error}><AlertTriangle size={15} />{error}</div>}
      <p className={styles.capabilityNote}>
        {t('community.userReports.description')}
      </p>
      {reports.length === 0 ? <EmptyState message={t('community.userReports.empty')} /> : (
        <div className={styles.rows}>
          {reports.map(report => (
            <article key={report.id}>
              <div className={styles.rowHead}>
                <span>{report.reason}</span>
                <time>{new Date(report.createdAt).toLocaleString(getFormatLocale())}</time>
              </div>
              <h3>{report.reported?.name || t('community.userReports.defaultUser')}</h3>
              {report.details && <p>{report.details}</p>}
              <small>
                {t('community.userReports.reporter')}: {report.reporter?.name || t('community.userReports.defaultUser')}
                {report.toplamSikayet > 1 && ` · ${t('community.userReports.multipleReports', { count: report.toplamSikayet })}`}
                {report.reported?.askida && ` · ${t('community.userReports.accountSuspended')}`}
              </small>
              <a href={`/app/profil/${report.reported?.id}`} target="_blank" rel="noreferrer">{t('community.userReports.openProfile')}</a>
              <textarea
                placeholder={t('community.userReports.resolutionNotePlaceholder')}
                value={notes[report.id] || ''}
                onChange={e => setNotes(v => ({ ...v, [report.id]: e.target.value }))}
              />
              <div className={styles.actions}>
                <button onClick={() => coz(report, 'dismiss')} disabled={busy === report.id}>{t('community.userReports.close')}</button>
                <Button variant="danger" onClick={() => coz(report, 'actioned')} disabled={busy === report.id}>
                  {t('community.userReports.closeWithAction')}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

export default function AdminCommunity() {
  const { t } = useTranslation('admin')
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
    })).catch(err => setError(err.message || t('community.errors.dataFetch'))).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const pending = useMemo(() => data.moderation.filter(post => tab === 'news' ? post.postType === 'official' : post.postType === 'user'), [data.moderation, tab])
  const published = tab === 'news' ? data.news : data.community

  async function moderate(post, action) {
    const reason = reasons[post.id]?.trim() || ''
    if (action === 'reject' && !reason) return setError(t('community.moderation.rejectReasonRequired'))
    setBusy(post.id); setError('')
    try { await api.community.moderate(post.id, action, reason || undefined); load() }
    catch (err) { setError(err.message || t('community.moderation.error')) }
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
  async function arsivle(post) {
    setBusy(post.id); setError('')
    try { await api.community.arsivle(post.id); load() }
    catch (err) { setError(err.message || t('community.moderation.archiveError')) }
    finally { setBusy('') }
  }

  /*
   * Duzenleme YALNIZ resmi gonderilerde -- sunucu da boyle uyguluyor.
   * Yoneticinin bir UYENIN gonderisini duzenlemesi, o kisinin agzina
   * laf koymak olurdu: metin degisir ama yazar adi ayni kalir.
   */
  async function duzenle(post) {
    const yeniOzet = window.prompt(t('community.moderation.editPrompt'), post.summary || '')?.trim()
    if (!yeniOzet || yeniOzet === post.summary) return
    setBusy(post.id); setError('')
    try { await api.community.duzenle(post.id, { summary: yeniOzet }); load() }
    catch (err) { setError(err.message || t('community.moderation.editError')) }
    finally { setBusy('') }
  }

  async function kaldir(post) {
    if (!window.confirm(t('community.moderation.confirmUnpublish'))) return
    setBusy(post.id); setError('')
    try { await api.community.remove(post.id); load() }
    catch (err) { setError(err.message || t('community.moderation.removeError')) }
    finally { setBusy('') }
  }

  async function resolveReport(report, action) {
    setBusy(report.id); setError('')
    try { await api.community.resolveReport(report.id, action, reasons[report.id]?.trim() || undefined); load() }
    catch (err) { setError(err.message || t('community.reports.resolveError')) }
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
      setFormMessage(t('community.news.created'))
      load()
    }     catch (err) { setError(err.message || t('community.news.createError')) }
    finally { setBusy('') }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}><div><span>{t('community.header.badge')}</span><h1>{t('community.header.heading')}</h1><p>{t('community.header.subheading')}</p></div><button type="button" onClick={load} disabled={loading}><RefreshCw size={15} /> {t('community.header.refresh')}</button></header>

      <nav className={styles.tabs} aria-label={t('community.header.tabsAria')}>{TAB_KEYS.map(id => {
        const Icon = TAB_ICONS[id]
        return <button key={id} className={tab === id ? styles.active : ''} onClick={() => setTab(id)}><Icon size={16} />{t(`community.tabs.${id}`)}{id === 'reports' && data.reports.length > 0 ? <b>{data.reports.length}</b> : null}</button>
      })}</nav>
      {error && <div className={styles.error}><AlertTriangle size={16} />{error}</div>}

      {tab === 'news' && <section className={styles.createPanel}><div><FilePenLine size={18} /><h2>{t('community.news.formHeading')}</h2><p>{t('community.news.formDescription')}</p></div><form onSubmit={createNews}><label>{t('community.news.titleLabel')}<input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} minLength={5} maxLength={180} required /></label><label>{t('community.news.summaryLabel')}<textarea value={form.summary} onChange={e => setForm(v => ({ ...v, summary: e.target.value }))} minLength={20} maxLength={1200} required /></label><div className={styles.formGrid}><label>{t('community.news.sourceTitleLabel')}<input value={form.sourceTitle} onChange={e => setForm(v => ({ ...v, sourceTitle: e.target.value }))} required /></label><label>{t('community.news.sourceUrlLabel')}<input type="url" value={form.sourceUrl} onChange={e => setForm(v => ({ ...v, sourceUrl: e.target.value }))} required /></label><label>{t('community.news.sourceDateLabel')}<input type="datetime-local" value={form.sourcePublishedAt} onChange={e => setForm(v => ({ ...v, sourcePublishedAt: e.target.value }))} /></label></div><footer>{formMessage && <span><Check size={14} />{formMessage}</span>}<Button type="submit" disabled={busy === 'create'}>{busy === 'create' ? t('community.news.creating') : t('community.news.createDraft')}</Button></footer></form></section>}

      {tab !== 'reports' && <>
        <section className={styles.panel}><header><h2>{tab === 'news' ? t('community.moderation.newsQueue') : t('community.moderation.communityQueue')}</h2><span>{pending.length} {t('community.moderation.pending')}</span></header>{loading ? <p className={styles.muted}>{t('community.moderation.loading')}</p> : pending.length === 0 ? <EmptyState message={t('community.moderation.empty')} /> : <div className={styles.rows}>{pending.map(post => <article key={post.id}><div className={styles.rowHead}><span>{post.postType === 'official' ? t('community.moderation.manualSource') : t('community.moderation.userPost')}</span><time>{new Date(post.createdAt).toLocaleString(getFormatLocale())}</time></div><h3>{post.title}</h3><p>{post.summary}</p><small>{t('community.moderation.author')}: {post.author?.name || post.author?.email || t('community.moderation.unknown')} · {t('community.moderation.status')}: {post.status}</small>{post.sourceUrl && <a href={post.sourceUrl} target="_blank" rel="noreferrer">{post.sourceTitle || t('community.moderation.openSource')}</a>}<textarea placeholder={t('community.moderation.rejectNotePlaceholder')} value={reasons[post.id] || ''} onChange={e => setReasons(v => ({ ...v, [post.id]: e.target.value }))} /><div className={styles.actions}><button onClick={() => moderate(post, 'reject')} disabled={busy === post.id}>{t('community.moderation.reject')}</button><Button onClick={() => moderate(post, 'publish')} disabled={busy === post.id}>{t('community.moderation.publish')}</Button></div></article>)}</div>}</section>
        <section className={styles.panel}><header><h2>{tab === 'news' ? t('community.published.newsHeading') : t('community.published.communityHeading')}</h2><span>{published.length} {t('community.published.recordCount')}</span></header><p className={styles.capabilityNote}>{t('community.published.capabilityNote')}</p>{published.length === 0 ? <EmptyState message={t('community.published.empty')} /> : <div className={styles.published}>{published.map(post => <article key={post.id}><div><strong>{post.title}</strong><small>{post.author?.name || (post.postType === 'official' ? t('community.published.officialSource') : t('community.published.defaultUser'))} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(getFormatLocale()) : t('community.published.noDate')}</small></div><span className={styles.satirEylemleri}>{post.postType === 'official' && <><button type="button" disabled={busy === post.id} onClick={() => duzenle(post)}>{t('community.published.edit')}</button><button type="button" disabled={busy === post.id} onClick={() => arsivle(post)}>{t('community.published.archive')}</button></>}<Button variant="ghost" disabled={busy === post.id} onClick={() => kaldir(post)}>{busy === post.id ? t('community.published.removing') : t('community.published.removeFromFeed')}</Button></span></article>)}</div>}</section>
        {tab === 'news' && <section className={styles.panel}><header><h2>{t('community.autoNews.heading')}</h2><span>{data.automatedNews.length} {t('community.autoNews.recordCount')}</span></header><p className={styles.capabilityNote}>{t('community.autoNews.capabilityNote')}</p>{data.automatedNews.length === 0 ? <EmptyState message={t('community.autoNews.empty')} /> : <div className={styles.published}>{data.automatedNews.map(article => <article key={article.id}><div><strong>{article.title}</strong><small>{article.sourceName} · {new Date(article.sourcePublishedAt).toLocaleDateString(getFormatLocale())}</small></div><span>{t('community.autoNews.autoLabel')}</span></article>)}</div>}</section>}
      </>}

      {tab === 'ads' && <ReklamPaneli />}

      {tab === 'reports' && <KullaniciSikayetleri />}

      {tab === 'reports' && <section className={styles.panel}><header><h2>{t('community.reports.openReports')}</h2><span>{data.reports.length} {t('community.reports.recordCount')}</span></header>{data.reports.length === 0 ? <EmptyState message={t('community.reports.empty')} /> : <div className={styles.rows}>{data.reports.map(report => <article key={report.id}><div className={styles.rowHead}><span>{report.reason}</span><time>{new Date(report.createdAt).toLocaleString(getFormatLocale())}</time></div><h3>{report.post?.title || t('community.reports.defaultPost')}</h3><p>{report.details || report.post?.summary}</p><small>{t('community.reports.reporter')}: {report.reporter?.name || t('community.reports.defaultUser')} · {t('community.reports.postStatus')}: {report.post?.status}</small><textarea placeholder={t('community.reports.resolutionNotePlaceholder')} value={reasons[report.id] || ''} onChange={e => setReasons(v => ({ ...v, [report.id]: e.target.value }))} /><div className={styles.actions}><button onClick={() => resolveReport(report, 'dismiss')} disabled={busy === report.id}>{t('community.reports.close')}</button><Button variant="danger" onClick={() => resolveReport(report, 'hide_post')} disabled={busy === report.id}>{t('community.reports.hidePost')}</Button></div></article>)}</div>}</section>}
    </main>
  )
}
