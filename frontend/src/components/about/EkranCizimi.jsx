import { useEffect, useState } from 'react'
import styles from './EkranCizimi.module.css'

/*
 * Hakkında sayfasındaki ürün görselleri gerçek LocalKarar ekranlarından
 * alınır. Dosyalar aynı 16:10 oranında tutulur; böylece modül kartları
 * arasında yükseklik sıçraması olmaz.
 *
 * Görseller açıklayıcı metnin yanında tekrar niteliğinde olduğu için boş
 * alt metin kullanılır. Bölümün anlamını başlık, açıklama ve maddeler taşır.
 */
const EKRANLAR = {
  'karar-araclari': { kaynak: '/about-screens/karar-araclari.png?v=4', etiket: 'Karar Araçları' },
  'isletme-takibi': { kaynak: '/about-screens/isletme-takibi.png?v=4', etiket: 'İşletme Takibi' },
  'ai-mentor': { kaynak: '/about-screens/ai-mentor.png?v=4', etiket: 'AI Mentor' },
  hesaplamalar: { kaynak: '/about-screens/hesaplamalar.png?v=4', etiket: 'Hesaplamalar' },
  kurslar: { kaynak: '/about-screens/kurslar.png?v=4', etiket: 'Kurslar' },
  topluluk: { kaynak: '/about-screens/topluluk.png?v=4', etiket: 'Topluluk' }
}

export default function EkranCizimi({ tur }) {
  const ekran = EKRANLAR[tur]
  const [acik, setAcik] = useState(false)

  useEffect(() => {
    if (!acik) return undefined

    const oncekiOverflow = document.body.style.overflow
    const kapat = event => event.key === 'Escape' && setAcik(false)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', kapat)

    return () => {
      document.body.style.overflow = oncekiOverflow
      window.removeEventListener('keydown', kapat)
    }
  }, [acik])

  if (!ekran) return null

  const { kaynak, etiket } = ekran

  return (
    <>
      <figure className={styles.cerceve}>
        <button
          type="button"
          className={styles.onizleme}
          onClick={() => setAcik(true)}
          aria-label={`${etiket} ekran görüntüsünü büyüt`}
        >
          <img className={styles.goruntu} src={kaynak} alt={`${etiket} ekran görüntüsü`} loading="lazy" />
          <span className={styles.buyutRozeti} aria-hidden="true">Büyüt ve incele</span>
        </button>
      </figure>

      {acik && (
        <div className={styles.arkaPlan} onMouseDown={event => event.target === event.currentTarget && setAcik(false)}>
          <section className={styles.pencere} role="dialog" aria-modal="true" aria-label={`${etiket} ekran görüntüsü`}>
            <header className={styles.pencereBasligi}>
              <div>
                <strong>{etiket}</strong>
                <span>Kapatmak için Escape tuşuna basabilir veya dışına tıklayabilirsin.</span>
              </div>
              <button type="button" className={styles.kapat} onClick={() => setAcik(false)} aria-label="Görseli kapat">
                Kapat <span aria-hidden="true">×</span>
              </button>
            </header>
            <div className={styles.kaydirmaAlani}>
              <img className={styles.buyukGoruntu} src={kaynak} alt={`${etiket} ekranının büyük görünümü`} />
            </div>
          </section>
        </div>
      )}
    </>
  )
}
