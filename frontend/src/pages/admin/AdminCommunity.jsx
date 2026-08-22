import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, FilePenLine, Flag, Image as ImageIcon, Megaphone, Newspaper, RefreshCw, Users, X } from 'lucide-react'
import { api } from '@/services/api'
import { Button, EmptyState } from '@/components/ui'
import styles from './AdminCommunity.module.css'

const TABS = [
  ['news', 'Haberler', Newspaper],
  ['community', 'Topluluk', Users],
  ['reports', 'Şikâyetler', Flag],
  /* Reklam olusturma buraya TASINDI: onceden topluluk sag rayinda
     `window.prompt` ile yapiliyordu ve yanlis yerdeydi. */
  ['ads', 'Reklamlar', Megaphone],
]

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
  const [ads, setAds] = useState([])
  const [form, setForm] = useState({ title: '', body: '', ctaLabel: '', ctaUrl: '' })
  const [media, setMedia] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(() => api.community.tumReklamlar()
    .then(r => setAds(r.ads || []))
    .catch(e => setError(e.message || 'Reklamlar alınamadı.')), [])

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
      setError(e.message || 'Dosya yüklenemedi.')
    } finally { setBusy('') }
  }

  async function olustur(event) {
    event.preventDefault()
    setBusy('create'); setError(''); setMessage('')
    try {
      await api.community.createAd({
        title: form.title,
        body: form.body,
        ...(form.ctaUrl ? { ctaUrl: form.ctaUrl, ctaLabel: form.ctaLabel || 'İncele' } : {}),
        ...(media ? { mediaId: media.id } : {}),
      })
      setForm({ title: '', body: '', ctaLabel: '', ctaUrl: '' })
      setMedia(null)
      setMessage('Reklam yayına alındı.')
      await load()
    } catch (e) {
      setError(e.message || 'Reklam oluşturulamadı.')
    } finally { setBusy('') }
  }

  async function kaldir(ad) {
    setBusy(ad.id); setError('')
    try { await api.community.removeAd(ad.id); await load() }
    catch (e) { setError(e.message || 'Reklam kaldırılamadı.') }
    finally { setBusy('') }
  }

  return (
    <>
      {error && <div className={styles.error}><AlertTriangle size={15} />{error}</div>}

      <section className={styles.createPanel}>
        <div>
          <Megaphone size={18} />
          <h2>Yeni tanıtım</h2>
          <p>Topluluk akışının yanında gösterilir. Görsel veya video ekleyebilirsin.</p>
        </div>
        <form onSubmit={olustur}>
          <label>Başlık<input value={form.title} onChange={e => setForm(v => ({ ...v, title: e.target.value }))} minLength={2} maxLength={100} required /></label>
          <label>Metin<textarea value={form.body} onChange={e => setForm(v => ({ ...v, body: e.target.value }))} minLength={2} maxLength={500} required /></label>
          <div className={styles.formGrid}>
            <label>Buton yazısı<input value={form.ctaLabel} onChange={e => setForm(v => ({ ...v, ctaLabel: e.target.value }))} maxLength={40} placeholder="İncele" /></label>
            <label>Bağlantı<input type="url" value={form.ctaUrl} onChange={e => setForm(v => ({ ...v, ctaUrl: e.target.value }))} placeholder="https://" /></label>
          </div>

          <label className={styles.medyaSec}>
            <ImageIcon size={16} />
            <span>{media ? media.originalName : 'Görsel veya video ekle'}</span>
            <input className="sr-only" type="file" accept="image/png,image/jpeg,video/mp4,video/webm" onChange={medyaSec} disabled={busy === 'media'} />
          </label>
          {media && (
            <button type="button" className={styles.medyaKaldir} onClick={() => setMedia(null)}>
              <X size={14} /> Medyayı kaldır
            </button>
          )}

          <footer>
            {message && <span><Check size={14} />{message}</span>}
            <Button type="submit" disabled={busy === 'create' || busy === 'media'}>
              {busy === 'create' ? 'Yayınlanıyor…' : 'Yayınla'}
            </Button>
          </footer>
        </form>
      </section>

      <section className={styles.panel}>
        <header><h2>Tanıtımlar</h2><span>{ads.length} kayıt</span></header>
        <p className={styles.capabilityNote}>
          Sayaçlar toplamdır: hangi kullanıcının gördüğü ya da tıkladığı KAYDEDİLMEZ.
          Gösterim, reklam ekranda gerçekten göründüğünde sayılır — sayfa yüklenince değil.
        </p>
        {ads.length === 0 ? <EmptyState message="Henüz tanıtım yok." /> : (
          <div className={styles.published}>
            {ads.map(ad => (
              <article key={ad.id}>
                <div>
                  <strong>{ad.title}</strong>
                  <small>
                    {ad.impressions} gösterim · {ad.clicks} tıklama
                    {ad.media ? ' · medyalı' : ''}
                    {ad.active ? '' : ' · pasif'}
                  </small>
                </div>
                {ad.active
                  ? <Button variant="ghost" disabled={busy === ad.id} onClick={() => kaldir(ad)}>{busy === ad.id ? 'Kaldırılıyor…' : 'Yayından kaldır'}</Button>
                  : <span>Pasif</span>}
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
  const [reports, setReports] = useState([])
  const [notes, setNotes] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(() => api.community.kullaniciSikayetleri()
    .then(r => setReports(r.reports || []))
    .catch(e => setError(e.message || 'Şikâyetler alınamadı.')), [])

  useEffect(() => { load() }, [load])

  async function coz(report, resolution) {
    setBusy(report.id); setError('')
    try {
      await api.community.sikayetiCoz(report.id, resolution, notes[report.id]?.trim() || undefined)
      await load()
    } catch (e) {
      setError(e.message || 'Şikâyet çözülemedi.')
    } finally { setBusy('') }
  }

  return (
    <section className={styles.panel}>
      <header><h2>Kullanıcı şikâyetleri</h2><span>{reports.length} açık</span></header>
      {error && <div className={styles.error}><AlertTriangle size={15} />{error}</div>}
      <p className={styles.capabilityNote}>
        Çözmek yaptırım uygulamaz, yalnızca kaydı kapatır. Hesabı askıya almak için
        Yönetim → Kullanıcılar ekranını kullan; askıya alma orada denetim kaydına yazılır
        ve açık oturumları anında düşürür.
      </p>
      {reports.length === 0 ? <EmptyState message="Açık kullanıcı şikâyeti yok." /> : (
        <div className={styles.rows}>
          {reports.map(report => (
            <article key={report.id}>
              <div className={styles.rowHead}>
                <span>{report.reason}</span>
                <time>{new Date(report.createdAt).toLocaleString('tr-TR')}</time>
              </div>
              <h3>{report.reported?.name || 'Kullanıcı'}</h3>
              {report.details && <p>{report.details}</p>}
              <small>
                Bildiren: {report.reporter?.name || 'Kullanıcı'}
                {/* Tek şikâyetle çoklu şikâyeti ayırt etmek yöneticinin
                    ilk sorusu; ikisi aynı görünseydi öncelik verilemezdi. */}
                {report.toplamSikayet > 1 && ` · bu kişi hakkında ${report.toplamSikayet} şikâyet`}
                {report.reported?.askida && ' · hesap askıda'}
              </small>
              <a href={`/app/profil/${report.reported?.id}`} target="_blank" rel="noreferrer">Profili aç</a>
              <textarea
                placeholder="Çözüm notu"
                value={notes[report.id] || ''}
                onChange={e => setNotes(v => ({ ...v, [report.id]: e.target.value }))}
              />
              <div className={styles.actions}>
                <button onClick={() => coz(report, 'dismiss')} disabled={busy === report.id}>Şikâyeti kapat</button>
                <Button variant="danger" onClick={() => coz(report, 'actioned')} disabled={busy === report.id}>
                  İşlem yapıldı olarak kapat
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
  async function arsivle(post) {
    setBusy(post.id); setError('')
    try { await api.community.arsivle(post.id); load() }
    catch (err) { setError(err.message || 'Arşivlenemedi.') }
    finally { setBusy('') }
  }

  /*
   * Duzenleme YALNIZ resmi gonderilerde -- sunucu da boyle uyguluyor.
   * Yoneticinin bir UYENIN gonderisini duzenlemesi, o kisinin agzina
   * laf koymak olurdu: metin degisir ama yazar adi ayni kalir.
   */
  async function duzenle(post) {
    const yeniOzet = window.prompt('Yeni özet metni', post.summary || '')?.trim()
    if (!yeniOzet || yeniOzet === post.summary) return
    setBusy(post.id); setError('')
    try { await api.community.duzenle(post.id, { summary: yeniOzet }); load() }
    catch (err) { setError(err.message || 'Düzenlenemedi.') }
    finally { setBusy('') }
  }

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
        <section className={styles.panel}><header><h2>Yayındaki {tab === 'news' ? 'haberler' : 'gönderiler'}</h2><span>{published.length} kayıt</span></header><p className={styles.capabilityNote}>Kaldırma gerçek silme değildir: gönderi listelerden düşer, şikâyet ve denetim izi korunur. Düzenleme ve arşivleme YALNIZ resmî içerikte: bir üyenin gönderisini düzenlemek, o kişinin ağzına laf koymak olurdu — uygunsuz üye içeriği için kaldırma kullanılır.</p>{published.length === 0 ? <EmptyState message="Yayında içerik yok." /> : <div className={styles.published}>{published.map(post => <article key={post.id}><div><strong>{post.title}</strong><small>{post.author?.name || (post.postType === 'official' ? 'Resmî kaynak' : 'Kullanıcı')} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('tr-TR') : 'Tarih yok'}</small></div><span className={styles.satirEylemleri}>{post.postType === 'official' && <><button type="button" disabled={busy === post.id} onClick={() => duzenle(post)}>Düzenle</button><button type="button" disabled={busy === post.id} onClick={() => arsivle(post)}>Arşivle</button></>}<Button variant="ghost" disabled={busy === post.id} onClick={() => kaldir(post)}>{busy === post.id ? 'Kaldırılıyor…' : 'Yayından kaldır'}</Button></span></article>)}</div>}</section>
        {tab === 'news' && <section className={styles.panel}><header><h2>Otomatik resmî haber akışı</h2><span>{data.automatedNews.length} kayıt</span></header><p className={styles.capabilityNote}>Bu kayıtlar NewsArticle ingestion hattından gelir ve manuel CommunityPost taslaklarından ayrı tutulur. Backend yalnız yayın listesini sağlıyor; ingestion durumu veya arşivleme için admin endpointi yoktur.</p>{data.automatedNews.length === 0 ? <EmptyState message="Otomatik akışta yayın bulunamadı." /> : <div className={styles.published}>{data.automatedNews.map(article => <article key={article.id}><div><strong>{article.title}</strong><small>{article.sourceName} · {new Date(article.sourcePublishedAt).toLocaleDateString('tr-TR')}</small></div><span>Otomatik</span></article>)}</div>}</section>}
      </>}

      {tab === 'ads' && <ReklamPaneli />}

      {tab === 'reports' && <KullaniciSikayetleri />}

      {tab === 'reports' && <section className={styles.panel}><header><h2>Açık şikâyetler</h2><span>{data.reports.length} kayıt</span></header>{data.reports.length === 0 ? <EmptyState message="Açık şikâyet yok." /> : <div className={styles.rows}>{data.reports.map(report => <article key={report.id}><div className={styles.rowHead}><span>{report.reason}</span><time>{new Date(report.createdAt).toLocaleString('tr-TR')}</time></div><h3>{report.post?.title || 'Gönderi'}</h3><p>{report.details || report.post?.summary}</p><small>Bildiren: {report.reporter?.name || 'Kullanıcı'} · Gönderi durumu: {report.post?.status}</small><textarea placeholder="Çözüm notu" value={reasons[report.id] || ''} onChange={e => setReasons(v => ({ ...v, [report.id]: e.target.value }))} /><div className={styles.actions}><button onClick={() => resolveReport(report, 'dismiss')} disabled={busy === report.id}>Şikâyeti kapat</button><Button variant="danger" onClick={() => resolveReport(report, 'hide_post')} disabled={busy === report.id}>Gönderiyi gizle</Button></div></article>)}</div>}</section>}
    </main>
  )
}
