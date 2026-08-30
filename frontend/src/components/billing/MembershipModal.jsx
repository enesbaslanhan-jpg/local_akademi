import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Percent, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import DonemSecici from './DonemSecici'
import {
  YEARLY_FREE_MONTHS,
  ilkUcretliTutar,
  kuruculUyeFiyati,
  kuruculIndirimYuzdesi,
  nihaiFiyataGecisAyi,
  yillikTutar,
  yillikKazanc,
  fiyatYaz,
} from '@/config/billing'
import styles from './MembershipModal.module.css'

/*
 * ÜYELİĞİ ETKİNLEŞTİR — ödeme paneli.
 *
 * Ayrı bir sayfa değil, merkezde açılan bir panel (ürün sahibi kararı,
 * 27.08.2026). Sebep: ödeme, kullanıcının bulunduğu bağlamdan
 * koparılmadan tamamlanmalı; ayrı sayfa hem gezinme yükü hem de geri
 * dönüşte "neredeydim" sorusu yaratıyor.
 *
 * 🔴 ÖZET, ÖDEME ALANINDAN ÖNCE GELİR.
 * Kullanıcı kart bilgisini girmeden önce bugün ne ödeyeceğini, bir
 * sonraki tahsilatın ne zaman ve ne kadar olacağını ve uzun vadeli
 * fiyatı görmüş olmalı. Mesafeli sözleşme mevzuatı da ön bilgilendirmeyi
 * sözleşme kurulmadan ÖNCE şart koşuyor.
 *
 * 🔴 DÖNEM SEÇİMİ BUGÜNKÜ TAHSİLATI DEĞİŞTİRMEZ.
 * Aylık/yıllık seçimi NİHAİ aşamadan itibaren geçerli. Bugün ödenen
 * tutar lansman dönemi ücreti ve o aylık. Seçime göre bugünkü tutarı
 * değiştirmek, kullanıcının henüz girmediği bir dönemin parasını peşin
 * almak olurdu — özette de böyle yazılı.
 *
 * 🔴 PAYTR ALANI HENÜZ BOŞ.
 * Entegrasyon biçimi iFrame olarak seçildi: kart alanları PayTR'nin
 * kendi çerçevesinde açılacak, veri bizim sunucumuza hiç ulaşmayacak.
 * Merchant bilgileri gelene kadar buraya ne olduğunu SÖYLEYEN bir yer
 * tutucu konuyor — sahte bir kart formu çizmek, çalışıyormuş izlenimi
 * verirdi.
 */

/* Tarih biçimi tek yerde: özet ile başarı kartı aynı biçimi kullanmalı,
   yoksa kullanıcı iki farklı tarih görüyormuş gibi hisseder. */
function tarihYaz(tarih, locale) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(tarih)
}

/** Bir sonraki tahsilat: ilk ücretli aşamanın ikinci ayı. */
function sonrakiOdemeTarihi(bugun = new Date()) {
  const d = new Date(bugun)
  d.setMonth(d.getMonth() + 1)
  return d
}

function OzetSatiri({ etiket, deger, vurgulu }) {
  return (
    <div className={`${styles.ozetSatir} ${vurgulu ? styles.ozetSatirVurgulu : ''}`}>
      <span className={styles.ozetEtiket}>{etiket}</span>
      <span className={styles.ozetDeger}>{deger}</span>
    </div>
  )
}

/*
 * BAŞARI DURUMU.
 *
 * Halka çizilir, ardından tik belirir — toplam ~1 saniye.
 * Konfeti YOK (ürün sahibi kararı): ödeme ciddi bir işlem, kutlama
 * abartısı güven duygusunu zayıflatır.
 *
 * ⚠️ `prefers-reduced-motion` açıkken animasyon çalışmaz, sonuç
 * doğrudan görünür. Depo bu ayara başka yerlerde de saygı duyuyor
 * (akış videoları), tutarlı kalıyoruz.
 */
function BasariDurumu({ onKapat }) {
  const { t, i18n } = useTranslation('common')
  const sonraki = sonrakiOdemeTarihi()

  return (
    <div className={styles.basari} role="status" aria-live="polite">
      <div className={styles.halkaSarmal} aria-hidden="true">
        <svg viewBox="0 0 52 52" className={styles.halka}>
          <circle className={styles.halkaCizgi} cx="26" cy="26" r="23" />
          <path className={styles.tik} d="M15 27 l7.5 7.5 L38 19" />
        </svg>
      </div>

      <h3 className={styles.basariBaslik}>{t('billing.modal.successTitle')}</h3>
      <p className={styles.basariMetin}>{t('billing.modal.successDescription')}</p>

      <div className={styles.bilgiKarti}>
        <span className={styles.bilgiRozet}>{t('billing.founderMember')}</span>
        <span className={styles.bilgiSatir}>
          {t('billing.modal.nextPaymentValue', {
            date: tarihYaz(sonraki, i18n.resolvedLanguage),
            price: fiyatYaz(ilkUcretliTutar(), i18n.resolvedLanguage),
          })}
        </span>
      </div>

      <button type="button" className={styles.birincilDugme} onClick={onKapat}>
        {t('billing.modal.backToLocalKarar')}
      </button>
    </div>
  )
}

export default function MembershipModal({ open, onClose, demoBasari = false }) {
  const { t, i18n } = useTranslation('common')
  const dil = i18n.resolvedLanguage
  const [basarili, setBasarili] = useState(false)
  const [donem, setDonem] = useState('monthly')
  const [sozlesmeOnayi, setSozlesmeOnayi] = useState(false)
  const [caymaFeragati, setCaymaFeragati] = useState(false)
  const [otomatikTahsilat, setOtomatikTahsilat] = useState(false)

  const bugunOdenecek = ilkUcretliTutar()
  const sonraki = sonrakiOdemeTarihi()
  const gecisAyi = nihaiFiyataGecisAyi()
  const yillik = donem === 'yearly'
  /* Üçü de şart — gerekçe onay kutularının üstünde yazılı. */
  const onaylarTam = sozlesmeOnayi && caymaFeragati && otomatikTahsilat

  function kapat() {
    setBasarili(false)
    /* Onaylar sıfırlanıyor: panel yeniden açıldığında kullanıcı
       önceki oturumun onayını devralmamalı. */
    setSozlesmeOnayi(false)
    setCaymaFeragati(false)
    setOtomatikTahsilat(false)
    onClose?.()
  }

  return (
    <Modal open={open} onClose={kapat} size="md" title={basarili ? undefined : t('billing.modal.title')}>
      {basarili ? (
        <BasariDurumu onKapat={kapat} />
      ) : (
        <div className={styles.govde}>
          {/* ---------- Dönem seçimi ---------- */}
          <div className={styles.donemAlani}>
            <span className={styles.donemEtiket}>{t('billing.modal.periodLabel')}</span>
            <DonemSecici deger={donem} onChange={setDonem} variant="app" />
          </div>

          {/* ---------- Özet: ödemeden ÖNCE ---------- */}
          <section className={styles.ozet} aria-label={t('billing.modal.summaryAria')}>
            <OzetSatiri
              etiket={t('billing.modal.dueToday')}
              deger={fiyatYaz(bugunOdenecek, dil)}
              vurgulu
            />
            <OzetSatiri
              etiket={t('billing.modal.nextPayment')}
              deger={`${tarihYaz(sonraki, dil)} · ${fiyatYaz(bugunOdenecek, dil)}`}
            />
            <OzetSatiri
              etiket={t('billing.modal.fromMonth', { month: gecisAyi })}
              deger={
                yillik
                  ? t('billing.pricePerYear', { price: fiyatYaz(yillikTutar(), dil) })
                  : t('billing.pricePerMonth', { price: fiyatYaz(kuruculUyeFiyati(), dil) })
              }
            />
          </section>

          {yillik && (
            <p className={styles.yillikNot}>
              {t('billing.modal.yearlyNote', {
                count: YEARLY_FREE_MONTHS,
                saving: fiyatYaz(yillikKazanc(), dil),
              })}
            </p>
          )}

          {/* ⚠️ "Fiyatın kilitli" DEMİYOR: kurucu indirimi oransal,
              fiyat standart fiyatla birlikte hareket ediyor. Abonelik
              sözleşmesindeki ifadeyle birebir aynı olmalı. */}
          <div className={styles.kilit}>
            <Percent size={15} aria-hidden="true" />
            <span>{t('billing.modal.lockedPrice', { percent: kuruculIndirimYuzdesi() })}</span>
          </div>

          {/* ---------- PayTR alanı ---------- */}
          <section className={styles.odemeAlani} aria-label={t('billing.modal.paymentAreaAria')}>
            {/*
              * Buraya PayTR iFrame gelecek. Yer tutucu bilerek "kart
              * formu gibi" görünmüyor: sahte alanlar çizmek, çalışan bir
              * ödeme varmış izlenimi verirdi.
              */}
            <div className={styles.yerTutucu}>
              <ShieldCheck size={22} aria-hidden="true" />
              <p className={styles.yerTutucuBaslik}>{t('billing.modal.securePaymentTitle')}</p>
              <p className={styles.yerTutucuNot}>{t('billing.modal.securePaymentDescription')}</p>
            </div>

            <p className={styles.guvenlikNot}>
              <ShieldCheck size={14} aria-hidden="true" />
              {t('billing.modal.securityNote')}
            </p>
          </section>

          {/* ---------- Onaylar ----------
            *
            * 🔴 İKİ AYRI KUTU, BİLEREK.
            *
            * Mesafeli Sözleşmeler Yönetmeliği, elektronik ortamda
            * anında ifa edilen hizmetlerde cayma hakkı istisnasını
            * tüketicinin AYRI ve AÇIK onayına bağlıyor. Bu onayı genel
            * "koşulları kabul ediyorum" kutusuna gömmek, istisnanın
            * dayanağını ortadan kaldırır — tek kutuyla alınan feragat
            * geçersiz sayılır.
            *
            * Bu yüzden birincisi sözleşmeleri, ikincisi yalnız
            * feragati onaylıyor ve ikisi de işaretlenmeden ödeme
            * düğmesi açılmıyor.
            */}
          <label className={styles.onayKutusu}>
            <input
              type="checkbox"
              checked={sozlesmeOnayi}
              onChange={e => setSozlesmeOnayi(e.target.checked)}
            />
            <span>
              {t('billing.modal.consentBefore')}{' '}
              <Link to="/mesafeli-satis" target="_blank" rel="noreferrer">{t('billing.modal.distanceSale')}</Link>
              {', '}
              <Link to="/on-bilgilendirme" target="_blank" rel="noreferrer">{t('billing.modal.preInfo')}</Link>{' '}
              {t('billing.modal.and')}{' '}
              <Link to="/terms" target="_blank" rel="noreferrer">{t('billing.modal.terms')}</Link>
              {t('billing.modal.consentAfter')}
            </span>
          </label>

          <label className={styles.onayKutusu}>
            <input
              type="checkbox"
              checked={caymaFeragati}
              onChange={e => setCaymaFeragati(e.target.checked)}
            />
            <span>{t('billing.modal.withdrawalWaiver')}</span>
          </label>

          {/*
            * ÜÇÜNCÜ KUTU — kart saklama ve otomatik tahsilat.
            *
            * Ürün sahibi 30.08.2026'da yenilemenin OTOMATİK olmasına
            * karar verdi. Tekrarlayan tahsilat, kullanıcının kartının
            * saklanmasını gerektiriyor; bu, sözleşmeyi okumaktan da
            * cayma hakkından da AYRI bir izin.
            *
            * Üç kutuyu tek "kabul ediyorum"da birleştirmek, üçünün de
            * dayanağını zayıflatırdı: kullanıcı neyi onayladığını
            * ayırt edemez.
            *
            * 🔴 Metin, `abonelik.js` 4. bölümle birebir aynı şeyi
            * söylemeli. PayTR kart saklama yetkisi vermezse ikisi
            * BİRLİKTE elle yenilemeye dönecek.
            */}
          <label className={styles.onayKutusu}>
            <input
              type="checkbox"
              checked={otomatikTahsilat}
              onChange={e => setOtomatikTahsilat(e.target.checked)}
            />
            <span>{t('billing.modal.recurringConsent')}</span>
          </label>

          <button
            type="button"
            className={styles.birincilDugme}
            /* Ödeme akışı yokken düğme çalışmaz. `demoBasari` yalnız
               geliştirme sırasında başarı durumunu görmek için.
               Onaylar da şart: ikisi olmadan sözleşme kurulamaz. */
            disabled={!demoBasari || !onaylarTam}
            onClick={() => demoBasari && onaylarTam && setBasarili(true)}
          >
            {t('billing.modal.payAndStart', { price: fiyatYaz(bugunOdenecek, dil) })}
          </button>

          {!demoBasari && (
            <p className={styles.pasifNot}>
              {t('billing.modal.billingNotStarted')}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
