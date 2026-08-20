import { Link } from 'react-router-dom'
import { Bot, ClipboardList, GraduationCap, MessagesSquare, Scale, Sheet } from 'lucide-react'
import BrandMark from '@/components/ui/BrandMark'
import AuthThemeToggle from './AuthThemeToggle'
import styles from './AboutPage.module.css'

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

const MODULLER = [
  {
    ikon: Scale,
    baslik: 'Karar Araçları',
    metin: 'Zam yapmalı mıyım, bu ürün gerçekten kârlı mı gibi soruları adım adım yürütür. Kendi rakamlarını girersin, sonunda gerekçesiyle birlikte bir sonuç çıkar.'
  },
  {
    ikon: ClipboardList,
    baslik: 'İşletme Takibi',
    metin: 'Gelir, gider, cari hesaplar ve belgeler tek yerde. Fatura yüklediğinde içindeki tutarları okuyup kayıt önerir — sen onaylamadan hiçbir şey yazılmaz.'
  },
  {
    ikon: Bot,
    baslik: 'AI Mentor',
    metin: 'Takıldığın yeri sorarsın. Kurs içeriğine ve kurduysan kendi işletme rakamlarına bakarak cevap verir, dayandığı kaynağı da gösterir.'
  },
  {
    ikon: Sheet,
    baslik: 'Hesaplamalar',
    metin: 'Başa baş noktası, kâr marjı, nakit akışı gibi hesaplar hazır şablonlarla. Formülü ezberlemek yerine rakamı girip sonucu okursun.'
  },
  {
    ikon: GraduationCap,
    baslik: 'Kurslar',
    metin: 'Kısa ve uygulamalı anlatımlar. Her bölüm bir kavramı açıklayıp onu hesaplayabileceğin araca bağlar.'
  },
  {
    ikon: MessagesSquare,
    baslik: 'Topluluk',
    metin: 'Benzer işletmeleri yürüten insanların deneyimleri. Soru sorabilir, kendi yaşadığını paylaşabilirsin; gönderiler moderasyondan geçer.'
  }
]

export default function AboutPage() {
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
              <Link to="/login" className={styles.girisLink}>Giriş yap</Link>
              <Link to="/register" className={styles.kayitDugmesi}>Hesap oluştur</Link>
            </nav>
          </header>

          <section className={styles.kahraman}>
            <h1>İşletmen için doğru kararlar</h1>
            <p className={styles.kahramanMetin}>
              LocalKarar, küçük ve orta ölçekli işletmeler için bir karar
              destek uygulaması. Tahmine değil, kendi rakamlarına dayanan
              kararlar vermene yardım eder.
            </p>
            <div className={styles.kahramanEylemler}>
              <Link to="/register" className={styles.birincilDugme}>Ücretsiz hesap oluştur</Link>
              <Link to="/login" className={styles.ikincilDugme}>Zaten hesabım var</Link>
            </div>
          </section>
        </div>
      </div>

      <div className={styles.icerik}>
        <section className={styles.kimeSection}>
          <h2>Kime göre?</h2>
          <p>
            Mağazası, atölyesi, e-ticaret sitesi ya da hizmet işletmesi olan;
            rakamlarını takip etmek isteyen ama muhasebe eğitimi almamış
            işletme sahipleri için tasarlandı. Tek kişilik işletmelerden
            küçük ekiplere kadar çalışır.
          </p>
        </section>

        <section aria-labelledby="moduller-baslik">
          <h2 id="moduller-baslik" className={styles.bolumBaslik}>Neler var?</h2>
          <div className={styles.izgara}>
            {MODULLER.map(({ ikon: Ikon, baslik, metin }) => (
              <article key={baslik} className={styles.kart}>
                <span className={styles.kartIkon}><Ikon size={20} aria-hidden="true" /></span>
                <h3>{baslik}</h3>
                <p>{metin}</p>
              </article>
            ))}
          </div>
        </section>

        {/*
          * Sınırları AÇIKÇA yazmak, sonradan hayal kırıklığı yaratmaktan
          * iyidir. Kullanım Koşulları'nda da aynı şey yazıyor; burada
          * gizlenmesi tutarsız olurdu.
          */}
        <section className={styles.sinirlar}>
          <h2>Neyi yapmaz?</h2>
          <p>
            LocalKarar bir muhasebe programı değildir ve profesyonel hukuk,
            vergi, muhasebe veya yatırım danışmanlığının yerine geçmez.
            Ürettiği sonuçlar senin girdiğin verilere dayanır ve karar
            senindir.
          </p>
        </section>

        <section className={styles.kapanis}>
          <h2>Başlamak için hesap yeterli</h2>
          <p>Kurulum gerekmez. Hesap açtıktan sonra birkaç soruyla işletmeni tanıtırsın.</p>
          <Link to="/register" className={styles.birincilDugme}>Hesap oluştur</Link>
        </section>

        <footer className={styles.alt}>
          <div className={styles.altBaglantilar}>
            <Link to="/privacy">Gizlilik ve KVKK</Link>
            <Link to="/terms">Kullanım koşulları</Link>
            <Link to="/cookies">Çerezler</Link>
          </div>
          <p className={styles.altNot}>
            Sorular ve KVKK başvuruları için Gizlilik metnindeki iletişim
            kanalını kullanabilirsin.
          </p>
        </footer>
      </div>
    </div>
  )
}
