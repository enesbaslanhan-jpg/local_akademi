import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Bookmark, Heart, MessageSquare } from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { CommunityCard, initials } from './CommunityPage'
import styles from './CommunityPage.module.css'

/*
 * PROFİL SAYFASI — "paylaşımlarım, beğenilerim, kaydettiklerim".
 *
 * Arka uç bu sayfadan ÖNCE yazıldı ve testleri var:
 *   GET /community/me/summary
 *   GET /community/me/posts | likes | bookmarks
 *
 * Üç uç da kullanıcı kimliğini JETONDAN okuyor, adresten değil.
 * BAŞKASININ profili bilerek yok: kimin ne beğendiğinin başkasına
 * görünmesi ayrı bir gizlilik kararı ve ayrı bir metin değişikliği
 * gerektirir. "Kaydettiklerim" ise tanımı gereği kişiye özel.
 */

const SEKMELER = [
  { anahtar: 'posts', etiket: 'Paylaşımlarım', ikon: MessageSquare, sayiAlani: 'paylasim',
    bos: 'Henüz bir şey paylaşmadın.' },
  { anahtar: 'likes', etiket: 'Beğendiklerim', ikon: Heart, sayiAlani: 'begeni',
    bos: 'Henüz bir paylaşımı beğenmedin.' },
  { anahtar: 'bookmarks', etiket: 'Kaydettiklerim', ikon: Bookmark, sayiAlani: 'kayit',
    bos: 'Henüz bir paylaşım kaydetmedin.' },
]

export default function ProfilePage() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [arama, setArama] = useSearchParams()

  /* Sekme ADRESTE tutuluyor: topluluktaki profil kartı doğrudan
     "?liste=likes" ile geliyor ve bağlantı paylaşılabilir kalıyor. */
  const istenen = arama.get('liste')
  const aktif = SEKMELER.some(s => s.anahtar === istenen) ? istenen : 'posts'

  const [ozet, setOzet] = useState(null)
  const [posts, setPosts] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const [bildirim, setBildirim] = useState('')

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    setHata('')
    try {
      const [liste, sayilar] = await Promise.all([
        api.community.benimListem(aktif),
        api.community.benimOzetim(),
      ])
      setPosts(liste.posts || [])
      setOzet(sayilar)
    } catch (yuklemeHatasi) {
      setHata(yuklemeHatasi.message || 'Liste yüklenemedi.')
    } finally {
      setYukleniyor(false)
    }
  }, [aktif])

  useEffect(() => { yukle() }, [yukle])

  function kaldirilabilir(post) {
    return isAdmin || (post.author?.id != null && post.author.id === user?.id)
  }

  /*
   * Etkileşimden sonra liste yeniden yükleniyor.
   *
   * Burada iyimser güncelleme YANLIŞ olurdu: "Beğendiklerim"
   * sekmesinde bir gönderinin beğenisini kaldırmak, onu listeden
   * DÜŞÜRMELİ. Yerinde işaret değiştirmek, kullanıcıyı beğenmediği
   * bir gönderinin beğeni listesinde durduğuna inandırırdı.
   */
  async function etkilesimDegistir(post, tur, aktifMi) {
    try {
      await api.community.etkilesim(post.id, tur, aktifMi)
      await yukle()
    } catch (etkilesimHatasi) {
      setHata(etkilesimHatasi.message || 'İşlem tamamlanamadı.')
    }
  }

  async function kaldir(postId) {
    if (!window.confirm('Bu paylaşım kaldırılsın mı?')) return
    try {
      await api.community.remove(postId)
      setBildirim('Paylaşım kaldırıldı.')
      await yukle()
    } catch (kaldirmaHatasi) {
      setHata(kaldirmaHatasi.message || 'Paylaşım kaldırılamadı.')
    }
  }

  async function raporla(postId) {
    const izinli = ['spam', 'misinformation', 'harassment', 'unsafe', 'copyright', 'other']
    const neden = window.prompt('Rapor nedeni: spam, misinformation, harassment, unsafe, copyright veya other', 'misinformation')?.trim()
    if (!neden || !izinli.includes(neden)) return
    const ayrinti = neden === 'other' ? window.prompt('Kısa açıklama')?.trim() : undefined
    if (neden === 'other' && !ayrinti) return
    try {
      await api.community.report(postId, neden, ayrinti)
      setBildirim('Rapor moderasyon ekibine iletildi.')
    } catch (raporHatasi) {
      setHata(raporHatasi.message || 'Rapor gönderilemedi.')
    }
  }

  async function paylas(post) {
    const adres = `${window.location.origin}/app/community/gonderi/${post.id}`
    if (navigator.share) {
      try { await navigator.share({ title: 'LocalKarar', text: post.summary || '', url: adres }) } catch { /* vazgeçildi */ }
      return
    }
    try {
      await navigator.clipboard.writeText(adres)
      setBildirim('Bağlantı kopyalandı.')
    } catch {
      setHata('Bağlantı kopyalanamadı.')
    }
  }

  const aktifSekme = SEKMELER.find(s => s.anahtar === aktif)

  return (
    <main className={`${styles.page} ${styles.communityPage}`}>
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.kicker}>PROFİLİM</span>
          <h1>{user?.name || 'LocalKarar kullanıcısı'}</h1>
          <p>Paylaştıkların, beğendiklerin ve kendine kaydettiklerin.</p>
        </div>
        <span className={styles.authorAvatar}>{initials(user?.name)}</span>
      </header>

      {bildirim && <div className={styles.notice}>{bildirim}</div>}
      {hata && <div className={styles.error}>{hata}</div>}

      <nav className={styles.profilSekmeleri} aria-label="Profil listeleri">
        {SEKMELER.map(sekme => (
          <button
            key={sekme.anahtar}
            type="button"
            className={sekme.anahtar === aktif ? styles.profilSekmeAktif : undefined}
            /* `aria-current`: hangi sekmede olunduğu ekran okuyucuya da
               söylenmeli; yalnız renkle belirtmek yeterli değil. */
            aria-current={sekme.anahtar === aktif ? 'page' : undefined}
            onClick={() => setArama({ liste: sekme.anahtar })}
          >
            <sekme.ikon size={16} aria-hidden="true" />
            <span>{sekme.etiket}</span>
            {ozet && <b>{ozet[sekme.sayiAlani]}</b>}
          </button>
        ))}
      </nav>

      <section className={styles.feed} aria-live="polite">
        {yukleniyor && <div className={styles.skeleton} aria-label="İçerik yükleniyor"><span /><span /><span /></div>}

        {!yukleniyor && posts.length === 0 && (
          <div className={styles.empty}>
            <aktifSekme.ikon size={34} aria-hidden="true" />
            <p>{aktifSekme.bos}</p>
          </div>
        )}

        <div className={styles.discussionList}>
          {posts.map(post => (
            <CommunityCard
              key={post.id}
              post={post}
              kaldirilabilir={kaldirilabilir(post)}
              onReport={raporla}
              onRemove={kaldir}
              onEtkilesim={etkilesimDegistir}
              onYanitla={p => navigate(`/app/community/gonderi/${p.id}`)}
              onAlintila={p => navigate(`/app/community/topluluk?alinti=${p.id}`)}
              onPaylas={paylas}
              onAc={id => navigate(`/app/community/gonderi/${id}`)}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
