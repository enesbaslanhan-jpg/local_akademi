import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { api } from '@/services/api'
import styles from './WelcomeTour.module.css'

/*
 * Karşılama turu — kullanıcıyı bölümlerin İÇİNE götürür.
 *
 * İlk sürüm yalnız kenar çubuğundaki menü maddelerini işaret ediyordu:
 * ana sayfadan hiç çıkmadan "Karar Araçları burada" diyordu. Bu bir menü
 * turuydu, ürün turu değil — kullanıcı hiçbir şeyin nasıl çalıştığını
 * görmüyordu.
 *
 * Şimdi her adım o sayfaya GİDİYOR, sayfanın gerçek öğesini işaret
 * ediyor ve orada ne yapıldığını anlatıyor.
 *
 * Anketten (OnboardingPage) ayrı bir şey: anket kullanıcıyı tanır, tur
 * ürünü tanıtır. Bayrakları da ayrı (`tourCompletedAt` ≠
 * `onboardingCompleted`).
 */

const BASLANGIC_YOLU = '/app/dashboard'

const ADIMLAR = [
  {
    yol: '/app/dashboard',
    capa: 'dash-durum',
    baslik: 'Kontrol Merkezi',
    metin: 'Her girişte önce buraya düşersin. İşletmenin bugünkü durumu, yaklaşan işler ve yarım kalan kursun burada toplanır — rakamlar İşletme Takibi bölümünden gelir.'
  },
  {
    yol: '/app/decision-checks',
    capa: 'karar-kartlari',
    baslik: 'Karar Araçları',
    metin: 'Ürünüm gerçekten kârlı mı, zam yapmalı mıyım gibi soruları adım adım yürütür. Sorulara cevap verirsin, sonunda gerekçesiyle birlikte bir sonuç çıkar.'
  },
  {
    yol: '/app/workspaces',
    capa: 'isletme-baslik',
    baslik: 'İşletme Takibi',
    metin: 'Gelir, gider, cari hesaplar ve belgelerin burada durur. Fatura yüklediğinde içindeki tutarları okuyup kayıt önerir — sen onaylamadan hiçbir şey yazılmaz.'
  },
  {
    yol: '/app/mentor',
    capa: 'mentor-girdi',
    baslik: 'AI Mentor',
    metin: 'Takıldığın yeri buraya yazarsın. Kurs içeriğine ve kurduysan kendi işletme rakamlarına bakarak cevap verir, kaynağını da gösterir.'
  },
  {
    yol: '/app/community/topluluk',
    capa: 'topluluk-baslik',
    baslik: 'Topluluk',
    metin: 'Benzer işletmeleri yürüten insanlar burada. Yazdığın anda yayımlanır; yanıtlayabilir, beğenebilir, alıntılayabilirsin. Kendi paylaşımını istediğin zaman kaldırırsın.'
  }
]

/*
 * Hedef GÖRÜNÜR mü.
 *
 * Görünürlük CSS kırılma noktasına göre değil gerçek koordinatlara göre
 * ölçülüyor: kenar çubuğu 1023px'te çekmeceye dönüp ekran dışına kayıyor
 * ama DOM'da kalıp ölçülebilir bir genişliği oluyor (left: -222 gibi).
 * Sadece "genişlik > 0" denseydi balon ekranın dışına konumlanırdı.
 */
function gorunurKutu(capa, kaydir = false) {
  const el = document.querySelector(`[data-tour="${capa}"]`)
  if (!el) return null

  /* Hedef katlamanın altındaysa önce görünüre getir. Aksi halde ekranda
     olmayan bir şey işaret edilmiş olurdu — ilk sürümde Karar Araçları
     adımı tam bunu yapıyordu. Yalnız ilk yerleşimde kaydırılır; sonraki
     ölçümler (resize/scroll) kullanıcının kaydırmasını ele geçirmesin. */
  if (kaydir) {
    const on = el.getBoundingClientRect()
    if (on.top < 0 || on.bottom > window.innerHeight) {
      el.scrollIntoView({ block: 'center', behavior: 'auto' })
    }
  }

  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return null
  if (r.bottom < 0 || r.top > window.innerHeight) return null
  if (r.right < 0 || r.left > window.innerWidth) return null
  return r
}

export default function WelcomeTour() {
  const [durum, setDurum] = useState('bilinmiyor')   // bilinmiyor | gizli | acik
  const [adim, setAdim] = useState(0)
  const [kutu, setKutu] = useState(null)
  const [bekliyor, setBekliyor] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const bittiRef = useRef(false)

  useEffect(() => {
    let iptal = false
    api.onboarding.getStatus()
      .then(s => {
        if (iptal) return
        /* Tur ancak ANKET BİTTİKTEN sonra; yoksa iki karşılama üst üste
           binerdi. Durum okunamazsa da açılmaz — emin olmadan karşılama
           ekranı açmak, turu bitirmiş kullanıcıya tekrar göstermektir. */
        setDurum(s?.onboardingCompleted && !s?.tourCompleted ? 'acik' : 'gizli')
      })
      .catch(() => { if (!iptal) setDurum('gizli') })
    return () => { iptal = true }
  }, [])

  const guncel = ADIMLAR[adim]

  /* Adım değişince önce O SAYFAYA git. */
  useEffect(() => {
    if (durum !== 'acik') return
    if (location.pathname !== guncel.yol) navigate(guncel.yol)
  }, [durum, adim, guncel.yol, location.pathname, navigate])

  /*
   * Sonra çapayı BEKLE.
   *
   * Sayfalar lazy yükleniyor ve verilerini sonradan çekiyor; çapa
   * gezinmenin hemen ardından DOM'da olmuyor. Tek seferlik ölçüm
   * yapılsaydı balon her adımda ortada kalırdı.
   *
   * Süre dolarsa (boş durum, hata, farklı düzen) konumdan vazgeçilip
   * balon ortalanır — hiçbir şeye tutunmayan bir işaret çizmektense
   * bu daha dürüst.
   */
  useEffect(() => {
    if (durum !== 'acik') return
    if (location.pathname !== guncel.yol) { setKutu(null); return }

    let durduruldu = false
    let zamanlayici
    const basla = Date.now()
    setBekliyor(true)

    const ara = () => {
      if (durduruldu) return
      const r = gorunurKutu(guncel.capa, true)
      if (r) {
        setKutu(r)
        setBekliyor(false)
        return
      }
      if (Date.now() - basla > 2500) {
        setKutu(null)
        setBekliyor(false)
        return
      }
      zamanlayici = setTimeout(ara, 120)
    }
    ara()

    const olc = () => setKutu(gorunurKutu(guncel.capa))
    window.addEventListener('resize', olc)
    window.addEventListener('scroll', olc, true)
    return () => {
      durduruldu = true
      clearTimeout(zamanlayici)
      window.removeEventListener('resize', olc)
      window.removeEventListener('scroll', olc, true)
    }
  }, [durum, adim, guncel.capa, guncel.yol, location.pathname])

  const bitir = useCallback(() => {
    setDurum('gizli')
    /* Tur bitince kullanıcı Topluluk sayfasında kalmasın; başladığı
       yere dönsün. */
    navigate(BASLANGIC_YOLU)
    /* Sunucuya yazmak başarısız olsa bile tur KAPANIR: kullanıcıyı ağ
       hatası yüzünden karşılama ekranında tutmak kabul edilemez. En kötü
       ihtimalle bir sonraki oturumda tekrar açılır.
       `bittiRef`: perde tıklaması + Escape üst üste gelirse uç nokta iki
       kez çağrılmasın. */
    if (!bittiRef.current) {
      bittiRef.current = true
      api.onboarding.completeTour().catch(() => {})
    }
  }, [navigate])

  useEffect(() => {
    if (durum !== 'acik') return
    const tus = e => {
      if (e.key === 'Escape') bitir()
      else if (e.key === 'ArrowRight') setAdim(a => Math.min(a + 1, ADIMLAR.length - 1))
      else if (e.key === 'ArrowLeft') setAdim(a => Math.max(a - 1, 0))
    }
    window.addEventListener('keydown', tus)
    return () => window.removeEventListener('keydown', tus)
  }, [durum, bitir])

  if (durum !== 'acik') return null

  const sonAdim = adim === ADIMLAR.length - 1

  /* Balon hedefin SAĞINA sığmıyorsa soluna, o da sığmıyorsa altına.
     Sabit "sağa koy" kuralı, sağ kenara yakın hedeflerde balonu ekran
     dışına taşıyordu. */
  const balonStili = (() => {
    if (!kutu) return null
    const genislik = 330
    const bosluk = 14
    const ust = Math.max(12, Math.min(kutu.top, window.innerHeight - 240))
    if (kutu.right + bosluk + genislik <= window.innerWidth) {
      return { top: ust, left: kutu.right + bosluk }
    }
    if (kutu.left - bosluk - genislik >= 0) {
      return { top: ust, left: kutu.left - bosluk - genislik }
    }
    return {
      top: Math.min(kutu.bottom + bosluk, window.innerHeight - 240),
      left: Math.max(12, Math.min(kutu.left, window.innerWidth - genislik - 12))
    }
  })()

  return (
    <div className={styles.katman} role="dialog" aria-modal="true" aria-label="Karşılama turu">
      <div className={styles.perde} onClick={bitir} />

      {kutu && (
        <div
          className={styles.isik}
          style={{ top: kutu.top - 4, left: kutu.left - 4, width: kutu.width + 8, height: kutu.height + 8 }}
          aria-hidden="true"
        />
      )}

      <div className={`${styles.balon} ${balonStili ? '' : styles.balonOrta}`} style={balonStili || undefined}>
        <button type="button" className={styles.kapat} onClick={bitir} aria-label="Turu kapat">
          <X size={15} aria-hidden="true" />
        </button>

        <p className={styles.sayac}>{adim + 1} / {ADIMLAR.length}</p>
        <h2 className={styles.baslik}>{guncel.baslik}</h2>
        <p className={styles.metin}>{guncel.metin}</p>
        {bekliyor && <p className={styles.bekliyor}>Sayfa açılıyor…</p>}

        <div className={styles.eylemler}>
          <button type="button" className={styles.atla} onClick={bitir}>
            Turu atla
          </button>
          <div className={styles.ilerleme}>
            {adim > 0 && (
              <button type="button" className={styles.geri} onClick={() => setAdim(a => a - 1)}>
                Geri
              </button>
            )}
            <button
              type="button"
              className={styles.ileri}
              onClick={() => (sonAdim ? bitir() : setAdim(a => a + 1))}
            >
              {sonAdim ? 'Başlayalım' : 'İleri'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
