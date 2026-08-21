import { Link } from 'react-router-dom'
import { Bot, ClipboardList, GraduationCap, MessagesSquare, Scale, Sheet } from 'lucide-react'
import BrandMark from '@/components/ui/BrandMark'
import EkranCizimi from '@/components/about/EkranCizimi'
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

/*
 * Her modülün yanında o ekranın temsili bir çizimi duruyor
 * (`EkranCizimi`). Çizimler gerçek ekran görüntüsü DEĞİL; gerekçesi o
 * bileşenin başında yazılı.
 *
 * `maddeler` bilerek somut: "güçlü araçlar" gibi boş bir vaat yerine
 * hangi soruyu çözdüğü, ne girdiğin ve ne çıktığı yazıyor. Aşağıdaki
 * "Neyi yapmaz?" bölümüyle çelişen tek bir cümle olmamalı.
 */
const MODULLER = [
  {
    ikon: Scale,
    tur: 'karar-araclari',
    baslik: 'Karar Araçları',
    metin: 'Zam yapmalı mıyım, bu ürün gerçekten kârlı mı gibi soruları adım adım yürütür. Kendi rakamlarını girersin, sonunda gerekçesiyle birlikte bir sonuç çıkar.',
    neYaparsin: 'Bir kararı, tahmin yerine kendi rakamlarınla verirsin.',
    maddeler: [
      'Aracı seçersin: “Bu indirimi yapabilir miyim?”, “Kargo ücretsiz olabilir mi?”',
      'Maliyet, fiyat ve adet gibi kendi sayılarını girersin',
      'Sonuç, hangi sayıdan çıktığı gösterilerek verilir'
    ]
  },
  {
    ikon: ClipboardList,
    tur: 'isletme-takibi',
    baslik: 'İşletme Takibi',
    metin: 'Gelir, gider, cari hesaplar ve belgeler tek yerde. Fatura yüklediğinde içindeki tutarları okuyup kayıt önerir — sen onaylamadan hiçbir şey yazılmaz.',
    neYaparsin: 'Paranın nereden gelip nereye gittiğini tek yerde görürsün.',
    maddeler: [
      'Gelir ve gideri kaydeder, cari hesapları takip edersin',
      'Fatura yüklersin; içindeki tutarlar okunup kayıt önerilir',
      'Öneriyi onaylamadan hiçbir şey kayıtlarına yazılmaz'
    ]
  },
  {
    ikon: Bot,
    tur: 'ai-mentor',
    baslik: 'AI Mentor',
    metin: 'Takıldığın yeri sorarsın. Kurs içeriğine ve kurduysan kendi işletme rakamlarına bakarak cevap verir, dayandığı kaynağı da gösterir.',
    neYaparsin: 'Takıldığın yeri kendi cümlelerinle sorarsın.',
    maddeler: [
      'Soruyu yazarsın; yanıt, uygulamanın içerik kütüphanesine dayandırılır',
      'Dayandığı kaynak yanıtın altında gösterilir',
      'Yanıtlar hata payı taşır; rakam ve mevzuatı resmî kaynağından doğrula'
    ]
  },
  {
    ikon: Sheet,
    tur: 'hesaplamalar',
    baslik: 'Hesaplamalar',
    metin: 'Başa baş noktası, kâr marjı, nakit akışı gibi hesaplar hazır şablonlarla. Formülü ezberlemek yerine rakamı girip sonucu okursun.',
    neYaparsin: 'Formül ezberlemeden sonucu alırsın.',
    maddeler: [
      'Hazır şablonu seçersin: başa baş noktası, kâr marjı, nakit akışı',
      'Yalnız kendi sayılarını girersin',
      'Sonucun ne anlama geldiği birlikte yazılır'
    ]
  },
  {
    ikon: GraduationCap,
    tur: 'kurslar',
    baslik: 'Kurslar',
    metin: 'Kısa ve uygulamalı anlatımlar. Her bölüm bir kavramı açıklayıp onu hesaplayabileceğin araca bağlar.',
    neYaparsin: 'Bir kavramı öğrenip hemen kendi rakamlarına uygularsın.',
    maddeler: [
      'Kısa bölümler; her biri tek bir kavramı anlatır',
      'Anlatımın sonunda ilgili hesaplama aracına bağlanırsın',
      'Kaldığın yer hatırlanır'
    ]
  },
  {
    ikon: MessagesSquare,
    tur: 'topluluk',
    baslik: 'Topluluk',
    metin: 'Benzer işletmeleri yürüten insanların deneyimleri. Soru sorabilir, kendi yaşadığını paylaşabilirsin; gönderiler moderasyondan geçer.',
    neYaparsin: 'Aynı işi yürüten insanlara sorarsın.',
    maddeler: [
      'Soru sorar, kendi deneyimini paylaşırsın',
      'Gönderiler moderasyondan geçer',
      'Paylaşmak istemediğin işletme bilgilerini buraya yazma'
    ]
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

          {/* Zikzak: geniş ekranda ekran ve metin dönüşümlü yer değiştirir,
              dar ekranda tek sütuna iner (ekran önce). */}
          <div className={styles.modulListesi}>
            {MODULLER.map(({ ikon: Ikon, tur, baslik, metin, neYaparsin, maddeler }, sira) => (
              <article
                key={baslik}
                className={`${styles.modul} ${sira % 2 === 1 ? styles.modulTers : ''}`}
              >
                <div className={styles.modulEkran}>
                  <EkranCizimi tur={tur} />
                </div>

                <div className={styles.modulMetin}>
                  <span className={styles.kartIkon}><Ikon size={20} aria-hidden="true" /></span>
                  <h3>{baslik}</h3>
                  <p className={styles.neYaparsin}>{neYaparsin}</p>
                  <p>{metin}</p>
                  <ul className={styles.maddeler}>
                    {maddeler.map(madde => <li key={madde}>{madde}</li>)}
                  </ul>
                </div>
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
            <Link to="/yardim">Yardım ve iletişim</Link>
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
