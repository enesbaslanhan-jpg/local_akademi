import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Percent, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import { api } from '@/services/api'
import BillingProfileForm from './BillingProfileForm'
import LegalModal from '@/components/legal/LegalModal'
import {
  BILLING_STARTS_AT,
  ilkUcretliTutar,
  kuruculUyeFiyati,
  kuruculIndirimYuzdesi,
  nihaiFiyataGecisAyi,
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
 * 🔴 DÖNEM SEÇİMİ YOK (31.08.2026).
 * Kampanya boyunca tahsilat aylık ve lansman bedeli üzerinden; dönem
 * seçimi ancak nihai aşamada anlam kazanıyor. Ödeme anında sormak,
 * bugün ödenecek tutarı değiştirmeyen bir soru sormaktı. Gerekçenin
 * tamamı fiyat sayfasındaki `ZamanCizgisi` yorumunda.
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
  /*
   * 🔴 DÖNEM SEÇİMİ KAMPANYA BOYUNCA YOK (ürün sahibi kararı,
   * 31.08.2026) — fiyat sayfasındaki gerekçenin aynısı.
   *
   * Bugün tahsil edilen tutar lansman bedeli ve AYLIK; dönem seçimi
   * ancak 5. aydan itibaren anlam kazanıyor. Ödeme anında sormak,
   * kullanıcıya bugün ödeyeceğini değiştirmeyen bir soru sormaktı.
   *
   * Sabit `monthly`: sunucu `period` alanını bekliyor ve abonelik
   * öyle başlıyor. Kampanya bitince Ayarlar'dan değiştirilebilecek.
   */
  const donem = 'monthly'
  const [sozlesmeOnayi, setSozlesmeOnayi] = useState(false)
  const [caymaFeragati, setCaymaFeragati] = useState(false)
  /*
   * ÖDEME ÇERÇEVESİ.
   *
   * Dolu olduğunda PayTR'nin kart formu panelin İÇİNDE açılıyor;
   * kullanıcı localkarar.com'dan çıkmıyor ve kart numarası/CVV
   * sunucularımıza hiç değmiyor. Gizlilik metnindeki "kart bilgisi
   * saklamıyoruz" cümlesinin dayanağı bu biçim.
   */
  const [cerceveAdresi, setCerceveAdresi] = useState(null)
  /*
   * FATURA KİMLİĞİ — ödemeden önceki adım (ürün sahibi kararı).
   *
   * `undefined` = henüz sorulmadı, `null` = kaydı yok, nesne = var.
   * Üç hâl ayrı: yükleniyorken "fatura bilgisi eksik" demek, henüz
   * bilmediğimiz bir şeyi iddia etmek olurdu.
   */
  const [faturaKimligi, setFaturaKimligi] = useState(undefined)
  const [formAcik, setFormAcik] = useState(false)
  /*
   * 🔴 YASAL METİNLER PANELİN İÇİNDE AÇILIYOR.
   *
   * Önceden `target="_blank"` bağlantılardı ve ürün sahibi bildirdi:
   * "metinleri okuyup geri dönünce sayfa gidiyor, içinde açılması
   * gerek değil mi". Haklıydı — ve deponun bu soruna verdiği cevap
   * ZATEN VARDI: `LegalModal`, kayıt formu için tam bu gerekçeyle
   * yazılmış ("aynı sekmede gidilseydi formda yazılanlar kaybolurdu")
   * ve üç yerde kullanılıyor. Ödeme paneli tek istisnaydı.
   *
   * Onaylar panelin durumunda; metni okumak için paneli terk etmek,
   * işaretlenmiş üç kutuyu da kaybetmek demekti.
   */
  const [okunanBelge, setOkunanBelge] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [hata, setHata] = useState(null)

  /* Panel açılınca bir kez okunuyor. Kapalıyken istek atmak,
     kullanıcının hiç açmadığı bir panel için sunucuyu meşgul etmek
     olurdu. */
  useEffect(() => {
    if (!open) return undefined
    let gecerli = true
    api.payments.faturaKimligiOku()
      .then(y => { if (gecerli) setFaturaKimligi(y?.faturaKimligi ?? null) })
      /* Okunamazsa akış DURMUYOR: kullanıcı formu doldurur, sunucu
         zaten son sözü söylüyor. */
      .catch(() => { if (gecerli) setFaturaKimligi(null) })
    return () => { gecerli = false }
  }, [open])

  const bugunOdenecek = ilkUcretliTutar()
  const sonraki = sonrakiOdemeTarihi()
  const gecisAyi = nihaiFiyataGecisAyi()
  /* Üçü de şart — gerekçe onay kutularının üstünde yazılı. */
  const onaylarTam = sozlesmeOnayi && caymaFeragati

  async function odemeBaslat() {
    /*
     * 🔴 Fatura bilgisi yoksa ÖNCE form.
     *
     * Sunucu da aynı kapıyı taşıyor (422 BILLING_PROFILE_REQUIRED);
     * buradaki kontrol yalnız kullanıcıya anlaşılır bir adım
     * göstermek için. Ön yüzün sırasına güvenmek kapı olmazdı.
     */
    if (!faturaKimligi) { setFormAcik(true); return }

    setYukleniyor(true)
    setHata(null)
    try {
      const sonuc = await api.payments.checkout({
        period: donem, sozlesmeOnayi, caymaFeragati,
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

  /*
   * ⚠️ `odemeBaslat` fatura kimliğine BAKIYOR, bu ise bakmıyor.
   *
   * Form kaydedildiği anda `faturaKimligi` durumu henüz React
   * tarafından yazılmamış olabiliyor; `odemeBaslat` çağrılsaydı
   * kimliği yok sanıp formu tekrar açardı — kullanıcı kaydettiği
   * formu yeniden görürdü.
   */
  async function odemeBaslatKimlikle() {
    setYukleniyor(true)
    setHata(null)
    try {
      const sonuc = await api.payments.checkout({
        period: donem, sozlesmeOnayi, caymaFeragati,
      })
      if (sonuc?.iframeUrl) setCerceveAdresi(sonuc.iframeUrl)
      else setHata(t('billing.modal.initFailed'))
    } catch (e) {
      setHata(e?.apiMessage || e?.message || t('billing.modal.initFailed'))
    } finally {
      setYukleniyor(false)
    }
  }

  function kapat() {
    setFormAcik(false)
    setCerceveAdresi(null)
    setHata(null)
    setBasarili(false)
    /* Onaylar sıfırlanıyor: panel yeniden açıldığında kullanıcı
       önceki oturumun onayını devralmamalı. */
    setSozlesmeOnayi(false)
    setCaymaFeragati(false)
    onClose?.()
  }

  /*
   * PANEL `lg` (720px), `md` (560px) DEĞİL.
     *
     * Ölçüldü: 560px'te gövde 900px'lik ekranda 826px yer istiyordu
     * ve 137px kaydırma bırakıyordu. Ürün sahibi "neden aşağı yukarı
     * indirilebilir, tek sayfa olsa daha iyi değil mi" dedi. Onay
     * metinleri hukuken kısaltılamaz; kazanılacak yer GENİŞLİKTEN
   * geliyor — aynı cümleler daha az satıra sığıyor.
   */
  return (
    <>
    <Modal open={open} onClose={kapat} size="lg" title={basarili ? undefined : t('billing.modal.title')}>
      {formAcik ? (
        /*
         * Fatura kimlik adımı. Kaydedilir kaydedilmez ödeme
         * başlıyor: kullanıcı "Öde ve üyeliği başlat"a bastı, araya
         * ikinci bir onay koymak akışı gereksiz uzatırdı.
         */
        <BillingProfileForm
          baslangic={faturaKimligi ?? undefined}
          onVazgec={() => setFormAcik(false)}
          onKaydedildi={async kimlik => {
            setFaturaKimligi(kimlik)
            setFormAcik(false)
            await odemeBaslatKimlikle()
          }}
        />
      ) : cerceveAdresi ? (
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
        /*
         * 🔴 İKİ SÜTUN — panel KAYDIRILMASIN diye.
         *
         * Ürün sahibi iki kez bildirdi: "neden aşağı yukarı
         * indirilebilir, tek sayfa olsa daha iyi değil mi" ve sonra
         * "kaymayacak bir tasarımla devam edebilirsin".
         *
         * Tek sütunda içerik 727px istiyordu ve panelin gövdesine
         * sığmıyordu. Onay metinleri hukuken kısaltılamaz, yani
         * yükseklik metinden kazanılamazdı — kurgudan kazanıldı:
         * solda "ne ödeyeceğim", sağda "onaylıyorum ve ödüyorum".
         * Fiyat sayfasındaki onaylanmış düzenin aynı mantığı.
         *
         * Dar ekranda tek sütuna iniyor ve orada kaydırma normal.
         */
        <div className={styles.izgara}>
          <div className={styles.sutun}>
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
              deger={t('billing.pricePerMonth', { price: fiyatYaz(kuruculUyeFiyati(), dil) })}
            />
          </section>

          {/* ⚠️ "Fiyatın kilitli" DEMİYOR: kurucu indirimi oransal,
              fiyat standart fiyatla birlikte hareket ediyor. Abonelik
              sözleşmesindeki ifadeyle birebir aynı olmalı. */}
          <div className={styles.kilit}>
            <Percent size={15} aria-hidden="true" />
            <span>{t('billing.modal.lockedPrice', { percent: kuruculIndirimYuzdesi() })}</span>
          </div>

          {/*
            * 🔴 "GÜVENLİ ÖDEME ALANI" YER TUTUCUSU KALDIRILDI.
            *
            * Kesikli çerçeveli, 30px dolgulu boş bir kutuydu ve tek
            * başına 208px yer kaplıyordu — panelin kaymasının en büyük
            * tek sebebi. Söylediği iki şey de başka yerde zaten yazılı:
            * kartın PayTR'de işlendiği aşağıdaki güvenlik notunda,
            * ücretlendirmenin başlamadığı ise panelin altındaki notta.
            *
            * Ödeme açıldığında bu alan zaten kullanılmıyordu: token
            * gelince PANELİN TAMAMI iframe'e dönüşüyor.
            */}
          <p className={styles.guvenlikNot}>
            <ShieldCheck size={14} aria-hidden="true" />
            {t('billing.modal.securityNote')}
          </p>
          </div>

          <div className={styles.sutun}>

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
              <button type="button" className={styles.belgeBaglantisi} onClick={() => setOkunanBelge('mesafeli-satis')}>{t('billing.modal.distanceSale')}</button>
              {', '}
              <button type="button" className={styles.belgeBaglantisi} onClick={() => setOkunanBelge('on-bilgilendirme')}>{t('billing.modal.preInfo')}</button>{' '}
              {t('billing.modal.and')}{' '}
              <button type="button" className={styles.belgeBaglantisi} onClick={() => setOkunanBelge('terms')}>{t('billing.modal.terms')}</button>
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
            * 🔴 ÜÇÜNCÜ KUTU KALDIRILDI (01.09.2026).
            *
            * Burada kart saklama ve otomatik tahsilat izni isteniyordu.
            * PayTR'nin cevabı üzerine otomatik yenilemeden vazgeçildi;
            * kart hiç saklanmıyor, tekrarlayan tahsilat yapılmıyor.
            *
            * Verilmeyecek bir yetki için izin istemek KVKK veri
            * minimizasyonuna aykırı: kullanıcıya yapmadığımız bir şeyi
            * onaylatmış olurduk.
            *
            * ⚠️ CAYMA FERAGATİ KUTUSU YERİNDE KALIYOR — o ayrı bir
            * yükümlülük (Mesafeli Sözleşmeler Yönetmeliği) ve bu
            * kararla ilgisi yok.
            */}
          <button
            type="button"
            className={styles.birincilDugme}
            /* Onaylar şart: ikisi olmadan sözleşme kurulamaz. `demoBasari`
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
        </div>
      )}
    </Modal>

    {/*
      * ⚠️ KARDEŞ, iç içe DEĞİL. `Modal` portal kullanmıyor; yasal
      * metin penceresini ödeme panelinin gövdesinin içine koymak onu
      * panelin kaydırma alanına hapsederdi.
      *
      * Metni ayrı bir bileşen yazarak değil `LegalModal` ile
      * gösteriyoruz: çizim `LegalPage`in kendi bileşeninden geliyor,
      * yani metinler her güncellendiğinde iki yerin ayrışma riski yok.
      */}
    <LegalModal
      type={okunanBelge}
      open={Boolean(okunanBelge)}
      onClose={() => setOkunanBelge(null)}
    />
    </>
  )
}
