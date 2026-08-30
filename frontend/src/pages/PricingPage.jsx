import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Percent, ShieldCheck, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BrandMark from '@/components/ui/BrandMark'
import AuthThemeToggle from './AuthThemeToggle'
import PublicFooter from '@/components/layout/PublicFooter'
import DonemSecici from '@/components/billing/DonemSecici'
import { useGirisli } from '@/hooks/useGirisli'
import {
  FOUNDER_STAGES,
  BILLING_STARTS_AT,
  kuruculUyeFiyati,
  kuruculIndirimYuzdesi,
  nihaiFiyataGecisAyi,
  yillikTutar,
  yillikAylikKarsiligi,
  yillikKazanc,
  fiyatYaz,
} from '@/config/billing'
import styles from './PricingPage.module.css'

/*
 * FİYATLAR — Kurucu Üye Programı.
 *
 * 🔴 ÜÇ PAKETLİ KLASİK SaaS FİYATLANDIRMASI BİLEREK YOK.
 * Başlangıç / Pro / Kurumsal üçlemesi, hangi özelliğin hangi pakete
 * gireceğini bilecek kullanıcı ve davranış verisi olmadan uydurma bir
 * bölümleme olurdu. Onun yerine tek teklif ve bir zaman çizgisi
 * (ürün sahibi kararı, 27.08.2026).
 *
 * 🔴 ÜSTÜ ÇİZİLİ "499 → 299" GÖRÜNÜMÜ DE YOK.
 * Agresif indirim estetiği hem ucuzlatır hem de hiç uygulanmamış bir
 * "eski fiyat" uydurmak olurdu. Bunun yerine ucuzluğun SEBEBİ
 * anlatılıyor: erken kullanıcı olmak.
 *
 * ⚠️ Ama standart fiyat config'te VAR (`STANDARD_MONTHLY_PRICE`) ve
 * indirim ona göre ölçülüyor. Burada gösterilmiyor olması, taahhüdün
 * ölçülemez olduğu anlamına gelmez — tam tersi, "%40" ifadesi ancak o
 * taban sayesinde doğrulanabiliyor.
 *
 * 🔴 "ŞİMDİ SATIN AL" DÜĞMESİ YOK.
 * Ödeme akışı henüz yazılmadı; çalışmayan bir düğme, deponun daha önce
 * cezasını çektiği hatanın aynısı olurdu ("Ayarlar → Dil" İngilizce
 * sunuyordu ama arayüz Türkçe kalıyordu, yanlış vaat sayılıp geri
 * alındı).
 *
 * Fiyatlar `config/billing.js`ten okunuyor; burada sabit sayı YOK.
 */

const DAHIL = ['decisionTools', 'businessTracking', 'calculations', 'mentor', 'courses', 'integrations', 'community']

/* Kurucu üyeliğin fiyat DIŞINDAKİ karşılıkları.
   ⚠️ Yalnız gerçekten verilenler listeleniyor. Ürün sahibi
   onaylamadıkça "erken erişim" / "doğrudan ekibe ulaşım" gibi
   maddeler buraya EKLENMEZ — vaat edilip yapılmayan özellik, deponun
   daha önce geri almak zorunda kaldığı hatanın aynısıdır. */
const AYRICALIKLAR = ['priceLock', 'badge']

/*
 * Kaydırınca beliren aşamalar.
 *
 * 🔴 MANTIK TERSİNE ÇEVRİLDİ — ve sebebi ölçüldü, tahmin değil.
 *
 * İlk sürüm aşamaları CSS'te `opacity: 0` ile başlatıp JS görünce
 * açıyordu. Tarayıcıda denendi: sekme BOYAMA YAPMADIĞINDA
 * (`document.hidden`) ne `IntersectionObserver` tetikleniyor ne de
 * geçiş ilerliyor — zaman çizgisi kalıcı olarak boş kalıyordu.
 * Sayfanın görsel merkezi görünmez oluyordu. Kullanıcı sayfayı arka
 * plan sekmesinde açtığında gerçekten yaşanabilir bir durum.
 *
 * Artık VARSAYILAN GÖRÜNÜR. Gizleme sınıfını JS ancak gözlemciyi
 * gerçekten kurduktan sonra ekliyor, ve üstüne bir zaman aşımı ağı var:
 * gözlemci belirli sürede konuşmazsa içerik yine açılıyor.
 *
 * İlke: hareket bir süstür, içeriğin görünürlüğü ona bağlanmaz.
 * Bir süs mekanizması bozulduğunda kaybedilecek şey süs olmalı.
 *
 * ⚠️ `useLayoutEffect`: gizleme boyamadan ÖNCE uygulanmalı, yoksa
 * içerik bir kare görünüp sonra kaybolur (göze titreme olarak çarpar).
 */
const BELIRME_ZAMAN_ASIMI = 1500

function useKaydirincaBelir(ref) {
  const azHareket = typeof window !== 'undefined'
    && (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)

  /* `gizli`: içerik şu an saklı mı. Başlangıçta HAYIR. */
  const [gizli, setGizli] = useState(false)

  useLayoutEffect(() => {
    if (azHareket) return undefined
    /* Sekme boyamıyorsa gizlemeye hiç girme: ne gözlemci konuşur ne
       geçiş ilerler, içerik donmuş biçimde saklı kalırdı. */
    if (typeof document !== 'undefined' && document.hidden) return undefined
    const kok = ref.current
    if (!kok || typeof IntersectionObserver === 'undefined') return undefined

    /* Zaten görüş alanındaysa hiç gizleme: kullanıcı sayfayı bu
       bölümde açmışsa "önce kaybolup sonra belirme" saçma olur. */
    const rect = kok.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) return undefined

    setGizli(true)

    const ac = () => setGizli(false)
    const gozlemci = new IntersectionObserver(
      girisler => { if (girisler.some(g => g.isIntersecting)) ac() },
      { threshold: 0.25 },
    )
    gozlemci.observe(kok)

    /* GÜVENLİK AĞI. Gözlemci konuşmazsa (arka plan sekmesi, kısıtlama,
       tarayıcı tuhaflığı) içerik yine de açılır. Bu satır olmadan
       sayfanın görsel merkezi kalıcı olarak kaybolabiliyor. */
    const sayac = setTimeout(ac, BELIRME_ZAMAN_ASIMI)

    return () => {
      gozlemci.disconnect()
      clearTimeout(sayac)
    }
  }, [azHareket, ref])

  return gizli
}

/* Zaman çizgisi metinleri aşama koduna göre; süre ve tutar config'ten
   geliyor ki aşamalar değişince buradaki anlatım da doğru kalsın. */
function sureYaz(asama, t) {
  if (asama.months === null) return t('pricing.timeline.afterwards')
  return t('pricing.timeline.months', { count: asama.months })
}

function ZamanCizgisi({ donem }) {
  const { t, i18n } = useTranslation('common')
  const dil = i18n.resolvedLanguage
  const ref = useRef(null)
  const gizli = useKaydirincaBelir(ref)

  const yillik = donem === 'yearly'

  return (
    <ol className={`${styles.cizgi} ${gizli ? styles.cizgiGizli : ''}`} ref={ref}>
      {FOUNDER_STAGES.map((asama, i) => {
        const sonAsama = asama.months === null

        /* Yalnız NİHAİ aşama döneme göre değişir: ücretsiz ay ve
           lansman dönemi her iki seçenekte de aynı. */
        let fiyat
        if (asama.monthlyPrice === 0) fiyat = t('pricing.free')
        else if (sonAsama && yillik) fiyat = t('billing.pricePerYear', { price: fiyatYaz(yillikTutar(), dil) })
        else fiyat = t('billing.pricePerMonth', { price: fiyatYaz(asama.monthlyPrice, dil) })

        return (
          <li
            key={asama.code}
            className={`${styles.asama} ${sonAsama ? styles.asamaSon : ''}`}
            style={{ '--sira': i }}
          >
            <span className={styles.asamaNo} aria-hidden="true">{i + 1}</span>
            <div className={styles.asamaGovde}>
              <span className={styles.asamaSure}>{sureYaz(asama, t)}</span>
              <strong className={styles.asamaFiyat}>{fiyat}</strong>
              <span className={styles.asamaBaslik}>{t(`pricing.timeline.stages.${asama.code}.title`)}</span>
              <span className={styles.asamaNot}>
                {sonAsama && yillik
                  ? t('pricing.yearlyEquivalent', {
                      monthly: fiyatYaz(yillikAylikKarsiligi(), dil),
                      saving: fiyatYaz(yillikKazanc(), dil),
                    })
                  : t(`pricing.timeline.stages.${asama.code}.note`, { percent: kuruculIndirimYuzdesi() })}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default function PricingPage() {
  const { t, i18n } = useTranslation('common')
  const dil = i18n.resolvedLanguage
  const gecisAyi = nihaiFiyataGecisAyi()
  const [donem, setDonem] = useState('monthly')
  const girisli = useGirisli()

  return (
    <div className={styles.page}>
      <AuthThemeToggle />

      <div className={styles.ustAlan}>
        <div className={styles.glowCool} aria-hidden="true" />

        <div className={styles.ustIcerik}>
          <header className={styles.ust}>
            <Link to="/" className={styles.brandRow}>
              <BrandMark size={30} />
              <span className={styles.brandText}>LocalKarar</span>
            </Link>
            {/* Giriş yapmış kullanıcıya "Giriş yap / Hesap oluştur"
                göstermek anlamsız; onu uygulamaya geri götürüyoruz. */}
            <nav className={styles.ustEylemler}>
              {girisli ? (
                <Link to="/app/dashboard" className={styles.kayitDugmesi}>{t('about.backToApp')}</Link>
              ) : (
                <>
                  <Link to="/login" className={styles.girisLink}>{t('about.signIn')}</Link>
                  <Link to="/register" className={styles.kayitDugmesi}>{t('about.createAccount')}</Link>
                </>
              )}
            </nav>
          </header>

          <section className={styles.kahraman}>
            <span className={styles.eyebrow}>{t('pricing.eyebrow')}</span>
            <h1>{t('pricing.title')}</h1>
            <p className={styles.kahramanMetin}>
              {t('pricing.heroDescription', {
                launchPrice: fiyatYaz(FOUNDER_STAGES[1].monthlyPrice, dil),
                founderPrice: fiyatYaz(kuruculUyeFiyati(), dil),
                percent: kuruculIndirimYuzdesi(),
              })}
            </p>
          </section>
        </div>
      </div>

      <div className={styles.icerik}>
        {/*
          * ÜCRETLENDİRME HENÜZ BAŞLAMADI.
          * `BILLING_STARTS_AT` null olduğu sürece bu not görünür.
          * Fiyat tablosunu gösterip sessiz kalmak, kullanıcının bugün
          * ödeme yapabileceğini ima ederdi.
          */}
        {!BILLING_STARTS_AT && (
          <p className={styles.duyuru} role="status">
            <strong>{t('pricing.notStartedTitle')}</strong> {t('pricing.notStartedDescription')}
          </p>
        )}

        <section className={styles.teklif} aria-labelledby="teklif-baslik">
          <div className={styles.teklifBaslikSatiri}>
            <h2 id="teklif-baslik">{t('pricing.howItWorks')}</h2>
            <span className={styles.rozet}>{t('billing.founderMember')}</span>
          </div>

          {/* Seçim zaman çizgisinin ÜSTÜNDE: kullanıcı önce dönemi
              seçsin, sonra o dönemin rakamlarını görsün. Altına
              koymak, değişen sayının nereden geldiğini gizlerdi. */}
          <div className={styles.donemSatiri}>
            <DonemSecici deger={donem} onChange={setDonem} />
          </div>

          {/*
            * Seçicinin iki şeyi söylemesi gerekiyordu, ikisi de eksikti:
            *
            * 1. Dönem seçimi BUGÜN ödenecek tutarı değiştirmiyor —
            *    lansman bedeli 4 ay boyunca aylık. Seçici hemen fiyatı
            *    değiştiriyormuş gibi duruyordu.
            * 2. Yenileme OTOMATİK (30.08.2026 kararı). Ödeme ekranında
            *    ayrı onay kutusu var; kullanıcı oraya varmadan da
            *    bilmeli.
            *
            * ⚠️ Metin `abonelik.js` 4. bölüm ve `billing.modal.recurringConsent`
            * ile aynı şeyi söylüyor. Üçü ayrışırsa hangisinin bağlayıcı
            * olduğu tartışmalı hâle gelir.
            */}
          <p className={styles.donemNotu}>{t('pricing.periodNote', { month: gecisAyi })}</p>

          <ZamanCizgisi donem={donem} />

          {/*
            * FİYAT AVANTAJI — oransal ve kalıcı.
            * ⚠️ "Fiyatın hiç değişmez" DEMİYOR. Ürün sahibi kararı
            * (28.08.2026) fiyatı dondurmak değil, standart fiyata
            * oranla bağlamak. Metin bunu aynen söylemeli; abonelik
            * sözleşmesindeki ifadeyle birebir örtüşmesi gerekiyor.
            */}
          <div className={styles.kilit}>
            <Percent size={17} aria-hidden="true" />
            <p>
              <strong>{t('pricing.discountTitle', { percent: kuruculIndirimYuzdesi() })}</strong>{' '}
              {t('pricing.discountDescription', { month: gecisAyi, percent: kuruculIndirimYuzdesi() })}
            </p>
          </div>

          <div className={styles.ayricaliklar}>
            <h3 className={styles.ayricalikBaslik}>
              <Sparkles size={16} aria-hidden="true" />
              {t('pricing.benefitsTitle')}
            </h3>
            <ul className={styles.ayricalikListe}>
              {AYRICALIKLAR.map(kod => (
                <li key={kod}>
                  <strong>{t(`pricing.benefits.${kod}.title`)}</strong>
                  <span>{t(`pricing.benefits.${kod}.description`)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.teklifAlt}>
            <ul className={styles.dahilListe}>
              {DAHIL.map(madde => (
                <li key={madde}><Check size={15} aria-hidden="true" /> {t(`pricing.included.${madde}`)}</li>
              ))}
            </ul>

            <div className={styles.eylemKutusu}>
              {/*
                * 🔴 Giriş yapmış kullanıcıyı KAYIT FORMUNA yollamıyoruz.
                *
                * Önceki sürüm koşulsuz `/register`e gidiyordu ve
                * Ayarlar → "Fiyatları gör" yolundan gelen kullanıcı
                * "Ücretsiz başla"ya basınca hesap oluşturma ekranına
                * düşüyordu — zaten hesabı olduğu hâlde.
                *
                * Girişliye gösterilen eylem, onun için gerçekten
                * anlamlı olan yer: kendi üyelik durumu.
                */}
              {girisli ? (
                <>
                  <Link to="/app/settings#uyelik" className={styles.birincilDugme}>
                    {t('pricing.myMembership')}
                  </Link>
                  <span className={styles.eylemNot}>
                    {t('pricing.memberNote')}
                  </span>
                </>
              ) : (
                <>
                  <Link to="/register" className={styles.birincilDugme}>
                    {t('pricing.startFree')}
                  </Link>
                  <span className={styles.eylemNot}>
                    {t('pricing.startNote')}
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        <section className={styles.guvence}>
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <h2>{t('pricing.securityTitle')}</h2>
            {/*
              * ⚠️ Bu cümle YALNIZ PayTR iFrame biçimi kullanıldığı sürece
              * doğrudur: kart alanları PayTR'nin kendi çerçevesinde açılır,
              * veri bizim sunucumuza hiç ulaşmaz. Entegrasyon biçimi
              * değişirse BU METİN DE DEĞİŞMELİ.
              */}
            <p>{t('pricing.securityDescription')}</p>
          </div>
        </section>

        <section className={styles.sss} aria-labelledby="sss-baslik">
          <h2 id="sss-baslik" className={styles.bolumBaslik}>{t('pricing.faqTitle')}</h2>

          <details>
            <summary>{t('pricing.faq.affordable.question')}</summary>
            <p>{t('pricing.faq.affordable.answer')}</p>
          </details>

          <details>
            <summary>{t('pricing.faq.increase.question')}</summary>
            <p>{t('pricing.faq.increase.answer', { percent: kuruculIndirimYuzdesi() })}</p>
          </details>

          <details>
            <summary>{t('pricing.faq.yearly.question')}</summary>
            <p>{t('pricing.faq.yearly.answer', { saving: fiyatYaz(yillikKazanc(), dil) })}</p>
          </details>

          <details>
            <summary>{t('pricing.faq.freeMonth.question')}</summary>
            <p>{t('pricing.faq.freeMonth.answer')}</p>
          </details>

          <details>
            <summary>{t('pricing.faq.cancel.question')}</summary>
            <p>{t('pricing.faq.cancel.answer')}</p>
          </details>

          <details>
            <summary>{t('pricing.faq.invoice.question')}</summary>
            <p>{t('pricing.faq.invoice.answer')}</p>
          </details>
        </section>
      </div>

      <PublicFooter />
    </div>
  )
}
