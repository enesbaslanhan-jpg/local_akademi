import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import MembershipModal from '@/components/billing/MembershipModal'
import styles from './MembershipBanner.module.css'

/*
 * ÜYELİK ŞERİDİ — uygulama kabuğunda, her sayfada.
 *
 * 🔴 `showBanner` SUNUCUDA HESAPLANIYORDU AMA ARAYÜZDE HİÇ
 * KULLANILMIYORDU. Ölçüldü (31.08.2026): `hesaplaUyelikDurumu` son 7
 * günde `showBanner: true` döndürüyor, süresi dolunca da; ön yüzde
 * bu alanı okuyan tek satır yoktu. Yani sunucu "uyar" diyordu,
 * arayüz duymuyordu.
 *
 * Süresi dolan kullanıcının bugüne kadar gördüğü tek şey, bir şey
 * yazmaya kalkınca çıkan bir toast'tı: neden yazamadığını öğreniyor
 * ama ne yapacağını bulamıyordu. Ürün sahibi kararı (31.08.2026):
 * salt okunur kalsın, ama ÜSTTE KAYBOLMAYAN bir şerit ödeme yolunu
 * göstersin.
 *
 * 🔴 SÜRESİ DOLMUŞKEN KAPATILAMAZ. Deneme uyarısı kapatılabilir
 * (henüz karar vermesi gerekmeyen kullanıcıyı sıkıştırmak doğru
 * olmaz), ama salt okunur moddaki şerit kullanıcının yazamamasının
 * TEK açıklaması; kapatılabilir olsaydı kapatan kişi uygulamanın
 * neden çalışmadığını bir daha hiçbir yerde göremezdi.
 *
 * ⚠️ Bu şerit GÜVENLİK SINIRI DEĞİL. Gerçek zorlama sunucuda:
 * `membership-guard.ts` 188 yazma rotasını tek kapıdan koruyor.
 * Buradaki şerit yalnız kullanıcıya ne olduğunu ve ne yapabileceğini
 * söylüyor.
 */

const KAPATMA_ANAHTARI = 'localkarar-uyelik-serit-kapatildi'

export default function MembershipBanner() {
  const { t } = useTranslation('common')
  const { user } = useAuth()
  const [odemeAcik, setOdemeAcik] = useState(false)
  /* Kapatma OTURUM bazlı: sekme kapanınca hatırlatma geri gelir.
     `localStorage` olsaydı bir kez kapatan kullanıcı denemesinin
     bittiğini bir daha hiç görmezdi. `VerificationBanner` ile aynı
     gerekçe ve aynı desen. */
  const [gizli, setGizli] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.sessionStorage.getItem(KAPATMA_ANAHTARI) === 'true'
  })

  const uyelik = user?.membership
  /* Alan hiç gelmezse (eski sunucu) şerit çizilmez — yanlış uyarı,
     hiç uyarmamaktan kötüdür. */
  if (!uyelik?.showBanner) return null

  const doldu = uyelik.state === 'expired'
  if (!doldu && gizli) return null

  function kapat() {
    window.sessionStorage.setItem(KAPATMA_ANAHTARI, 'true')
    setGizli(true)
  }

  return (
    <>
      <div className={`${styles.serit} ${doldu ? styles.doldu : styles.uyari}`} role="status">
        <span className={styles.ikon} aria-hidden="true">
          {doldu ? <AlertTriangle size={17} /> : <Clock size={17} />}
        </span>

        <p className={styles.metin}>
          <strong>
            {doldu
              ? t('billing.durum.expired.baslik')
              : t('billing.durum.trial.alt', { count: uyelik.trialDaysLeft ?? 0 })}
          </strong>
          <span>
            {doldu ? t('billing.serit.doluAciklama') : t('billing.serit.uyariAciklama')}
          </span>
        </p>

        <button type="button" className={styles.eylem} onClick={() => setOdemeAcik(true)}>
          {t('billing.durum.eylem.uyeligiBaslat')} <ArrowRight size={14} aria-hidden="true" />
        </button>

        {/* Kapatma yalnız deneme uyarısında. Süresi dolmuşken yok. */}
        {!doldu && (
          <button type="button" className={styles.kapat} onClick={kapat} aria-label={t('billing.serit.kapat')}>
            ×
          </button>
        )}
      </div>

      <MembershipModal open={odemeAcik} onClose={() => setOdemeAcik(false)} />
    </>
  )
}
