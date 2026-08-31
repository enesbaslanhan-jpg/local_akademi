import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '@/services/api'
import styles from './OdemeSonucPage.module.css'

/*
 * ÖDEME SONUCU.
 *
 * PayTR ödeme bittiğinde `merchant_ok_url` / `merchant_fail_url`
 * adresine yönlendiriyor. iFrame biçiminde bu yönlendirme ÇERÇEVENİN
 * İÇİNDE oluyor, yani sonuç küçük bir kutuda sıkışıyor. Sayfa ilk iş
 * olarak çerçeveden çıkıyor (aşağıda).
 *
 * 🔴 BU SAYFA ABONELİĞİ AKTİVE ETMEZ.
 *
 * Buraya gelmek, ödemenin başarılı olduğunu KANITLAMAZ: adres
 * kullanıcının tarayıcısından geliyor ve adres çubuğuna elle
 * yazılabilir. Aktivasyon yalnızca PayTR'nin sunucu-sunucu callback'i
 * ile oluyor (`/payments/paytr/callback`, hash doğrulamalı). Bu sayfa
 * durumu yalnız SORAR ve gösterir.
 */

/* Callback ile kullanıcının dönüşü arasında yarış var: tarayıcı
   çoğu zaman daha hızlı. Bu yüzden PENDING görülürse kısa aralıklarla
   yeniden soruluyor. */
const YOKLAMA_ARALIGI_MS = 2000
const EN_FAZLA_YOKLAMA = 10

export default function OdemeSonucPage({ basarili = true }) {
  const { t } = useTranslation('common')
  const [params] = useSearchParams()
  const siparis = params.get('siparis')

  const [durum, setDurum] = useState(null)
  const [bitti, setBitti] = useState(false)
  const yoklamaSayisi = useRef(0)

  /*
   * ÇERÇEVEDEN ÇIKIŞ.
   *
   * Aynı kaynakta olduğumuz için `window.top`a erişebiliyoruz. Bunu
   * yapmazsak kullanıcı ödeme sonucunu ~480px'lik bir kutunun içinde
   * görür ve panelin geri kalanı arkada asılı kalır.
   */
  useEffect(() => {
    if (window.top && window.top !== window.self) {
      window.top.location.href = window.location.href
    }
  }, [])

  useEffect(() => {
    if (!siparis) { setBitti(true); return }
    let iptal = false

    async function sor() {
      try {
        const sonuc = await api.payments.durum(siparis)
        if (iptal) return
        setDurum(sonuc)
        /* PENDING ise callback henüz düşmemiş olabilir — tekrar sor. */
        if (sonuc?.status === 'PENDING' && yoklamaSayisi.current < EN_FAZLA_YOKLAMA) {
          yoklamaSayisi.current += 1
          setTimeout(sor, YOKLAMA_ARALIGI_MS)
        } else {
          setBitti(true)
        }
      } catch {
        if (!iptal) setBitti(true)
      }
    }

    sor()
    return () => { iptal = true }
  }, [siparis])

  const odendi = durum?.status === 'SUCCEEDED'
  const bekliyor = !bitti && durum?.status !== 'SUCCEEDED'

  return (
    <div className={styles.sayfa}>
      <div className={styles.kart} role="status" aria-live="polite">
        {bekliyor ? (
          <>
            <h1 className={styles.baslik}>{t('billing.result.verifyingTitle')}</h1>
            <p className={styles.metin}>{t('billing.result.verifyingBody')}</p>
          </>
        ) : odendi ? (
          <>
            <h1 className={styles.baslik}>{t('billing.result.successTitle')}</h1>
            <p className={styles.metin}>{t('billing.result.successBody')}</p>
          </>
        ) : (
          <>
            <h1 className={styles.baslik}>
              {basarili ? t('billing.result.pendingTitle') : t('billing.result.failedTitle')}
            </h1>
            <p className={styles.metin}>
              {basarili ? t('billing.result.pendingBody') : t('billing.result.failedBody')}
            </p>
          </>
        )}

        <Link to="/app/settings#uyelik" className={styles.dugme}>
          {t('billing.result.backToMembership')}
        </Link>
      </div>
    </div>
  )
}
