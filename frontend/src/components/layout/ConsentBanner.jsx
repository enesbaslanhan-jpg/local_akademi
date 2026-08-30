import { useEffect, useState } from 'react'
import { Scale } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/services/api'
import LegalModal from '@/components/legal/LegalModal'
import styles from './ConsentBanner.module.css'
import { useTranslation } from 'react-i18next'

/*
 * YENİDEN ONAY ŞERİDİ — yasal metin sürümü arttığında her sayfada
 * görünen, KAPATILAMAZ uyarı.
 *
 * 🔴 VerificationBanner'dan bilinçli fark: burada kapatma düğmesi YOK.
 * Doğrulama hatırlatması oturum bazlı kapatılabilirdi; onay isteği
 * kapatılsaydı kapatan kullanıcı bir daha hiç görmezdi ve onay hiç
 * alınmazdı. Aydınlatılmış onay için metnin okunabilir olması da şart:
 * "Metni aç" her eksik belgeyi uygulama içinde gösterir (LegalModal).
 *
 * Uçlar sunucuda hazırdı (GET/POST /auth/consents); bu bileşen tek
 * tüketicisi olduğu için ikinci bir mekanizma yazılmadı.
 */
export default function ConsentBanner() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const [missing, setMissing] = useState([])
  const [acikBelge, setAcikBelge] = useState(null)
  const [onaylaniyor, setOnaylaniyor] = useState(false)
  const [hata, setHata] = useState('')

  /* Bağımlılık kullanıcı NESNESİ değil, kimliği: AuthContext'teki her
     updateUser çağrısı nesneyi yeniden yaratır; nesneye bağımlı olmak
     istekleri gereksiz yere tekrarlar. */
  const kullaniciId = user?.id ?? null

  useEffect(() => {
    if (!kullaniciId) return undefined
    let mounted = true
    api.auth.getConsents()
      .then(data => { if (mounted) setMissing(data.missing || []) })
      .catch(() => { if (mounted) setMissing([]) })
    return () => { mounted = false }
  }, [kullaniciId])

  async function onayla() {
    setHata(''); setOnaylaniyor(true)
    try {
      await api.auth.acceptConsents()
      /* Sunucudan TAZE durum okunuyor: yalnızca `setMissing([])`
         demek, yarışan bir sürüm artışında şeridi yanlış kaldırırdı. */
      const data = await api.auth.getConsents()
      setMissing(data.missing || [])
    } catch (err) {
      setHata(err.message || t('consentBanner.saveError'))
    } finally {
      setOnaylaniyor(false)
    }
  }

  if (!user || missing.length === 0) return null

  return (
    <div className={styles.banner} role="alert">
      <Scale size={18} className={styles.icon} aria-hidden="true" />
      <p className={styles.text}>
        <strong>{t('consentBanner.title')}</strong>{' '}
        <span className={styles.detail}>
          {t('consentBanner.description')}
        </span>
        {hata && <span className={styles.error}> {hata}</span>}
      </p>
      {/* Her eksik belge kendi bağlantısıyla açılır; birden çok metin
          güncellendiyse hiçbiri gizli kalmaz. */}
      {missing.map(doc => (
        <button
          key={doc.type}
          type="button"
          className={styles.readLink}
          onClick={() => setAcikBelge(doc.type)}
        >
          {t('consentBanner.readDocument', { title: doc.title })}
        </button>
      ))}
      <button type="button" className={styles.action} onClick={onayla} disabled={onaylaniyor}>
        {onaylaniyor ? t('consentBanner.accepting') : t('consentBanner.accept')}
      </button>

      <LegalModal type={acikBelge} open={Boolean(acikBelge)} onClose={() => setAcikBelge(null)} />
    </div>
  )
}
