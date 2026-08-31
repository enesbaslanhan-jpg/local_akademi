import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, CreditCard, Sparkles } from 'lucide-react'
import MembershipModal from './MembershipModal'
import { uyelikSunumu } from './uyelik-sunumu'
import { FOUNDER_STAGES, kuruculIndirimYuzdesi, fiyatYaz } from '@/config/billing'
import styles from './MembershipSettings.module.css'

/*
 * AYARLAR → ÜYELİK VE FATURALANDIRMA.
 *
 * 🔴 ÖNCEDEN İKİ AYRI DAL VARDI ve ürün sahibi haklı olarak "bu sayfa
 * aynı" dedi. `billing_not_started` dalı düz bir tanım listesiydi;
 * `active` dalı bambaşka bir düzendi. Aynı ekranın iki iskeleti
 * olduğu için onaylanan tasarım (tasarim/Uyelik.dc.html) hiçbirine
 * uymuyordu ve uygulanamamıştı.
 *
 * Şimdi TEK DÜZEN var, durum yalnız içeriği değiştiriyor:
 *
 *   [ durum kartı: nokta + başlık + alt metin + kurucu rozeti ]
 *   [ bugün ödediğin | sonraki tahsilat ]
 *   [ birincil eylem ]
 *   [ sırada ne var — aşamalar ]
 *   [ faturalarım | üyeliği iptal et ]
 *   fiyatlandırmanın tamamı →
 *
 * Metinlerin hangi durumda ne diyeceği burada DEĞİL `uyelik-sunumu.js`
 * içinde; Ana Sayfa şeridi de aynı dosyadan okuyor ki iki ekran
 * birbirinden ayrışmasın.
 *
 * 🔴 "ÜYELİĞİ İPTAL ET" SAKLANMIYOR (ürün sahibi kararı, 27.08.2026).
 * İptali menü altına gömmek karanlık desendir; abonelik mevzuatı da
 * iptalin en az üyelik kadar kolay olmasını bekliyor.
 *
 * ⚠️ Ama bugün iptal ve fatura uçları YOK. Düğmeleri tıklanabilir
 * bırakıp hiçbir şey yaptırmamak, olmayan düğmeden kötüdür: kullanıcı
 * iptal ettiğini sanır. İkisi de devre dışı ve SEBEBİNİ SÖYLEYEN bir
 * not taşıyor. Gizlemiyoruz — gizlemek yukarıdaki kararı bozardı.
 */

function Olcu({ etiket, deger }) {
  return (
    <div className={styles.olcu}>
      <span className={styles.olcuEtiket}>{etiket}</span>
      <strong className={styles.olcuDeger}>{deger}</strong>
    </div>
  )
}

export default function MembershipSettings({ membership }) {
  const { t, i18n } = useTranslation('common')
  const locale = i18n.resolvedLanguage || i18n.language
  const [odemeAcik, setOdemeAcik] = useState(false)

  const s = uyelikSunumu(membership, { locale })

  /* Birincil eylem iki yere gidebiliyor: ödeme paneli ya da fiyat
     sayfası. Ücretlendirme kapalıyken ödeme paneli açılamaz, o yüzden
     düğme değil bağlantı çiziliyor — tıklanınca hiçbir şey olmayan
     düğme bırakmamak için. */
  const odemeyeGider = s.birincil.hedef === 'odeme'

  return (
    <div className={styles.govde}>
      <section className={styles.durumKarti}>
        <header className={styles.durumBasi}>
          <div className={styles.durumMetni}>
            <span className={styles.ustEtiket}>{t('billing.settings.membershipStatus')}</span>
            <div className={styles.durumSatiri}>
              <span className={`${styles.nokta} ${styles[`ton_${s.ton}`]}`} aria-hidden="true" />
              <strong className={styles.durumBaslik}>{t(s.baslik.anahtar, s.baslik.degerler)}</strong>
            </div>
            <span className={styles.durumAlt}>{t(s.alt.anahtar, s.alt.degerler)}</span>
          </div>

          {/* Kurucu rozeti yalnız sunucu `founder: true` derse. Kararı
              arayüz vermiyor — aynı mantığı iki yerde tutmak ayrışır. */}
          {s.rozetVar && (
            <span className={styles.kurucuRozeti}>
              <Sparkles size={14} aria-hidden="true" />
              {t('billing.founderMember')}
            </span>
          )}
        </header>

        {/* İki ölçü: "bugün ne ödüyorum" ve "sırada ne var". Ürün
            sahibinin ekranda ilk aradığı iki sayı bunlar. */}
        <div className={styles.olculer}>
          <Olcu etiket={t(s.sol.etiket)} deger={s.sol.deger ?? t(s.sol.degerAnahtar)} />
          <Olcu etiket={t(s.sag.etiket)} deger={s.sag.deger ?? t(s.sag.degerAnahtar)} />
        </div>

        <footer className={styles.eylemAlani}>
          {odemeyeGider ? (
            <button type="button" className={styles.birincilDugme} onClick={() => setOdemeAcik(true)}>
              {t(s.birincil.anahtar)} <ArrowRight size={15} aria-hidden="true" />
            </button>
          ) : (
            <Link to="/fiyatlar" className={styles.birincilDugme}>
              {t(s.birincil.anahtar)} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          )}

          {s.uyelikVar && s.birincil.anahtar !== 'billing.settings.managePayment' && (
            <button type="button" className={styles.ikincilDugme} onClick={() => setOdemeAcik(true)}>
              <CreditCard size={15} aria-hidden="true" /> {t('billing.settings.managePayment')}
            </button>
          )}
        </footer>
      </section>

      {/* ---------- Sırada ne var ---------- */}
      <section className={styles.planKarti}>
        <div className={styles.planBasi}>
          <Clock size={16} aria-hidden="true" />
          <strong>{t(s.planBaslik)}</strong>
        </div>
        <ol className={styles.planListe}>
          {FOUNDER_STAGES.map(asama => (
            <li key={asama.code}>
              <strong className={asama.monthlyPrice === 0 ? styles.bedava : ''}>
                {asama.monthlyPrice === 0
                  ? t('billing.settings.freeStage')
                  : t('billing.pricePerMonth', { price: fiyatYaz(asama.monthlyPrice, locale) })}
              </strong>
              <span>{t(`billing.settings.stage.${asama.code}`, { count: asama.months ?? 0 })}</span>
            </li>
          ))}
        </ol>
        <p className={styles.planNotu}>
          {t(s.planNotu, { count: FOUNDER_STAGES[0].months ?? 0, percent: kuruculIndirimYuzdesi() })}
        </p>
      </section>

      {/* ---------- Fatura ve iptal ----------

          Ücretlendirme hiç başlamamışken bu iki kart ÇİZİLMİYOR:
          iptal edilecek üyelik ve görüntülenecek fatura yok.

          ⚠️ Üyelik varken de düğmeler DEVRE DIŞI ve bu `disabled`
          bir duruma bağlı değil — uçlar henüz yok. Aktif üyede
          etkinleştirmek, tıklanınca hiçbir şey yapmayan bir "iptal
          et" düğmesi bırakmak olurdu: kullanıcı iptal ettiğini sanar.
          Sebep altındaki notta yazılı, düğmeler gizlenmiyor. */}
      {s.uyelikVar && (
        <>
          <div className={styles.altKartlar}>
            <section className={styles.altKart}>
              <strong>{t('billing.settings.invoices')}</strong>
              <p>{t(s.faturaNotu)}</p>
              <button type="button" className={styles.ikincilDugme} disabled>
                {t('billing.durum.eylem.faturalariGor')}
              </button>
            </section>

            <section className={styles.altKart}>
              <strong>{t('billing.settings.cancelMembership')}</strong>
              <p>{t('billing.durum.iptalNotu')}</p>
              <button type="button" className={styles.iptalDugmesi} disabled>
                {t('billing.settings.cancelMembership')}
              </button>
            </section>
          </div>

          <p className={styles.not}>{t('billing.settings.actionsPending')}</p>
        </>
      )}

      {/*
        * 🔴 ÖDEME GİRİŞ NOKTASI (yönetici, test kipi).
        *
        * Ürün sahibi "üye ol senaryosunu nerden başlatacağım" dedi ve
        * haklıydı: arayüzde o düğme HİÇ YOKTU; test ödemesi tarayıcı
        * konsolundan yapılmıştı.
        *
        * `testCheckout` sunucudan geliyor ve `/checkout`taki kapının
        * AYNISINI taşıyor (test kipi + admin). Ön yüzde tahmin
        * etseydik çalışmayacak bir düğme gösterirdik.
        */}
      {membership?.testCheckout && (
        <div className={styles.testKutusu}>
          <span className={styles.testEtiket}>{t('billing.settings.testModeLabel')}</span>
          <p>{t('billing.settings.testModeNote')}</p>
          <button type="button" className={styles.ikincilDugme} onClick={() => setOdemeAcik(true)}>
            <CreditCard size={15} aria-hidden="true" /> {t('billing.settings.testCheckout')}
          </button>
        </div>
      )}

      {/*
        * 🔴 BİRİNCİL EYLEM ZATEN /fiyatlar'a GİDİYORSA BU BAĞLANTI YOK.
        *
        * Ürün sahibi bildirdi: "fiyatlandırmanın tamamını gör ve
        * fiyatlandırmayı incele aynı yere gidiyor". Doğruydu —
        * ücretlendirme başlamamışken ekranda aynı hedefe iki ayrı
        * çağrı vardı. İkisi de bir şey vaat ediyor ama farklı bir
        * yere götürmüyor; bu, kullanıcıya iki seçenek varmış gibi
        * gösterip aynı sayfayı açmak demek.
        */}
      {!odemeyeGider ? null : (
        <Link to="/fiyatlar" className={styles.metinBaglantisi}>
          {t('billing.durum.eylem.fiyatlandirmaninTamami')}
        </Link>
      )}

      <MembershipModal open={odemeAcik} onClose={() => setOdemeAcik(false)} />
    </div>
  )
}
