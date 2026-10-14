import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import BrandMark from '@/components/ui/BrandMark'
import PublicFooter from '@/components/layout/PublicFooter'
import AuthThemeToggle from './AuthThemeToggle'
import useSayfaMeta from '@/hooks/useSayfaMeta'
import { SAYFA_META } from '@/config/sayfa-meta'
import { KARAR_REHBERLERI, KARAR_REHBERI_ONEK } from '@/content/karar-rehberleri'
import styles from './FeaturePage.module.css'
import rehber from './KararRehberPage.module.css'

function schemaFor(yol, r, meta) {
  const url = `https://localkarar.com${yol}`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: meta.baslik,
        description: meta.aciklama,
        inLanguage: 'tr-TR',
        isPartOf: { '@id': 'https://localkarar.com/#website' },
        about: { '@id': 'https://localkarar.com/#software' },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'LocalKarar', item: 'https://localkarar.com/' },
          { '@type': 'ListItem', position: 2, name: 'Karar araçları', item: 'https://localkarar.com/karar-araclari' },
          { '@type': 'ListItem', position: 3, name: r.baslik, item: url },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: r.sss.map(([question, answer]) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  }
}

export default function KararRehberPage() {
  const { slug } = useParams()
  const r = Object.prototype.hasOwnProperty.call(KARAR_REHBERLERI, slug) ? KARAR_REHBERLERI[slug] : null
  const yol = `${KARAR_REHBERI_ONEK}${slug}`
  const meta = r ? SAYFA_META[yol] : null

  useSayfaMeta({
    baslik: meta?.baslik,
    aciklama: meta?.aciklama,
    yol,
    schema: r && meta ? schemaFor(yol, r, meta) : undefined,
  })

  if (!r || !meta) return <Navigate to="/karar-araclari" replace />

  return (
    <div className={styles.page}>
      <AuthThemeToggle />
      <header className={styles.header}>
        <Link to="/" className={styles.brand}><BrandMark size={36} /><strong>LocalKarar</strong></Link>
        <nav className={styles.nav} aria-label="Ana gezinme">
          <Link to="/karar-araclari">Karar araçları</Link>
          <Link to="/login">Giriş yap</Link>
          <Link to="/register" className={styles.navCta}>Ücretsiz hesap oluştur</Link>
        </nav>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.eyebrow}>{r.etiket}</span>
            <h1>{r.baslik}</h1>
            <p>{r.giris}</p>
            <div className={styles.actions}>
              <Link to="/register" className={styles.primary}>Kendi rakamlarınla hesapla <ArrowRight size={17} /></Link>
              <Link to="/karar-araclari" className={styles.secondary}>Tüm karar araçları</Link>
            </div>
          </div>
        </section>

        <div className={styles.content}>
          <section className={styles.definition} aria-labelledby="formul-baslik">
            <span className={styles.sectionLabel}>Formül</span>
            <h2 id="formul-baslik">Nasıl hesaplanır?</h2>
            <ul className={rehber.formuller}>
              {r.formuller.map(f => <li key={f}><code>{f}</code></li>)}
            </ul>
            {r.not && <p className={rehber.not}>{r.not}</p>}
          </section>

          <section aria-labelledby="ornek-baslik">
            <span className={styles.sectionLabel}>Çözümlü örnek</span>
            <h2 id="ornek-baslik">Rakamlarla örnek</h2>
            <dl className={rehber.girdiler}>
              {r.ornek.girdiler.map(([ad, deger]) => (
                <div key={ad}><dt>{ad}</dt><dd>{deger}</dd></div>
              ))}
            </dl>
            <ol className={rehber.adimlar}>
              {r.ornek.adimlar.map(adim => <li key={adim}>{adim}</li>)}
            </ol>
            <p className={rehber.sonuc}>{r.ornek.sonuc}</p>
          </section>

          <section className={styles.definition} aria-labelledby="okuma-baslik">
            <span className={styles.sectionLabel}>Sonucu okuma</span>
            <h2 id="okuma-baslik">Sonuç ne anlama gelir?</h2>
            <p>{r.nasilOkunur}</p>
          </section>

          <section aria-labelledby="hata-baslik">
            <span className={styles.sectionLabel}>Sık hatalar</span>
            <h2 id="hata-baslik">Bu hesapta en sık yapılan hatalar</h2>
            <div className={styles.grid}>
              {r.hatalar.map(([baslik, metin], i) => (
                <article key={baslik} className={styles.card}>
                  <span className={styles.cardNo}>{String(i + 1).padStart(2, '0')}</span>
                  <h3>{baslik}</h3>
                  <p>{metin}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.faq} aria-labelledby="sss-baslik">
            <span className={styles.sectionLabel}>Sık sorulanlar</span>
            <h2 id="sss-baslik">{r.etiket} hakkında</h2>
            {r.sss.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </section>

          <aside className={styles.related} aria-labelledby="ilgili-baslik">
            <div>
              <CheckCircle2 size={22} />
              <h2 id="ilgili-baslik">İlgili sayfalar</h2>
            </div>
            <nav>
              {r.ilgili.map(([label, to]) => <Link key={to} to={to}>{label} <ArrowRight size={15} /></Link>)}
            </nav>
          </aside>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
