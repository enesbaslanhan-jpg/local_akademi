import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Bookmark, Camera, Flag, Heart, Image as ImageIcon, Link2, MapPin,
  MessageSquare, Pencil, UserPlus, Users, X,
} from 'lucide-react'
import { api } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import { CommunityCard, initials } from './CommunityPage'
import styles from './CommunityPage.module.css'

/*
 * PROFİL SAYFASI — hem kendi profilim hem başkasınınki.
 *
 * `/app/profil`        → kendi profilim (düzenlenebilir)
 * `/app/profil/:userId` → başka üyenin profili
 *
 * 🔴 İKİ PROFİL AYNI SEKMELERİ GÖSTERMİYOR.
 *
 * Beğendiklerim ve Kaydettiklerim YALNIZ kendi profilimde. Ürün
 * kararı: "kaydettiklerim" tanımı gereği kişisel, beğeni de iş
 * dünyasında rakip gözetimi anlamına gelebiliyor. Sunucu da bunu
 * ayrıca uyguluyor — arayüz tek savunma hattı değil.
 *
 * Engel ve askıya alma sunucuda denetleniyor; burada yalnız 404'ü
 * kullanıcıya anlaşılır biçimde gösteriyoruz.
 */

const KENDI_SEKMELERI = [
  { anahtar: 'posts', etiket: 'Paylaşımlarım', ikon: MessageSquare, sayiAlani: 'paylasim', bos: 'Henüz bir şey paylaşmadın.' },
  { anahtar: 'media', etiket: 'Medya', ikon: ImageIcon, bos: 'Henüz görsel veya video paylaşmadın.' },
  { anahtar: 'likes', etiket: 'Beğendiklerim', ikon: Heart, sayiAlani: 'begeni', bos: 'Henüz bir paylaşımı beğenmedin.' },
  { anahtar: 'bookmarks', etiket: 'Kaydettiklerim', ikon: Bookmark, sayiAlani: 'kayit', bos: 'Henüz bir paylaşım kaydetmedin.' },
]

const BASKASININ_SEKMELERI = [
  { anahtar: 'posts', etiket: 'Paylaşımlar', ikon: MessageSquare, bos: 'Henüz bir şey paylaşmamış.' },
  { anahtar: 'media', etiket: 'Medya', ikon: ImageIcon, bos: 'Henüz görsel veya video paylaşmamış.' },
]

/*
 * Takipçi ve takip edilen listeleri SEKME DEĞİL.
 *
 * Önce hem üstteki sayaç satırında hem sekme şeridinde duruyorlardı —
 * aynı şey iki yerde. Ürün sahibi bunu fark etti ve üstteki küçük
 * sayaçların kalmasını istedi.
 *
 * Bu yüzden geçerli liste değerleri sekmelerden AYRI tutuluyor:
 * "followers" geçerli bir görünüm ama sekmesi yok, sayaçtan açılıyor.
 */
const KISI_LISTELERI = {
  followers: { etiket: 'Takipçiler', ikon: Users, bos: 'Henüz takipçisi yok.' },
  following: { etiket: 'Takip edilenler', ikon: UserPlus, bos: 'Henüz kimseyi takip etmiyor.' },
}

/* Düzenleme paneli ayrı bileşen: sayfa zaten liste, sekme ve profil
   durumunu taşıyor; form durumunu da aynı yere koymak okunmaz yapardı. */
function ProfilDuzenle({ user, onKapat, onKaydedildi }) {
  const [ad, setAd] = useState(user?.name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [konum, setKonum] = useState(user?.location || '')
  const [adres, setAdres] = useState(user?.websiteUrl || '')
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [hata, setHata] = useState('')

  async function kaydet(olay) {
    olay.preventDefault()
    setKaydediliyor(true)
    setHata('')
    try {
      const sonuc = await api.profil.guncelle({ name: ad, bio, location: konum, websiteUrl: adres })
      onKaydedildi(sonuc)
    } catch (kaydetmeHatasi) {
      setHata(kaydetmeHatasi.message || 'Profil kaydedilemedi.')
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <form className={styles.profilDuzenle} onSubmit={kaydet}>
      {hata && <p className={styles.error}>{hata}</p>}
      <label>Ad<input value={ad} onChange={e => setAd(e.target.value)} minLength={2} maxLength={80} required /></label>
      <label>
        Hakkında
        <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={280} rows={3} placeholder="İşletmenden kısaca bahset" />
        <small>{bio.length}/280</small>
      </label>
      <label>Konum<input value={konum} onChange={e => setKonum(e.target.value)} maxLength={60} placeholder="Ankara / Yenimahalle" /></label>
      {/* `type="url"` tarayıcıya da doğrulatıyor; sunucu ayrıca yalnız
          http/https kabul ediyor — serbest metin bırakılsaydı
          `javascript:` adresi profile konabilirdi. */}
      <label>Web adresi<input type="url" value={adres} onChange={e => setAdres(e.target.value)} maxLength={200} placeholder="https://" /></label>
      <div className={styles.profilDuzenleAlt}>
        <Button variant="ghost" onClick={onKapat}>Vazgeç</Button>
        <Button type="submit" disabled={kaydediliyor}>{kaydediliyor ? 'Kaydediliyor…' : 'Kaydet'}</Button>
      </div>
    </form>
  )
}

/*
 * KİŞİYİ ŞİKÂYET ET.
 *
 * Gönderi şikâyeti `window.prompt` ile yapılıyordu ve neden listesini
 * kullanıcıya EZBERLETMEK zorunda bırakıyordu ("spam, misinformation,
 * harassment... yazın"). Kişi şikâyetinde o hatayı tekrarlamıyoruz:
 * seçenekler listeleniyor.
 */
const SIKAYET_NEDENLERI = [
  ['harassment', 'Taciz veya hakaret'],
  ['spam', 'Spam / istenmeyen mesaj'],
  ['impersonation', 'Başkası gibi davranıyor'],
  ['unsafe', 'Güvenli olmayan içerik'],
  ['other', 'Diğer'],
]

function SikayetPaneli({ profil, onKapat, onGonderildi, onHata }) {
  const [neden, setNeden] = useState('harassment')
  const [ayrinti, setAyrinti] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)

  /* "Diğer" seçilince açıklama ZORUNLU — sunucu da bunu uyguluyor;
     buradaki kontrol yalnız kullanıcıyı boşuna göndermemek için. */
  const ayrintiZorunlu = neden === 'other'
  const gonderilebilir = !ayrintiZorunlu || ayrinti.trim().length >= 5

  async function gonder(olay) {
    olay.preventDefault()
    setGonderiliyor(true)
    try {
      await api.community.kisiyiBildir(profil.id, neden, ayrinti.trim() || undefined)
      onGonderildi()
    } catch (sikayetHatasi) {
      onHata(sikayetHatasi.message?.includes('zaten')
        ? 'Bu kullanıcıyı zaten bildirmiştin.'
        : (sikayetHatasi.message || 'Şikâyet gönderilemedi.'))
      onKapat()
    } finally {
      setGonderiliyor(false)
    }
  }

  return (
    <form className={styles.profilDuzenle} onSubmit={gonder}>
      <strong>{profil.name} adlı kişiyi bildir</strong>
      <label>
        Neden
        <select value={neden} onChange={e => setNeden(e.target.value)}>
          {SIKAYET_NEDENLERI.map(([deger, etiket]) => <option key={deger} value={deger}>{etiket}</option>)}
        </select>
      </label>
      <label>
        Açıklama {ayrintiZorunlu ? '(zorunlu)' : '(isteğe bağlı)'}
        <textarea
          value={ayrinti}
          onChange={e => setAyrinti(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Ne olduğunu kısaca anlat"
          required={ayrintiZorunlu}
        />
      </label>
      <p className={styles.sikayetNot}>
        Şikâyetin yönetim ekibine iletilir. Bildirdiğin kişiye kimin bildirdiği gösterilmez.
      </p>
      <div className={styles.profilDuzenleAlt}>
        <Button variant="ghost" onClick={onKapat}>Vazgeç</Button>
        <Button type="submit" disabled={gonderiliyor || !gonderilebilir}>
          {gonderiliyor ? 'Gönderiliyor…' : 'Bildir'}
        </Button>
      </div>
    </form>
  )
}

export default function ProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin, updateUser } = useAuth()
  const [arama, setArama] = useSearchParams()

  /* Kendi profilim mi: adres parametresi yoksa ya da kendi kimliğimse. */
  const benimMi = !userId || Number(userId) === user?.id
  const sekmeler = benimMi ? KENDI_SEKMELERI : BASKASININ_SEKMELERI

  const istenen = arama.get('liste')
  /* Kişi listeleri sekme olmasa da geçerli görünüm; yoksa sayaçtan
     açılan liste sessizce "posts"a düşerdi. */
  const gecerliMi = sekmeler.some(s => s.anahtar === istenen)
    || (!benimMi && Boolean(KISI_LISTELERI[istenen]))
  const aktif = gecerliMi ? istenen : 'posts'

  const [profil, setProfil] = useState(null)
  const [sayilar, setSayilar] = useState(null)
  const [takipEdiyorum, setTakipEdiyorum] = useState(false)
  const [posts, setPosts] = useState([])
  const [kisiler, setKisiler] = useState([])
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')
  const [bildirim, setBildirim] = useState('')
  const [duzenleAcik, setDuzenleAcik] = useState(false)
  const [sikayetAcik, setSikayetAcik] = useState(false)

  const yukle = useCallback(async () => {
    setYukleniyor(true)
    setHata('')
    setKisiler([])
    setPosts([])
    try {
      if (benimMi) {
        const [ozet, liste] = await Promise.all([
          api.community.benimOzetim(),
          aktif === 'media'
            ? api.community.profilGonderileri(user.id, 'media')
            : api.community.benimListem(aktif),
        ])
        setSayilar(ozet)
        setPosts(liste.posts || [])
        setProfil({
          id: user.id, name: user.name, bio: user.bio, location: user.location,
          websiteUrl: user.websiteUrl, avatarUrl: user.avatarUrl, coverUrl: user.coverUrl,
        })
      } else {
        const bilgi = await api.community.profil(userId)
        setProfil(bilgi.profil)
        setSayilar(bilgi.sayilar)
        setTakipEdiyorum(bilgi.takipEdiyorum)

        if (aktif === 'followers' || aktif === 'following') {
          const sonuc = await api.community.profilKisileri(userId, aktif)
          setKisiler(sonuc.people || [])
        } else {
          const sonuc = await api.community.profilGonderileri(userId, aktif === 'media' ? 'media' : undefined)
          setPosts(sonuc.posts || [])
        }
      }
    } catch (yuklemeHatasi) {
      /*
       * Sunucu engelli ve askıya alınmış hesapta 404 dönüyor (403
       * değil — 403 engelleyenin varlığını ele verirdi). Kullanıcıya
       * ikisini ayırmadan tek bir mesaj gösteriyoruz.
       */
      setHata(yuklemeHatasi.message?.includes('bulunamad')
        ? 'Bu profil görüntülenemiyor.'
        : (yuklemeHatasi.message || 'Profil yüklenemedi.'))
    } finally {
      setYukleniyor(false)
    }
  }, [benimMi, aktif, userId, user])

  useEffect(() => { yukle() }, [yukle])

  async function takibiDegistir() {
    const yeni = !takipEdiyorum
    setTakipEdiyorum(yeni)
    try {
      await api.community.follow(profil.id, yeni)
      setSayilar(mevcut => mevcut && { ...mevcut, takipci: (mevcut.takipci || 0) + (yeni ? 1 : -1) })
    } catch (takipHatasi) {
      setTakipEdiyorum(!yeni)
      setHata(takipHatasi.message || 'İşlem tamamlanamadı.')
    }
  }

  async function kapakSec(olay) {
    const dosya = olay.target.files?.[0]
    olay.target.value = ''
    if (!dosya) return
    try {
      const sonuc = await api.profil.kapakYukle(dosya)
      updateUser({ coverUrl: sonuc.coverUrl })
      setProfil(mevcut => ({ ...mevcut, coverUrl: sonuc.coverUrl }))
      setBildirim('Kapak fotoğrafı güncellendi.')
    } catch (kapakHatasi) {
      setHata(kapakHatasi.message || 'Kapak yüklenemedi.')
    }
  }

  function kaldirilabilir(post) {
    return isAdmin || (post.author?.id != null && post.author.id === user?.id)
  }

  async function etkilesimDegistir(post, tur, aktifMi) {
    try {
      await api.community.etkilesim(post.id, tur, aktifMi)
      await yukle()
    } catch (e) { setHata(e.message || 'İşlem tamamlanamadı.') }
  }

  async function kaldir(postId) {
    if (!window.confirm('Bu paylaşım kaldırılsın mı?')) return
    try { await api.community.remove(postId); setBildirim('Paylaşım kaldırıldı.'); await yukle() }
    catch (e) { setHata(e.message || 'Paylaşım kaldırılamadı.') }
  }

  async function raporla(postId) {
    const izinli = ['spam', 'misinformation', 'harassment', 'unsafe', 'copyright', 'other']
    const neden = window.prompt('Rapor nedeni: spam, misinformation, harassment, unsafe, copyright veya other', 'misinformation')?.trim()
    if (!neden || !izinli.includes(neden)) return
    const ayrinti = neden === 'other' ? window.prompt('Kısa açıklama')?.trim() : undefined
    if (neden === 'other' && !ayrinti) return
    try { await api.community.report(postId, neden, ayrinti); setBildirim('Rapor moderasyon ekibine iletildi.') }
    catch (e) { setHata(e.message || 'Rapor gönderilemedi.') }
  }

  async function paylas(post) {
    const adres = `${window.location.origin}/app/community/gonderi/${post.id}`
    if (navigator.share) {
      try { await navigator.share({ title: 'LocalKarar', text: post.summary || '', url: adres }) } catch { /* vazgeçildi */ }
      return
    }
    try { await navigator.clipboard.writeText(adres); setBildirim('Bağlantı kopyalandı.') }
    catch { setHata('Bağlantı kopyalanamadı.') }
  }

  /* Etkin görünüm sekme de olabilir, sayaçtan açılan kişi listesi de. */
  const aktifSekme = sekmeler.find(s => s.anahtar === aktif) || KISI_LISTELERI[aktif] || sekmeler[0]

  if (hata && !profil) {
    return (
      <main className={`${styles.page} ${styles.communityPage}`}>
        <div className={styles.error}>{hata}</div>
      </main>
    )
  }

  return (
    <main className={`${styles.page} ${styles.communityPage}`}>
      {/* KAPAK. Kendi profilimde üzerine gelince değiştirme düğmesi
          çıkıyor; başkasınınkinde yalnız görsel. */}
      <div className={styles.kapak} style={profil?.coverUrl ? { backgroundImage: `url(${profil.coverUrl})` } : undefined}>
        {benimMi && (
          <label className={styles.kapakDegistir}>
            <Camera size={16} aria-hidden="true" />
            <span>Kapak</span>
            <input className="sr-only" type="file" accept="image/png,image/jpeg" onChange={kapakSec} />
          </label>
        )}
      </div>

      <header className={styles.profilBasligi}>
        <span className={`${styles.authorAvatar} ${styles.profilAvatari}`}>
          {profil?.avatarUrl
            ? <img src={profil.avatarUrl} alt="" />
            : initials(profil?.name)}
        </span>

        <div className={styles.profilBilgi}>
          <h1>{profil?.name || 'LocalKarar kullanıcısı'}</h1>
          {profil?.bio && <p className={styles.profilBio}>{profil.bio}</p>}
          <div className={styles.profilUstveri}>
            {profil?.location && <span><MapPin size={14} aria-hidden="true" /> {profil.location}</span>}
            {profil?.websiteUrl && (
              <a href={profil.websiteUrl} target="_blank" rel="noreferrer noopener nofollow">
                <Link2 size={14} aria-hidden="true" /> {profil.websiteUrl.replace(/^https?:\/\//i, '')}
              </a>
            )}
          </div>
          {sayilar && (
            <div className={styles.profilSayilariSatir}>
              <button
                type="button"
                className={aktif === 'posts' ? styles.sayacAktif : undefined}
                aria-current={aktif === 'posts' ? 'true' : undefined}
                onClick={() => setArama({ liste: 'posts' })}
              >
                <b>{sayilar.paylasim ?? 0}</b> paylaşım
              </button>
              {!benimMi && (
                <>
                  <button
                    type="button"
                    className={aktif === 'followers' ? styles.sayacAktif : undefined}
                    aria-current={aktif === 'followers' ? 'true' : undefined}
                    onClick={() => setArama({ liste: 'followers' })}
                  >
                    <b>{sayilar.takipci ?? 0}</b> takipçi
                  </button>
                  <button
                    type="button"
                    className={aktif === 'following' ? styles.sayacAktif : undefined}
                    aria-current={aktif === 'following' ? 'true' : undefined}
                    onClick={() => setArama({ liste: 'following' })}
                  >
                    <b>{sayilar.takipEdilen ?? 0}</b> takip
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.profilEylem}>
          {benimMi
            ? <Button variant="secondary" onClick={() => setDuzenleAcik(a => !a)}>
              {duzenleAcik ? <X size={16} /> : <Pencil size={16} />}
              {duzenleAcik ? 'Kapat' : 'Profili düzenle'}
            </Button>
            : (
              <>
                <Button variant={takipEdiyorum ? 'secondary' : 'primary'} onClick={takibiDegistir}>
                  <UserPlus size={16} />{takipEdiyorum ? 'Takibi bırak' : 'Takip et'}
                </Button>
                {/* Şikâyet ikinci derece bir eylem: takip düğmesinin
                    yanında sade bir bağlantı, yoksa yanlışlıkla
                    tıklanması kolaylaşırdı. */}
                <button type="button" className={styles.bildirDugmesi} onClick={() => setSikayetAcik(a => !a)}>
                  <Flag size={14} aria-hidden="true" /> Bildir
                </button>
              </>
            )}
        </div>
      </header>

      {bildirim && <div className={styles.notice}>{bildirim}</div>}
      {hata && <div className={styles.error}>{hata}</div>}

      {!benimMi && sikayetAcik && profil && (
        <SikayetPaneli
          profil={profil}
          onKapat={() => setSikayetAcik(false)}
          onHata={setHata}
          onGonderildi={() => {
            setSikayetAcik(false)
            setBildirim('Şikâyetin yönetim ekibine iletildi.')
          }}
        />
      )}

      {benimMi && duzenleAcik && (
        <ProfilDuzenle
          user={user}
          onKapat={() => setDuzenleAcik(false)}
          onKaydedildi={sonuc => {
            updateUser(sonuc)
            setProfil(mevcut => ({ ...mevcut, ...sonuc }))
            setDuzenleAcik(false)
            setBildirim('Profil güncellendi.')
          }}
        />
      )}

      <nav className={styles.profilSekmeleri} aria-label="Profil listeleri">
        {sekmeler.map(sekme => (
          <button
            key={sekme.anahtar}
            type="button"
            className={sekme.anahtar === aktif ? styles.profilSekmeAktif : undefined}
            aria-current={sekme.anahtar === aktif ? 'page' : undefined}
            onClick={() => setArama({ liste: sekme.anahtar })}
          >
            <sekme.ikon size={16} aria-hidden="true" />
            <span>{sekme.etiket}</span>
            {sayilar && sekme.sayiAlani && <b>{sayilar[sekme.sayiAlani]}</b>}
          </button>
        ))}
      </nav>

      <section className={styles.feed} aria-live="polite">
        {yukleniyor && <div className={styles.skeleton} aria-label="İçerik yükleniyor"><span /><span /><span /></div>}

        {!yukleniyor && posts.length === 0 && kisiler.length === 0 && (
          <div className={styles.empty}>
            <aktifSekme.ikon size={34} aria-hidden="true" />
            <p>{aktifSekme.bos}</p>
          </div>
        )}

        {/* Kişi listeleri (takipçi / takip edilen) */}
        {kisiler.length > 0 && (
          <div className={styles.kisiListesi}>
            {kisiler.map(kisi => (
              <button key={kisi.id} type="button" onClick={() => navigate(`/app/profil/${kisi.id}`)}>
                <span className={styles.authorAvatar}>
                  {kisi.avatarUrl ? <img src={kisi.avatarUrl} alt="" /> : initials(kisi.name)}
                </span>
                <span>
                  <strong>{kisi.name}</strong>
                  {kisi.bio && <small>{kisi.bio}</small>}
                </span>
              </button>
            ))}
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
