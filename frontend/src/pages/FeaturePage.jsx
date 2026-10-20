import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import BrandMark from '@/components/ui/BrandMark'
import PublicFooter from '@/components/layout/PublicFooter'
import AuthThemeToggle from './AuthThemeToggle'
import useSayfaMeta from '@/hooks/useSayfaMeta'
import { SAYFA_META } from '@/config/sayfa-meta'
import { KARAR_REHBERLERI, KARAR_REHBERI_ONEK } from '@/content/karar-rehberleri'
import { SEO_CALCULATORS, SEO_CALCULATOR_PATHS } from '@/content/seo-calculators'
import styles from './FeaturePage.module.css'

const OZELLIKLER = {
  'isletme-takibi': {
    eyebrow: 'İşletme takibi',
    title: 'Gelir, gider, cari hesap ve vadeleri tek yerde takip et',
    description: 'LocalKarar İşletme Takibi; tahsilatları, ödemeleri, cari hesapları, siparişleri ve belgeleri dağınık tablolardan çıkarıp tek çalışma alanında toplar.',
    problem: 'İşletme takibi, yalnızca gelir ve gider toplamını görmek değildir. Yaklaşan vadeyi, geciken ödemeyi, müşteriden alınacağı ve kasaya etkisini aynı bağlamda izleyebilmektir.',
    outcomes: [
      ['Vadeleri kaçırma', 'Ödeme ve tahsilat kayıtlarını tarihleriyle gör; yaklaşan ve geciken işleri ayır.'],
      ['Cari hesabı netleştir', 'Müşteri ve tedarikçi bazında borç–alacak hareketlerini tek kartta izle.'],
      ['Belgeden kayıt önerisi al', 'Fatura veya makbuz yüklediğinde sistem bilgileri okur; sen onaylamadan kayıt kesinleşmez.'],
      ['Siparişleri bir araya getir', 'Bağlı pazaryerlerinden gelen sipariş ve ürün hareketlerini işletme görünümünde takip et.'],
    ],
    steps: ['İşletmeni ve temel bilgilerini oluştur.', 'Tahsilat, ödeme, sipariş veya belge kaydı ekle.', 'Takvim, cari hesap ve 30 günlük nakit görünümünden durumu izle.'],
    faqs: [
      ['LocalKarar muhasebe programı mı?', 'Hayır. İşletme içi takip ve karar desteği sağlar; resmî muhasebe kayıtlarının ve mali müşavir hizmetinin yerine geçmez.'],
      ['Faturayı yüklediğimde otomatik kayıt oluşur mu?', 'Belgedeki bilgiler okunur ve bir kayıt önerisi hazırlanır. Sen inceleyip onaylamadan işletme kayıtlarına yazılmaz.'],
      ['Birden fazla işletme takip edilebilir mi?', 'Her işletme ayrı çalışma alanında tutulur. Böylece kayıtlar, üyeler ve raporlar birbirine karışmaz.'],
    ],
    related: [['Pazaryeri entegrasyonları', '/pazaryeri-entegrasyonlari'], ['Hesaplamalar', '/hesaplamalar']],
  },
  'karar-araclari': {
    eyebrow: 'Karar araçları',
    title: 'İşletme kararlarını tahminle değil, kendi rakamlarınla ver',
    description: 'İndirim, ücretsiz kargo, reklam bütçesi, personel, nakit akışı ve pazaryeri komisyonu gibi kararları adım adım hesapla; sonucu gerekçesiyle gör.',
    problem: 'Bir karar aracı “evet” ya da “hayır” demekle yetinmemeli. Hangi verinin sonucu değiştirdiğini, başabaş noktasını ve dikkat edilmesi gereken riski de görünür kılmalıdır.',
    outcomes: [
      ['İndirimi test et', 'İndirim sonrası birim katkıyı ve aynı kârı korumak için gereken satış artışını hesapla.'],
      ['Kargoyu değerlendir', 'Ücretsiz kargonun sepet katkısı ile maliyetini aynı senaryoda karşılaştır.'],
      ['Reklam bütçesini sorgula', 'ROAS, dönüşüm ve sipariş katkısına göre ek bütçenin olası etkisini gör.'],
      ['Karar fişi oluştur', 'Girdi, hesap, sonuç, risk notu ve sonraki adımı tek bir özet olarak sakla.'],
    ],
    steps: ['Yanıtlamak istediğin işletme sorusunu seç.', 'İstenen maliyet, fiyat, adet veya vade bilgilerini gir.', 'Sonucu, kanıt hesabını ve güvenli sonraki adımları birlikte incele.'],
    faqs: [
      ['Karar araçları kesin sonuç verir mi?', 'Sonuçlar girdiğin verilere ve aracın açık formülüne dayanır. Geleceği garanti etmez; belirsizlik ve risk notları kararın parçasıdır.'],
      ['Hangi kararlar değerlendirilebilir?', 'Ürün kârlılığı, indirim, ücretsiz kargo, pazaryeri komisyonu, reklam bütçesi, personel, nakit akışı ve benzeri işletme kararları için araçlar bulunur.'],
      ['Sonucu daha sonra görebilir miyim?', 'Tamamlanan değerlendirmeler karar fişi olarak saklanır; girdileri, sonucu ve önerilen sonraki adımları yeniden açabilirsin.'],
    ],
    related: [['Ücretsiz komisyon hesaplayıcı', '/araclar/pazaryeri-komisyon-hesaplayici'], ['AI Mentor', '/ai-mentor']],
  },
  hesaplamalar: {
    eyebrow: 'Hesaplamalar',
    title: 'Kâr, başabaş ve nakit hesabını formül ezberlemeden yap',
    description: 'Küçük işletmeler için hazır hesaplama şablonlarıyla birim maliyet, kâr marjı, başabaş satış adedi, nakit akışı ve kampanya etkisini anlaşılır biçimde hesapla.',
    problem: 'Hesaplamanın değeri yalnızca doğru formülde değil, sonucun işletme açısından ne anlama geldiğini açıklamasındadır. LocalKarar girdileri, formülü ve yorumu aynı akışta gösterir.',
    outcomes: [
      ['Gerçek birim maliyeti bul', 'Ürüne ait doğrudan ve paylaştırılmış maliyetleri aynı hesapta birleştir.'],
      ['Başabaş noktasını gör', 'Sabit giderleri karşılamak için gereken satış adedi veya ciroyu hesapla.'],
      ['Marjı doğru oku', 'Kâr tutarı ile kâr marjını birbirinden ayır; fiyat değişikliğinin etkisini gör.'],
      ['Senaryoları karşılaştır', 'Fiyat, maliyet veya adet değiştiğinde sonucun nasıl oynadığını aynı şablonda test et.'],
    ],
    steps: ['İhtiyacına uygun hesaplama şablonunu seç.', 'İşletmene ait sayıları açıklamalı alanlara gir.', 'Sonucu, formülü ve karar açısından anlamını birlikte incele.'],
    faqs: [
      ['Hesaplamaları kullanmak için finans bilgisi gerekir mi?', 'Hayır. Alanlar ne girmen gerektiğini açıklar; sonuçla birlikte formül ve kısa yorum da gösterilir.'],
      ['Hangi hesaplamalar var?', 'Kâr marjı, başabaş, birim maliyet, nakit akışı, kampanya/indirim, kredi ve pazaryeri kârlılığı gibi işletme hesapları bulunur.'],
      ['Hesap sonucu muhasebe kaydı sayılır mı?', 'Hayır. Sonuç karar desteği içindir; vergi ve resmî muhasebe işlemlerini mali müşavirinle doğrulamalısın.'],
    ],
    related: [['Karar Araçları', '/karar-araclari'], ['İşletme Takibi', '/isletme-takibi']],
  },
  'ai-mentor': {
    eyebrow: 'AI Mentor',
    title: 'İşletme sorunu bağlamıyla anlat, kaynağı görünen yanıt al',
    description: 'LocalKarar AI Mentor; sorunu kendi cümlelerinle anlatmana, ilgili eğitim içeriğini ve izin verdiğin işletme bağlamını kullanarak konuyu anlamlandırmana yardım eder.',
    problem: 'Genel bir yapay zekâ, işletmenin hangi verisine baktığını bilmez. LocalKarar’ın yaklaşımı; yanıtı ürün içindeki öğrenme içeriği ve kullanıcının izin verdiği bağlamla ilişkilendirmek, dayanağı görünür tutmaktır.',
    outcomes: [
      ['Sorunu doğal dille anlat', 'Formül veya menü adı bilmeden “Bu ürün neden kârlı görünmüyor?” gibi sorular sor.'],
      ['Bağlamı birlikte değerlendir', 'İzin verdiğinde işletme kayıtları ve önceki kararlar konuşmanın bağlamına eklenir.'],
      ['Kaynağı kontrol et', 'Yanıtın dayandığı LocalKarar içeriğini gör; kritik bilgiyi resmî kaynağından doğrula.'],
      ['Sonraki adımı belirle', 'Yanıtı ilgili hesaplama, karar aracı veya öğrenme içeriğine bağla.'],
    ],
    steps: ['Yeni bir sohbet açıp işletme sorunu yaz.', 'Mentorun kullandığı bağlamı ve kaynakları incele.', 'Önerilen hesaplama veya karar aracında kendi verinle doğrula.'],
    faqs: [
      ['AI Mentor mali müşavir veya avukat yerine geçer mi?', 'Hayır. Eğitim ve karar desteği sağlar; hukuk, vergi, muhasebe veya yatırım danışmanlığı sunmaz.'],
      ['Yanıtlar her zaman doğru mu?', 'Hayır. Dil modelleri hata yapabilir. LocalKarar kaynak göstermeye ve belirsizliği belirtmeye çalışır; rakam, oran, süre ve mevzuatı resmî kaynağından doğrulamalısın.'],
      ['İşletme verilerimi kullanmak zorunda mıyım?', 'Hayır. Bağlam kullanımı kullanıcı kontrolündedir; genel bir soruyu işletme kaydı paylaşmadan da sorabilirsin.'],
    ],
    related: [['Hesaplamalar', '/hesaplamalar'], ['Karar Araçları', '/karar-araclari']],
  },
  'pazaryeri-entegrasyonlari': {
    eyebrow: 'Pazaryeri entegrasyonları',
    title: 'Pazaryeri siparişlerini ve ürünlerini tek işletme görünümünde topla',
    description: 'Trendyol, Hepsiburada, N11 ve Shopify mağazalarını LocalKarar’a bağlayarak sipariş ve ürün verilerini işletme takibiyle aynı yerde görüntüle.',
    problem: 'Farklı satıcı panelleri satışın yalnızca bir bölümünü gösterir. İşletme kararı için sipariş, komisyon, ürün maliyeti, kargo, iade ve nakit hareketinin aynı resimde okunması gerekir.',
    outcomes: [
      ['Siparişleri merkezileştir', 'Bağlı kanallardan gelen siparişleri tek listede görüntüle.'],
      ['Ürünleri eşleştir', 'Kanal ürünlerini işletmedeki ürün kayıtlarıyla ilişkilendir.'],
      ['Eşitlemeyi kontrol et', 'Son eşitleme zamanını ve bağlantı durumunu sağlayıcı bazında gör.'],
      ['Kârlılığa bağla', 'Sipariş verisini komisyon ve maliyet hesaplarıyla birlikte değerlendir.'],
    ],
    steps: ['Ayarlar içinden kullanacağın pazaryerini seç.', 'Satıcı panelindeki bağlantı bilgilerini güvenli formda gir.', 'Eşitleme tamamlandığında sipariş ve ürünleri işletme alanında izle.'],
    faqs: [
      ['Hangi pazaryerleri destekleniyor?', 'LocalKarar’da Trendyol, Hepsiburada, N11 ve Shopify için bağlantı akışları bulunur. Kullanılabilirlik sağlayıcının API koşullarına ve hesabının yetkilerine bağlıdır.'],
      ['Mağaza şifremi LocalKarar’a vermem gerekir mi?', 'Hayır. Bağlantı, pazaryerinin sağladığı mağaza/API bilgileriyle kurulur; kişisel panel şifren paylaşılmaz.'],
      ['Veriler ne sıklıkla eşitlenir?', 'Bağlantı kartında son eşitleme zamanı gösterilir ve gerektiğinde elle eşitleme başlatılabilir. Sağlayıcı kısıtları eşitleme süresini etkileyebilir.'],
    ],
    related: [['İşletme Takibi', '/isletme-takibi'], ['Komisyon hesaplayıcı', '/araclar/pazaryeri-komisyon-hesaplayici']],
  },
}

function schemaFor(slug, content) {
  const url = `https://localkarar.com/${slug}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: content.metaTitle,
        description: content.metaDescription,
        inLanguage: 'tr-TR',
        isPartOf: { '@id': 'https://localkarar.com/#website' },
        about: { '@id': 'https://localkarar.com/#software' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'LocalKarar', item: 'https://localkarar.com/' },
          { '@type': 'ListItem', position: 2, name: content.eyebrow, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: content.faqs.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  }
}

export default function FeaturePage({ slug }) {
  /* Başlık ve açıklama sunucunun ham HTML'e yazdığıyla AYNI tablodan gelir
     (config/sayfa-meta.js); sayfada ikinci bir kopya tutulmuyor. */
  const meta = SAYFA_META[`/${slug}`]
  const content = { ...OZELLIKLER[slug], metaTitle: meta.baslik, metaDescription: meta.aciklama }
  const schema = schemaFor(slug, content)

  useSayfaMeta({
    baslik: content.metaTitle,
    aciklama: content.metaDescription,
    yol: `/${slug}`,
    schema,
  })

  return (
    <div className={styles.page}>
      <AuthThemeToggle />
      <header className={styles.header}>
        <Link to="/" className={styles.brand}><BrandMark size={36} /><strong>LocalKarar</strong></Link>
        <nav className={styles.nav} aria-label="Ana gezinme">
          <Link to="/fiyatlar">Fiyatlar</Link>
          <Link to="/login">Giriş yap</Link>
          <Link to="/register" className={styles.navCta}>Ücretsiz hesap oluştur</Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>{content.eyebrow}</span>
            <h1>{content.title}</h1>
            <p>{content.description}</p>
            <div className={styles.actions}>
              <Link to="/register" className={styles.primary}>Ücretsiz başla <ArrowRight size={17} /></Link>
              <Link to="/" className={styles.secondary}>LocalKarar’ı tanı</Link>
            </div>
          </div>
        </section>

        <div className={styles.content}>
          <section className={styles.definition} aria-labelledby="neden-baslik">
            <span className={styles.sectionLabel}>Neden önemli?</span>
            <h2 id="neden-baslik">{content.eyebrow} ne sağlar?</h2>
            <p>{content.problem}</p>
          </section>

          <section aria-labelledby="yapabileceklerin-baslik">
            <span className={styles.sectionLabel}>Neler yapabilirsin?</span>
            <h2 id="yapabileceklerin-baslik">Dağınık bilgiyi kullanılabilir sonuca dönüştür</h2>
            <div className={styles.grid}>
              {content.outcomes.map(([title, text], index) => (
                <article key={title} className={styles.card}>
                  <span className={styles.cardNo}>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.steps} aria-labelledby="nasil-baslik">
            <span className={styles.sectionLabel}>Nasıl çalışır?</span>
            <h2 id="nasil-baslik">Üç adımda kendi işletme bağlamına geç</h2>
            <ol>
              {content.steps.map((step, index) => (
                <li key={step}><span>{index + 1}</span><p>{step}</p></li>
              ))}
            </ol>
          </section>

          <section className={styles.faq} aria-labelledby="sss-baslik">
            <span className={styles.sectionLabel}>Sık sorulanlar</span>
            <h2 id="sss-baslik">{content.eyebrow} hakkında</h2>
            {content.faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </section>

          {slug === 'karar-araclari' && (
            <section aria-labelledby="rehber-baslik">
              <span className={styles.sectionLabel}>Rehberler</span>
              <h2 id="rehber-baslik">Karar sorularına çözümlü örneklerle bak</h2>
              <div className={styles.grid}>
                {Object.entries(KARAR_REHBERLERI).map(([rehberSlug, r], index) => (
                  <Link key={rehberSlug} to={`${KARAR_REHBERI_ONEK}${rehberSlug}`} className={styles.card}>
                    <span className={styles.cardNo}>{String(index + 1).padStart(2, '0')}</span>
                    <h3>{r.baslik}</h3>
                    <p>{r.etiket}: formül, çözümlü örnek ve sık hatalar.</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {slug === 'hesaplamalar' && (
            <section aria-labelledby="seo-hesaplamalar-baslik">
              <span className={styles.sectionLabel}>Ücretsiz araçlar</span>
              <h2 id="seo-hesaplamalar-baslik">İşletme hesaplarını kendi rakamlarınla yap</h2>
              <div className={styles.grid}>
                {SEO_CALCULATOR_PATHS.map((path, index) => {
                  const calculator = SEO_CALCULATORS[path.split('/').at(-1)]
                  return <Link key={path} to={path} className={styles.card}><span className={styles.cardNo}>{String(index + 1).padStart(2, '0')}</span><h3>{calculator.h1}</h3><p>{calculator.intro}</p></Link>
                })}
                <Link to="/araclar/pazaryeri-komisyon-hesaplayici" className={styles.card}><span className={styles.cardNo}>07</span><h3>Pazaryeri komisyon hesaplayıcı</h3><p>Komisyon, ürün maliyeti, kargo ve iade sonrası tahmini sipariş katkını gör.</p></Link>
                <Link to="/karar-araclari" className={styles.card}><span className={styles.cardNo}>08</span><h3>Karar araçları</h3><p>İndirim, ücretsiz kargo ve reklam kararlarını çözümlü örneklerle incele.</p></Link>
              </div>
            </section>
          )}

          <aside className={styles.related} aria-labelledby="ilgili-baslik">
            <div>
              <CheckCircle2 size={22} />
              <h2 id="ilgili-baslik">İlgili özellikler</h2>
            </div>
            <nav>
              {content.related.map(([label, to]) => <Link key={to} to={to}>{label} <ArrowRight size={15} /></Link>)}
            </nav>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
