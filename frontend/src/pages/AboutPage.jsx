import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bot, ClipboardList, GraduationCap, MessagesSquare, Scale, Sheet } from 'lucide-react'
import BrandMark from '@/components/ui/BrandMark'
import EkranCizimi from '@/components/about/EkranCizimi'
import AuthThemeToggle from './AuthThemeToggle'
import styles from './AboutPage.module.css'
import PublicFooter from '@/components/layout/PublicFooter'

/*
 * Hakkında / tanıtım sayfası.
 *
 * Giriş yapmamış ziyaretçinin gördüğü ilk sayfa. Önceden `/` doğrudan
 * giriş ekranına düşürüyordu; ürünün ne olduğunu anlatan hiçbir sayfa
 * yoktu.
 *
 * Görsel dil giriş ekranıyla ORTAK: aynı çapraz degrade, aynı cam kart,
 * aynı palet (`styles/auth-surface.css`). İkinci bir görsel dil
 * çıkarmamak bilinçli — ziyaretçi giriş ekranına geçtiğinde aynı ürünte
 * kaldığını hissetmeli.
 *
 * Metinler ÖLÇÜLÜ yazıldı: ürünün gerçekten yaptığı şeyler anlatılıyor,
 * vaat edilmeyen bir şey yazılmıyor. Karar araçları bir danışman değil;
 * bu sayfada da öyle sunulmuyor.
 */

/*
 * Her modülün yanında o ekranın temsili bir çizimi duruyor
 * (`EkranCizimi`). Çizimler gerçek ekran görüntüsü DEĞİL; gerekçesi o
 * bileşenin başında yazılı.
 *
 * `maddeler` bilerek somut: "güçlü araçlar" gibi boş bir vaat yerine
 * hangi soruyu çözdüğü, ne girdiğin ve ne çıktığı yazıyor. Aşağıdaki
 * "Neyi yapmaz?" bölümüyle çelişen tek bir cümle olmamalı.
 */
/*
 * Dışa açık: /yardim'daki kullanma kılavuzu da aynı anlatımlardan
 * besleniyor. İkinci bir modül tanımı yazılsaydı iki sayfa kaçınılmaz
 * olarak ayrışırdı.
 */
export const MODULLER = [
  {
    ikon: Scale,
    tur: 'karar-araclari',
    key: 'decisionTools'
  },
  {
    ikon: ClipboardList,
    tur: 'isletme-takibi',
    key: 'businessTracking'
  },
  {
    ikon: Bot,
    tur: 'ai-mentor',
    key: 'mentor'
  },
  {
    ikon: Sheet,
    tur: 'hesaplamalar',
    key: 'calculations'
  },
  {
    ikon: GraduationCap,
    tur: 'kurslar',
    key: 'courses'
  },
  {
    ikon: MessagesSquare,
    tur: 'topluluk',
    key: 'community'
  }
]

export default function AboutPage() {
  const { t } = useTranslation('common')
  return (
    <div className={styles.page}>
      <AuthThemeToggle />

      {/* Degradenin yaşadığı tek bant. Aşağısı düz zemin — sebebi
          AboutPage.module.css başındaki nota yazılı. */}
      <div className={styles.ustAlan}>
        <div className={styles.glowCool} aria-hidden="true" />
        <div className={styles.glowLight} aria-hidden="true" />

        <div className={styles.ustIcerik}>
          <header className={styles.ust}>
            <div className={styles.brandRow}>
              <BrandMark size={44} animated interactive />
              <span className={styles.brandText}>
                <strong>LocalKarar</strong>
                <small lang="en">Professional Community</small>
              </span>
            </div>
            <nav className={styles.ustEylemler}>
              {/* Ana sayfa aynı zamanda `/` — ziyaretçinin ilk gördüğü
                  yer. Fiyat bağlantısı buradan yoksa fiyat sayfası
                  pratikte bulunamıyor (ölçüldü: hiçbir public sayfadan
                  linki yoktu). */}
              <Link to="/fiyatlar" className={styles.girisLink}>{t('publicFooter.links.pricing')}</Link>
              <Link to="/login" className={styles.girisLink}>{t('about.signIn')}</Link>
              <Link to="/register" className={styles.kayitDugmesi}>{t('about.createAccount')}</Link>
            </nav>
          </header>

          <section className={styles.kahraman}>
            <h1>{t('about.heroTitle')}</h1>
            <div className={styles.kahramanDetay}>
              <p className={styles.kahramanMetin}>
                {t('about.heroText')}
              </p>
              <div className={styles.kahramanEylemler}>
                <Link to="/register" className={styles.birincilDugme}>{t('about.freeAccount')}</Link>
                <Link to="/login" className={styles.ikincilDugme}>{t('about.haveAccount')}</Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className={styles.icerik}>
        <section className={styles.kimeSection}>
          <h2>{t('about.audienceTitle')}</h2>
          <p>{t('about.audienceText')}</p>
        </section>

        <section aria-labelledby="moduller-baslik">
          <h2 id="moduller-baslik" className={styles.bolumBaslik}>{t('about.modulesTitle')}</h2>

          {/* Zikzak: geniş ekranda ekran ve metin dönüşümlü yer değiştirir,
              dar ekranda tek sütuna iner (ekran önce). */}
          <div className={styles.modulListesi}>
            {MODULLER.map(({ ikon: Ikon, tur, key }, sira) => {
              const base = `about.modules.${key}`
              const maddeler = Object.values(t(`${base}.bullets`, { returnObjects: true }))
              return (
              <article
                key={key}
                className={`${styles.modul} ${sira % 2 === 1 ? styles.modulTers : ''}`}
              >
                <div className={styles.modulEkran}>
                  <EkranCizimi tur={tur} />
                </div>

                <div className={styles.modulMetin}>
                  <span className={styles.kartIkon}><Ikon size={20} aria-hidden="true" /></span>
                  <h3>{t(`${base}.title`)}</h3>
                  <p className={styles.neYaparsin}>{t(`${base}.outcome`)}</p>
                  <p>{t(`${base}.description`)}</p>
                  <ul className={styles.maddeler}>
                    {maddeler.map(madde => <li key={madde}>{madde}</li>)}
                  </ul>
                </div>
              </article>
              )
            })}
          </div>
        </section>

        {/*
          * Sınırları AÇIKÇA yazmak, sonradan hayal kırıklığı yaratmaktan
          * iyidir. Kullanım Koşulları'nda da aynı şey yazıyor; burada
          * gizlenmesi tutarsız olurdu.
          */}
        <section className={styles.sinirlar}>
          <h2>{t('about.limitsTitle')}</h2>
          <p>{t('about.limitsText')}</p>
        </section>

        <section className={styles.kapanis}>
          <h2>{t('about.closingTitle')}</h2>
          <p>{t('about.closingText')}</p>
          <Link to="/register" className={styles.birincilDugme}>{t('about.createAccount')}</Link>
        </section>

        {/* Kopya bağlantı listesi kaldırıldı — ortak `PublicFooter`
            aşağıda ve yasal sayfaların tamamını taşıyor. Sayfaya özgü
            not burada kalıyor. */}
        <p className={styles.altNot}>
          {t('about.footer.note')}
        </p>
      </div>

      <PublicFooter />
    </div>
  )
}
