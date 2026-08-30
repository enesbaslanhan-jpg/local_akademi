import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import StorageNotice from '@/components/ui/StorageNotice'
import { SATICI, saticiSatirlari, iletisimEpostasi } from '@/config/seller'
import styles from './PublicFooter.module.css'

/*
 * HERKESE AÇIK SAYFALARIN ORTAK ALT BİLGİSİ.
 *
 * Neden tek bileşen: önce dört ayrı sayfa-içi kopya vardı
 * (AboutPage, AuthPage, PasswordResetPage, SupportPage) ve her biri
 * farklı bağlantı taşıyordu. Daha kötüsü LegalPage'in hiç alt bilgisi
 * yoktu: `/terms`e düşen ziyaretçi başka hiçbir yasal sayfaya
 * gidemiyordu — tarayıcının geri düğmesinden başka çıkış yoktu.
 *
 * PayTR sanal POS başvurusu, gerekli sayfaların sitede bulunabilir
 * olmasını şart koşuyor. "Bir sayfada var, diğerinde yok" kabul
 * edilebilir değil; bu yüzden tek bileşen, her public sayfada.
 *
 * ⚠️ Palet `styles/auth-surface.css` içindeki `--auth-*`
 * değişkenlerinden geliyor. Uygulamanın genel `--text` /
 * `--surface-*` token'ları KULLANILMAZ: bu daha önce koyu modda
 * beyaz-üstüne-beyaz metne yol açtı ve iki palet o yüzden bilerek
 * ayrıldı.
 */

/* Yasal bağlantılar. Tek yer olduğu için yeni belge eklendiğinde
   dört sayfa değil bu dosya değişiyor. */
const YASAL = [
  { to: '/privacy', key: 'privacy' },
  { to: '/terms', key: 'terms' },
  { to: '/on-bilgilendirme', key: 'preInfo' },
  { to: '/mesafeli-satis', key: 'distanceSale' },
  { to: '/teslimat-iade', key: 'deliveryRefund' },
  { to: '/abonelik', key: 'subscription' },
  { to: '/cookies', key: 'cookies' },
]

const KURUMSAL = [
  { to: '/fiyatlar', key: 'pricing' },
  { to: '/hakkinda', key: 'about' },
  { to: '/yardim', key: 'help' },
]

/* Kimlik satırı etiketleri. Değerler `config/seller.js`ten geliyor;
   doldurulmamış olanlar oraya hiç girmiyor. */
const KIMLIK_ETIKETI = {
  ad: null,
  adres: 'publicFooter.identity.address',
  telefon: 'publicFooter.identity.phone',
  eposta: null,
}

/*
 * KOMPAKT BİÇİM — giriş, kayıt ve şifre sıfırlama ekranları için.
 *
 * O ekranlar tek bakışta tamamlanan işler; altlarına üç sütunlu bir
 * blok koymak ekranı hantallaştırıyor ve kullanıcıyı kaydırmaya
 * zorluyordu (ürün sahibi bildirdi).
 *
 * ⚠️ İKİNCİ BİR ALT BİLGİ UYGULAMASI DEĞİL: aynı bileşen, aynı
 * bağlantı listesi, yalnız yoğunluk farkı. Ayrı bir bileşen yazmak,
 * bu dosyanın var oluş sebebini (dört kopya alt bilgi) geri getirirdi.
 *
 * Satıcı kimlik bloğu burada YOK — kimlik `/`, `/hakkinda`, `/yardim`,
 * `/fiyatlar` ve bütün yasal sayfalarda tam hâliyle duruyor. Giriş
 * ekranında tekrarlanması gerekmiyor.
 */
function KompaktAltBilgi({ t }) {
  return (
    <footer className={styles.kompakt}>
      <nav className={styles.kompaktBaglantilar} aria-label={t('publicFooter.legalAria')}>
        {[...KURUMSAL, ...YASAL].map(b => (
          <Link key={b.to} to={b.to}>{t(`publicFooter.links.${b.key}`)}</Link>
        ))}
      </nav>
      <span className={styles.kompaktSatici}>
        {SATICI.ad} · <a href={`mailto:${iletisimEpostasi()}`}>{iletisimEpostasi()}</a>
      </span>
    </footer>
  )
}

export default function PublicFooter({ compact = false }) {
  const { t } = useTranslation('common')
  const satirlar = saticiSatirlari()

  if (compact) return <KompaktAltBilgi t={t} />

  return (
    <footer className={styles.footer}>
      <div className={styles.icerik}>
        <nav className={styles.sutun} aria-label={t('publicFooter.corporateAria')}>
          <h2 className={styles.baslik}>LocalKarar</h2>
          {KURUMSAL.map(b => (
            <Link key={b.to} to={b.to}>{t(`publicFooter.links.${b.key}`)}</Link>
          ))}
        </nav>

        <nav className={styles.sutun} aria-label={t('publicFooter.legalAria')}>
          <h2 className={styles.baslik}>{t('publicFooter.legal')}</h2>
          {YASAL.map(b => (
            <Link key={b.to} to={b.to}>{t(`publicFooter.links.${b.key}`)}</Link>
          ))}
        </nav>

        {/*
          * SATICI KİMLİĞİ.
          *
          * Mesafeli Sözleşmeler Yönetmeliği satıcının kimlik ve açık
          * adres bilgisinin tüketiciye sunulmasını zorunlu kılıyor.
          *
          * 🔴 Değerler `config/seller.js`ten. Doldurulmamış alanlar
          * HİÇ ÇİZİLMİYOR.
          *
          * Önceki sürüm eksik alanlara `TODO_URUN_SAHIBI: açık posta
          * adresi` gibi yer tutucu METİNLER basıyordu ve bunlar gerçek
          * ziyaretçiye görünüyordu — `/fiyatlar` sayfasının altında
          * yayında olduğu ölçüldü. Eksik bilgiyi göstermek yerine
          * göstermemek doğrusu; uydurmak ise hiç değil.
          */}
        <address className={styles.kimlik}>
          <h2 className={styles.baslik}>{t('publicFooter.seller')}</h2>
          {satirlar.map(({ anahtar, deger }) => {
            const etiketKey = KIMLIK_ETIKETI[anahtar]
            if (anahtar === 'eposta') {
              return <a key={anahtar} href={`mailto:${deger}`}>{deger}</a>
            }
            if (anahtar === 'telefon') {
              return (
                <a key={anahtar} href={`tel:${String(deger).replace(/\s/g, '')}`}>
                  {t(etiketKey)}: {deger}
                </a>
              )
            }
            return (
              <span key={anahtar}>
                {etiketKey ? `${t(etiketKey)}: ` : ''}{deger}
              </span>
            )
          })}
          {/* Açık adres henüz yokken coğrafi kapsam yazılıyor: bu
              ölçülmüş bir gerçek, yer tutucu değil. */}
          {!SATICI.adres && (
            <span>{t('publicFooter.identity.region')}: {SATICI.bolge}</span>
          )}
        </address>
      </div>

      <div className={styles.alt}>
        <StorageNotice inline />
      </div>
    </footer>
  )
}
