import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { YEARLY_FREE_MONTHS } from '@/config/billing'
import styles from './DonemSecici.module.css'

/*
 * TAHSİLAT DÖNEMİ SEÇİCİ — aylık / yıllık.
 *
 * Ürün sahibi kararı (28.08.2026): kullanıcı seçsin.
 *
 * 🔴 TEK BİLEŞEN, İKİ YERDE.
 * Hem `/fiyatlar` sayfası hem ödeme paneli bunu kullanıyor. İki ayrı
 * seçici yazmak, birinin "2 ay hediye" derken diğerinin başka bir şey
 * demesine yol açardı — ve kullanıcı fiyat sayfasında gördüğü teklifi
 * ödeme ekranında bulamazdı.
 *
 * ⚠️ `variant` yalnız PALET seçiyor, davranış değiştirmiyor:
 * `auth` → herkese açık yüzeyler (--auth-* paleti),
 * `app`  → uygulama kabuğu (--surface-* / --text).
 * İki palet bilerek ayrı; karıştırmak koyu modda beyaz-üstüne-beyaz
 * hatasına yol açtı ve düzeltilmek zorunda kaldı.
 */

const DONEMLER = ['monthly', 'yearly']

export default function DonemSecici({ deger, onChange, variant = 'auth', className = '' }) {
  const { t } = useTranslation('common')
  const dugmeler = useRef([])

  /* Klavye: ok tuşlarıyla geçiş. `role="radiogroup"` sözü verildiği
     için bu davranış zorunlu — sekmeyle her düğmeye tek tek uğramak
     radio grubu için yanlış model. */
  function tuslar(olay, sira) {
    const yon = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[olay.key]
    if (!yon) return
    olay.preventDefault()
    const yeni = (sira + yon + DONEMLER.length) % DONEMLER.length
    onChange(DONEMLER[yeni])
    dugmeler.current[yeni]?.focus()
  }

  return (
    <div
      className={`${styles.secici} ${variant === 'app' ? styles.seciciApp : ''} ${className}`}
      role="radiogroup"
      aria-label={t('billing.period.aria')}
    >
      {DONEMLER.map((donem, sira) => {
        const secili = deger === donem
        return (
          <button
            key={donem}
            type="button"
            ref={el => { dugmeler.current[sira] = el }}
            role="radio"
            aria-checked={secili}
            tabIndex={secili ? 0 : -1}
            className={`${styles.dugme} ${secili ? styles.dugmeSecili : ''}`}
            onClick={() => onChange(donem)}
            onKeyDown={olay => tuslar(olay, sira)}
          >
            {t(`billing.period.${donem}`)}
            {donem === 'yearly' && (
              <span className={styles.hediye}>
                {t('billing.period.freeMonths', { count: YEARLY_FREE_MONTHS })}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
