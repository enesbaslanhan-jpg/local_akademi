import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { AuthContext } from '@/context/AuthContext'
import { uyelikSunumu } from './uyelik-sunumu'
import styles from './MembershipStrip.module.css'

/*
 * ANA SAYFA ÜYELİK ŞERİDİ.
 *
 * 🔴 Ürün sahibi: "üyelik aktif diyelim tamam ama ben bunu nerde
 * göreceğim, ana sayfada beliren hiçbir şey yok" ve sonra "şu an
 * denemede mesela, o belli olsun".
 *
 * ⚠️ ROZET BU İŞİ YAPMIYOR ve sebebi ölçüldü: `FounderBadge`
 * `membership.founder` false ise HİÇ çizilmiyor, `founder` da
 * `BILLING_STARTS_AT` null olduğu sürece herkeste false. Yani bugün
 * rozet kimsede görünmüyor. "Ana sayfada üyelik görünsün" isteğini
 * rozetle karşıladığımı söylemiştim; yanlıştı.
 *
 * 🔴 BU ŞERİT HER DURUMDA ÇİZİLİYOR — `billing_not_started` dahil.
 * "Ücretsiz kullanımda sessiz kalsın" demek, bugünkü tek gerçek
 * durumda yine hiçbir şey göstermemek olurdu; aynı hatayı iki kez
 * yapmamak için sessiz hâl yok, sakin hâl var.
 *
 * Metinler `uyelik-sunumu.js`ten; Ayarlar → Üyelik kartı da aynı
 * dosyadan okuyor ki iki ekran aynı şeyi söylesin.
 */

/* `useAuth()` bilerek kullanılmıyor: sağlayıcı yoksa fırlatıyor ve bu
   şerit dekoratif değilse de hayati değil. `FounderBadge` bu dersi bir
   kez verdi — `useAuth` kullanan sürümü sağlayıcısız render eden 6
   testi düşürmüştü. */
export default function MembershipStrip({ className = '' }) {
  const { t, i18n } = useTranslation('common')
  const auth = useContext(AuthContext)
  const membership = auth?.user?.membership

  /* Oturum yoksa (ya da /me henüz dönmediyse) hiç çizilmez —
     yer tutan boş bir şerit, sayfanın yüklendikçe zıplamasına
     yol açar. */
  if (!membership) return null

  const s = uyelikSunumu(membership, { locale: i18n.resolvedLanguage || i18n.language })

  return (
    <section
      className={`${styles.serit} ${styles[`ton_${s.ton}`]} ${className}`}
      aria-label={t('billing.serit.bolumAdi')}
    >
      <span className={styles.nokta} aria-hidden="true" />
      <div className={styles.metin}>
        <strong className={styles.baslik}>{t(s.baslik.anahtar, s.baslik.degerler)}</strong>
        <span className={styles.alt}>{t(s.alt.anahtar, s.alt.degerler)}</span>
      </div>
      {/* Tek eylem ve her durumda AYNI hedef: üyelik ekranı. Ürün
          sahibinin şikâyeti "taa ayarlara gideceğim sonra üyeliğe
          gireceğim" idi; şerit o üç adımı bire indiriyor. */}
      <Link to="/app/settings?bolum=uyelik" className={styles.baglanti}>
        {t('billing.serit.yonet')} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  )
}
