import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { CommunityCard, initials } from './CommunityPage'
import styles from './CommunityPage.module.css'

/*
 * TEK GÖNDERİ SAYFASI — kalıcı adres.
 *
 * Üç işi birden görüyor:
 *   1. Yanıt yazılacak yer. Akışta satır içi yanıt kutusu açmak, her
 *      kartın altına bir form koymak demekti; X de yanıtı ayrı bir
 *      ekrana taşıyor.
 *   2. "Paylaş" düğmesinin gönderdiği adres. Bu sayfa olmadan
 *      paylaşılacak bir bağlantı yoktu.
 *   3. Derin konuşmaların devamı. Ağaç 3 seviye geliyor; daha derini
 *      için o yanıtın kendi adresine gidiliyor.
 *
 * GİRİŞ DUVARI KORUNUYOR (ürün kararı, 22.08.2026): sayfa korumalı
 * yolun altında. Üye olmayan biri bağlantıyı açarsa giriş ekranına
 * düşer ve giriş yapınca buraya döner.
 */

/* Girinti sınırı görsel: derinlik arttıkça mobilde metne yer kalmıyor.
   Veri tarafında sınır sunucuda (3 seviye). */
const EN_COK_GIRINTI = 3

function YanitAgaci({ dugumler, derinlik, ortak }) {
  if (!dugumler?.length) return null
  return (
    <div
      className={styles.yanitDali}
      style={{ marginLeft: derinlik <= EN_COK_GIRINTI ? undefined : 0 }}
    >
      {dugumler.map(dugum => (
        <div key={dugum.id}>
          <CommunityCard post={dugum} {...ortak(dugum)} />
          <YanitAgaci dugumler={dugum.replies} derinlik={derinlik + 1} ortak={ortak} />
        </div>
      ))}
    </div>
  )
}

export default function CommunityPostPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { isAdmin, user } = useAuth()

  const [post, setPost] = useState(null)
  const [parent, setParent] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const [bildirim, setBildirim] = useState('')
  const [yanitMetni, setYanitMetni] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    setHata('')
    try {
      const sonuc = await api.community.post(postId)
      setPost(sonuc.post)
      setParent(sonuc.parent)
    } catch (yuklemeHatasi) {
      setHata(yuklemeHatasi.message || 'Paylaşım yüklenemedi.')
    } finally {
      setYukleniyor(false)
    }
  }, [postId])

  useEffect(() => { yukle() }, [yukle])

  function kaldirilabilir(hedef) {
    return isAdmin || (hedef.author?.id != null && hedef.author.id === user?.id)
  }

  /*
   * Etkileşimden sonra sayfa TAMAMEN yeniden yükleniyor.
   *
   * Akıştaki gibi iyimser güncelleme yapmıyorum: burada gönderi bir
   * ağacın içinde ve doğru düğümü bulup yerinde değiştirmek, ağacı
   * özyinelemeli olarak kopyalamayı gerektirirdi. Tek gönderi
   * sayfasında bir istek fazladan yapmak, o karmaşıklığa değmez.
   */
  async function etkilesimDegistir(hedef, tur, aktif) {
    try {
      await api.community.etkilesim(hedef.id, tur, aktif)
      await yukle()
    } catch (etkilesimHatasi) {
      setHata(etkilesimHatasi.message || 'İşlem tamamlanamadı.')
    }
  }

  async function kaldir(id) {
    if (!window.confirm('Bu paylaşım kaldırılsın mı?')) return
    try {
      await api.community.remove(id)
      /* Sayfanın konusu kaldırıldıysa burada kalmanın anlamı yok. */
      if (id === post?.id) navigate('/app/community/topluluk')
      else await yukle()
    } catch (kaldirmaHatasi) {
      setHata(kaldirmaHatasi.message || 'Paylaşım kaldırılamadı.')
    }
  }

  async function raporla(id) {
    const izinli = ['spam', 'misinformation', 'harassment', 'unsafe', 'copyright', 'other']
    const neden = window.prompt('Rapor nedeni: spam, misinformation, harassment, unsafe, copyright veya other', 'misinformation')?.trim()
    if (!neden || !izinli.includes(neden)) return
    const ayrinti = neden === 'other' ? window.prompt('Kısa açıklama')?.trim() : undefined
    if (neden === 'other' && !ayrinti) return
    try {
      await api.community.report(id, neden, ayrinti)
      setBildirim('Rapor moderasyon ekibine iletildi.')
    } catch (raporHatasi) {
      setHata(raporHatasi.message || 'Rapor gönderilemedi.')
    }
  }

  async function paylas(hedef) {
    const adres = `${window.location.origin}/app/community/gonderi/${hedef.id}`
    if (navigator.share) {
      try { await navigator.share({ title: 'LocalKarar', text: hedef.summary || '', url: adres }) } catch { /* vazgeçildi */ }
      return
    }
    try {
      await navigator.clipboard.writeText(adres)
      setBildirim('Bağlantı kopyalandı.')
    } catch {
      setHata('Bağlantı kopyalanamadı.')
    }
  }

  async function yanitla(event) {
    event.preventDefault()
    if (!yanitMetni.trim()) return
    setGonderiliyor(true)
    setHata('')
    try {
      await api.community.submit({ metin: yanitMetni, parentId: post.id })
      setYanitMetni('')
      await yukle()
    } catch (yanitHatasi) {
      setHata(yanitHatasi.message || 'Yanıt gönderilemedi.')
    } finally {
      setGonderiliyor(false)
    }
  }

  const ortakKartOzellikleri = hedef => ({
    kaldirilabilir: kaldirilabilir(hedef),
    onReport: raporla,
    onRemove: kaldir,
    onEtkilesim: etkilesimDegistir,
    /* Bir yanıta yanıt vermek, o yanıtın kendi sayfasına gitmek demek —
       aynı sayfada iç içe form açmak konuşmayı okunmaz yapardı. */
    onYanitla: h => navigate(`/app/community/gonderi/${h.id}`),
    onAlintila: h => navigate(`/app/community/topluluk?alinti=${h.id}`),
    onPaylas: paylas,
    onAc: id => navigate(`/app/community/gonderi/${id}`),
  })

  return (
    <main className={`${styles.page} ${styles.communityPage}`}>
      <header className={styles.gonderiBasligi}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Geri dön">
          <ArrowLeft size={19} />
        </button>
        <h1>Paylaşım</h1>
      </header>

      {bildirim && <div className={styles.notice}>{bildirim}</div>}
      {hata && <div className={styles.error}>{hata}</div>}

      {yukleniyor && <div className={styles.skeleton} aria-label="İçerik yükleniyor"><span /><span /><span /></div>}

      {!yukleniyor && post && (
        <div className={styles.gonderiSutunu}>
          {parent && (
            <>
              {/* Yanıtın bağlamı: neye yanıt verildiği görünmeden
                  yanıt tek başına anlamsız olurdu. */}
              <p className={styles.baglamEtiketi}>Şu paylaşıma yanıt:</p>
              <CommunityCard post={parent} {...ortakKartOzellikleri(parent)} />
            </>
          )}

          <div className={styles.anaGonderi}>
            <CommunityCard post={post} {...ortakKartOzellikleri(post)} />
          </div>

          <form className={styles.yanitKutusu} onSubmit={yanitla}>
            <span className={styles.authorAvatar}>{initials(user?.name)}</span>
            <textarea
              aria-label="Yanıtın"
              placeholder="Yanıtını yaz…"
              value={yanitMetni}
              onChange={event => setYanitMetni(event.target.value)}
              maxLength={500}
              rows={2}
            />
            <button className={styles.primaryButton} type="submit" disabled={gonderiliyor || !yanitMetni.trim()}>
              <Send size={16} />{gonderiliyor ? 'Gönderiliyor…' : 'Yanıtla'}
            </button>
          </form>

          {post.replies?.length > 0 && (
            <section className={styles.yanitlar} aria-label="Yanıtlar">
              <h2>{post.yanitSayisi} yanıt</h2>
              <YanitAgaci dugumler={post.replies} derinlik={1} ortak={ortakKartOzellikleri} />
            </section>
          )}
        </div>
      )}
    </main>
  )
}
