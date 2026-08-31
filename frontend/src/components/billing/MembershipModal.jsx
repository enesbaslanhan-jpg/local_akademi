import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Percent, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import { api } from '@/services/api'
import DonemSecici from './DonemSecici'
import {
  BILLING_STARTS_AT,
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
 * ✅ PAYTR ÇERÇEVESİ BAĞLANDI (31.08.2026).
 * Onaylar tamamlanıp düğmeye basıldığında `/payments/checkout`
 * çağrılıyor; dönen token ile PayTR'nin kart formu bu panelin İÇİNDE
 * açılıyor. Kullanıcı siteden çıkmıyor, kart numarası ve CVV bizim
 * sunucularımıza hiç ulaşmıyor — gizlilik metnindeki "kart bilgisi
 * saklamıyoruz" cümlesinin ve PCI-DSS kapsamı dışında kalmamızın
 * dayanağı bu.
 *
 * 🔴 İKİ BAĞIMLILIK, ikisi de sessizce kırılabilir:
 *   1. CSP'de `frame-src https://www.paytr.com` olmalı; yoksa çerçeve
 *      yüklenmez ve ekranda boş bir kutu kalır.
 *   2. Aktivasyon BURADA olmaz. Ödeme bitince PayTR sunucu-sunucu
 *      callback'i çağırıyor; bu panelin gördüğü şey yalnız formun
 *      kendisi.
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
  /*
   * ÖDEME ÇERÇEVESİ.
   *
   * Dolu olduğunda PayTR'nin kart formu panelin İÇİNDE açılıyor;
   * kullanıcı localkarar.com'dan çıkmıyor ve kart numarası/CVV
   * sunucularımıza hiç değmiyor. Gizlilik metnindeki "kart bilgisi
   * saklamıyoruz" cümlesinin dayanağı bu biçim.
   */
  const [cerceveAdresi, setCerceveAdresi] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState(null)

  const bugunOdenecek = ilkUcretliTutar()
  const sonraki = sonrakiOdemeTarihi()
  const gecisAyi = nihaiFiyataGecisAyi()
  const yillik = donem === 'yearly'
  /* Üçü de şart — gerekçe onay kutularının üstünde yazılı. */
  const onaylarTam = sozlesmeOnayi && caymaFeragati && otomatikTahsilat

  async function odemeBaslat() {
    setYukleniyor(true)
    setHata(null)
    try {
      const sonuc = await api.payments.checkout({
        period: donem, sozlesmeOnayi, caymaFeragati, otomatikTahsilat,
      })
      /* Token gelmeden çerçeve AÇILMIYOR: boş bir iframe, kullanıcıya
         "bir şeyler oldu ama ne" hissi verir. */
      if (sonuc?.iframeUrl) setCerceveAdresi(sonuc.iframeUrl)
      else setHata(t('billing.modal.initFailed'))
    } catch (e) {
      setHata(e?.message || t('billing.modal.initFailed'))
    } finally {
      setYukleniyor(false)
    }
  }

  function kapat() {
    setCerceveAdresi(null)
    setHata(null)
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
      {cerceveAdresi ? (
        /*
         * PayTR ödeme çerçevesi.
         *
         * 🔴 CSP'de `frame-src https://www.paytr.com` olmadan bu
         * iframe YÜKLENMEZ ve ekranda boş bir kutu kalır; sebep yalnız
         * tarayıcı konsolunda görünür, sunucu günlüğünde hiç iz olmaz.
         *
         * Sonuç ekranı BURADA değil: ödeme bitince PayTR kendi
         * `merchant_ok_url`ine yönlendiriyor ve aktivasyon yalnız
         * sunucu-sunucu callback'te oluyor.
         */
        <div className={styles.cerceveKabi}>
          <iframe
            src={cerceveAdresi}
            title={t('billing.modal.frameTitle')}
            className={styles.odemeCercevesi}
          />
        </div>
      ) : basarili ? (
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
            /* Onaylar şart: üçü olmadan sözleşme kurulamaz. `demoBasari`
               geliştirmede başarı ekranını görmek için kısa yol. */
            disabled={!onaylarTam || yukleniyor}
            onClick={() => {
              if (!onaylarTam) return
              if (demoBasari) setBasarili(true)
              else odemeBaslat()
            }}
          >
            {yukleniyor
              ? t('billing.modal.preparing')
              : t('billing.modal.payAndStart', { price: fiyatYaz(bugunOdenecek, dil) })}
          </button>

          {hata && <p className={styles.hataNot}>{hata}</p>}

          {/*
            * Ücretlendirme henüz başlamadıysa sebebi YAZILI kalıyor.
            *
            * Düğme bilerek devre dışı DEĞİL: gerçek kapı sunucuda
            * (`/payments/checkout` 409 döner) ve devre dışı bir düğme
            * güvenlik sınırı sayılmaz. Ama kullanıcıyı hataya
            * tıklatmak yerine sebebi önden söylemek doğrusu.
            */}
          {!BILLING_STARTS_AT && (
            <p className={styles.pasifNot}>
              {t('billing.modal.billingNotStarted')}
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
