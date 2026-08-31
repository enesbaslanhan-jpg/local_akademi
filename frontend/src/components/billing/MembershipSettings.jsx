import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CreditCard, FileText, Percent } from 'lucide-react'
import MembershipModal from './MembershipModal'
import {
  FOUNDER_STAGES,
  kuruculUyeFiyati,
  kuruculIndirimYuzdesi,
  fiyatYaz,
} from '@/config/billing'
import styles from './MembershipSettings.module.css'

/*
 * AYARLAR → ÜYELİK VE FATURALANDIRMA.
 *
 * İki farklı hâli var ve ikisi de aynı bileşende:
 *
 *   1. Ücretlendirme başlamadı (`BILLING_STARTS_AT === null`) — bugünkü
 *      durum. Kullanıcıya dürüstçe "henüz ücret alınmıyor" denir.
 *   2. Üyelik aktif — plan, ücret, dönem ve sonraki tahsilat gösterilir.
 *
 * İki ayrı bileşen yazmak, ücretlendirme açıldığında birinin
 * güncellenip diğerinin unutulmasına yol açardı.
 *
 * 🔴 "ÜYELİĞİ İPTAL ET" SAKLANMIYOR (ürün sahibi kararı, 27.08.2026).
 * İptali menü altına gömmek ya da destekle görüşmeye zorlamak karanlık
 * desendir; abonelik mevzuatı da iptalin en az üyelik kadar kolay
 * olmasını bekliyor.
 *
 * ⚠️ Ama bugün iptal ve fatura uçları YOK. Düğmeleri tıklanabilir
 * bırakıp hiçbir şey yaptırmamak, olmayan bir düğmeden daha kötüdür:
 * kullanıcı iptal ettiğini sanır. Bu yüzden ikisi de DEVRE DIŞI ve
 * SEBEBİNİ SÖYLEYEN bir not taşıyor. Gizlemiyoruz — gizlemek yukarıdaki
 * kararı bozardı.
 */

function Satir({ etiket, deger, ikincil }) {
  return (
    <div className={styles.satir}>
      <dt className={styles.etiket}>{etiket}</dt>
      <dd className={`${styles.deger} ${ikincil ? styles.degerIkincil : ''}`}>{deger}</dd>
    </div>
  )
}

export default function MembershipSettings({ membership }) {
  const { t, i18n } = useTranslation('common')
  const locale = i18n.resolvedLanguage || i18n.language
  const [odemeAcik, setOdemeAcik] = useState(false)

  const lansman = FOUNDER_STAGES.find(s => s.code === 'launch')
  const durum = membership?.state ?? 'billing_not_started'

  /* ---------- Ücretlendirme henüz başlamadı ---------- */
  if (durum === 'billing_not_started') {
    return (
      <div className={styles.govde}>
        {/*
          * 🔴 BU BÖLÜM BİR ÇIKMAZDI.
          *
          * Önceki hâli iki satır durum + tek bir "Fiyatları görüntüle"
          * bağlantısından ibaretti. Fiyat sayfası da girişli kullanıcıyı
          * buraya ("Üyeliğim") yolluyordu; yani kullanıcı Fiyatlar ↔
          * Ayarlar arasında dönüp duruyor ve hiçbir yeni bilgi
          * almıyordu. Ürün sahibi bunu bildirdi.
          *
          * Yeni hâli üç soruyu KAPATIYOR: bugün ne oluyor, sırada ne
          * var, ne zaman haber verilecek. Fiyat bağlantısı kaldı ama
          * artık tek eylem değil, ayrıntıya giden ikincil bir yol.
          */}
        <dl className={styles.liste}>
          <Satir etiket={t('billing.settings.membershipStatus')} deger={t('billing.settings.freeUse')} />
          <Satir
            etiket={t('billing.settings.billing')}
            deger={t('billing.settings.notStarted')}
            ikincil
          />
        </dl>

        <p className={styles.not}>
          {t('billing.settings.freeNotice', { count: FOUNDER_STAGES[0].months })}
        </p>

        {/* Sırada ne var — aşamalar ve fiyatlar config'ten okunuyor;
            elle yazılan sayı YOK, standart fiyat değişince burası da
            kendiliğinden düzeliyor. */}
        <div className={styles.planOnizleme}>
          <span className={styles.planBaslik}>{t('billing.settings.whenItStarts')}</span>
          <ol className={styles.planListe}>
            {FOUNDER_STAGES.map(asama => (
              <li key={asama.code}>
                <strong>
                  {asama.monthlyPrice === 0
                    ? t('billing.settings.freeStage')
                    : t('billing.pricePerMonth', { price: fiyatYaz(asama.monthlyPrice, locale) })}
                </strong>
                <span>{t(`billing.settings.stage.${asama.code}`, { count: asama.months ?? 0 })}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Kapanış: kullanıcı ne zaman haber alacağını biliyor ve
            bekleyecek bir şey kalmıyor. Bu taahhüt boş değil —
            `AccountNotification` altyapısı ve e-posta şablonları yazılı. */}
        <p className={styles.not}>{t('billing.settings.notifyPromise')}</p>

        <Link to="/fiyatlar" className={styles.metinBaglantisi}>
          {t('billing.settings.viewPrices')}
        </Link>
      </div>
    )
  }

  /* ---------- Üyelik aktif / deneme / süresi dolmuş ---------- */
  const aktif = durum === 'active'
  const donem = membership?.renewalPeriod === 'yearly' ? 'periodYearly' : 'periodMonthly'

  return (
    <div className={styles.govde}>
      <dl className={styles.liste}>
        <Satir etiket={t('billing.settings.plan')} deger={t('billing.founderMember')} />
        <Satir
          etiket={t('billing.settings.status')}
          deger={
            <span className={aktif ? styles.rozetAktif : styles.rozetUyari}>
              {durum === 'active' && t('billing.settings.active')}
              {durum === 'trial' && t('billing.settings.trialDaysLeft', { count: membership.trialDaysLeft })}
              {durum === 'expired' && t('billing.settings.expired')}
            </span>
          }
        />
        <Satir
          etiket={t('billing.settings.currentPrice')}
          deger={t('billing.perMonth', { price: fiyatYaz(lansman.monthlyPrice, locale) })}
        />
        <Satir
          etiket={t('billing.settings.billingPeriod')}
          deger={t(`billing.settings.${donem}`)}
          ikincil
        />
        <Satir
          etiket={t('billing.settings.pricePeriod')}
          deger={t('billing.settings.launchPeriod', { count: lansman.months })}
          ikincil
        />
        <Satir
          etiket={t('billing.settings.nextStandardPrice')}
          deger={t('billing.perMonth', { price: fiyatYaz(kuruculUyeFiyati(), locale) })}
          ikincil
        />
      </dl>

      {/* İndirim ORANSAL: "fiyatın kilitli" demiyor, çünkü değil. */}
      <p className={styles.kilit}>
        <Percent size={14} aria-hidden="true" />
        {t('billing.settings.lockedPrice', { percent: kuruculIndirimYuzdesi() })}
      </p>

      <div className={styles.eylemler}>
        <button type="button" className={styles.ikincilDugme} onClick={() => setOdemeAcik(true)}>
          <CreditCard size={15} aria-hidden="true" /> {t('billing.settings.managePayment')}
        </button>
        <button type="button" className={styles.ikincilDugme} disabled>
          <FileText size={15} aria-hidden="true" /> {t('billing.settings.invoices')}
        </button>
        {/* İptal görünür ve erişilebilir — saklanmıyor. Bugün devre
            dışı olmasının sebebi aşağıdaki notta yazılı. */}
        <button type="button" className={styles.iptalDugmesi} disabled>
          {t('billing.settings.cancelMembership')}
        </button>
      </div>

      <p className={styles.not}>{t('billing.settings.actionsPending')}</p>

      <MembershipModal open={odemeAcik} onClose={() => setOdemeAcik(false)} />
    </div>
  )
}
