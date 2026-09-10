import { useEffect, useState } from 'react'
import { X, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { api } from '@/services/api'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'
import { formatCurrency, formatDate } from '@/utils/formatters'
import styles from './CariHesap.module.css'

/*
 * CARİ HESAP PANELİ.
 *
 * 🔴 NEDEN VAR: "Ahmet'e ne kadar borcum var?" sorusunun cevabı üründe
 * hiçbir yerde yoktu. Kişi kartı ad/telefon/şehir gösteriyordu; kayıtlar
 * kişiye bağlanabiliyordu ama toplanmıyordu. Bir esnafın defterinde ilk
 * baktığı sayı budur.
 *
 * ⚠️ AYRI ROTA DEĞİL, PANEL. Kayıt detayı (`KayitDetay`) da böyle
 * çalışıyor; aynı desen korunuyor ki kullanıcı listeden çıkmadan bakıp
 * kapatabilsin.
 */
export default function CariHesap({ workspaceId, contactId, contactName, onClose }) {
  const { t } = useTranslation('workspace')
  const { formatLocale } = useLocalization()
  const [veri, setVeri] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState('')

  useEffect(() => {
    let aktif = true
    setYukleniyor(true)
    setHata('')
    api.workspace.contacts.hesap(workspaceId, contactId)
      .then(sonuc => { if (aktif) setVeri(sonuc) })
      .catch(err => { if (aktif) setHata(err.message || t('cari.loadError')) })
      .finally(() => { if (aktif) setYukleniyor(false) })
    return () => { aktif = false }
  }, [workspaceId, contactId, t])

  const para = (tutar, birim) =>
    formatCurrency(tutar || 0, { locale: formatLocale, currency: birim || 'TRY' })
  const tarih = deger => deger ? formatDate(deger, { locale: formatLocale, dateStyle: 'medium' }) : '—'

  return (
    <div className={styles.katman} role="dialog" aria-modal="true" aria-label={t('cari.title')}>
      <div className={styles.panel}>
        <header className={styles.baslik}>
          <div>
            <span>{t('cari.title')}</span>
            <h2>{contactName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t('cari.close')}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {hata && <div className={styles.hata}>{hata}</div>}
        {yukleniyor ? <p className={styles.durum}>{t('cari.loading')}</p> : veri && (
          <>
            {/*
              * 🔴 PARA BİRİMLERİ TOPLANMIYOR.
              *
              * Kur bilgisi sistemde yok; 5.000 TL ile 200 USD'yi tek
              * sayıda toplamak uydurma bir rakam üretirdi. Her para
              * birimi kendi kartında.
              */}
            {veri.bakiyeler.length === 0 ? (
              <p className={styles.durum}>{t('cari.noBalance')}</p>
            ) : veri.bakiyeler.map(b => (
              <section key={b.currency} className={styles.bakiyeKarti}>
                <div className={styles.bakiyeSatiri}>
                  <span>{t('cari.receivable')}</span>
                  <strong>{para(b.alacak, b.currency)}</strong>
                </div>
                <div className={styles.bakiyeSatiri}>
                  <span>{t('cari.payable')}</span>
                  <strong>{para(b.borc, b.currency)}</strong>
                </div>
                <div className={`${styles.bakiyeSatiri} ${styles.net}`}>
                  <span>{b.bakiye >= 0 ? t('cari.netReceivable') : t('cari.netPayable')}</span>
                  <strong className={b.bakiye >= 0 ? styles.alacakli : styles.borclu}>
                    {para(Math.abs(b.bakiye), b.currency)}
                  </strong>
                </div>
              </section>
            ))}

            <h3 className={styles.altBaslik}>{t('cari.movements')}</h3>
            {/* Ekstre kapanmış kayıtları DA gösteriyor: bakiye bugünü,
                ekstre geçmişi anlatır. */}
            {veri.hareketler.length === 0 ? (
              <p className={styles.durum}>{t('cari.noMovements')}</p>
            ) : (
              <ul className={styles.hareketler}>
                {veri.hareketler.map(h => {
                  const alacak = h.direction === 'receivable'
                  const kapandi = h.status === 'completed' || h.status === 'cancelled'
                  return (
                    <li key={h.id} className={kapandi ? styles.kapali : ''}>
                      <span className={styles.yon} aria-hidden="true">
                        {alacak ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                      </span>
                      <span className={styles.hareketAd}>
                        <strong>{h.title}</strong>
                        <small>{tarih(h.dueAt || h.createdAt)}</small>
                      </span>
                      <span className={styles.hareketDurum}>
                        {t(`status.${h.status}`, { defaultValue: h.status })}
                      </span>
                      <span className={alacak ? styles.alacakli : styles.borclu}>
                        {h.amount === null ? '—' : para(h.amount, h.currency)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            {/* Sessizce kırpmak "hepsi bu" izlenimi verirdi. */}
            {veri.kirpildi && <p className={styles.durum}>{t('cari.truncated')}</p>}
          </>
        )}
      </div>
    </div>
  )
}
