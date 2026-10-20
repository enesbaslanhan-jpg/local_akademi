import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Calculator, Info } from 'lucide-react'
import BrandMark from '@/components/ui/BrandMark'
import AuthThemeToggle from '@/pages/AuthThemeToggle'
import PublicFooter from '@/components/layout/PublicFooter'
import { SEO_CALCULATORS, SEO_CALCULATOR_PATHS } from '@/content/seo-calculators'
import useSayfaMeta from '@/hooks/useSayfaMeta'
import styles from './KomisyonHesaplayiciPage.module.css'
import article from './SeoCalculatorPage.module.css'

const APP_STORE = 'https://apps.apple.com/app/localkarar/id6813127954'
const PLAY_STORE = 'https://play.google.com/store/apps/details?id=com.localkarar.app'
const money = value => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0)
const percent = value => `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0)}%`

function initialValues(page) {
  return Object.fromEntries(page.fields.map(([key, , value]) => [key, value]))
}

function compute(slug, values, mode) {
  if (slug === 'kdv-dahil-haric-hesaplama') {
    const amount = Math.max(0, values.amount || 0)
    const ratio = Math.max(0, values.rate || 0) / 100
    if (mode === 'exclusive') return { label: 'KDV dahil toplam', value: amount * (1 + ratio), detail: `KDV tutarı: ${money(amount * ratio)} · KDV hariç: ${money(amount)}` }
    const base = ratio > -1 ? amount / (1 + ratio) : 0
    return { label: 'KDV hariç tutar', value: base, detail: `Tutarın içindeki KDV: ${money(amount - base)} · KDV dahil: ${money(amount)}` }
  }
  if (slug === 'kar-marji-hesaplama') {
    const contribution = (values.price || 0) - (values.cost || 0) - (values.commission || 0) - (values.other || 0)
    const margin = values.price > 0 ? contribution / values.price * 100 : 0
    return { label: 'Girdiğin maliyetlerden sonra kalan katkı', value: contribution, detail: `Satış fiyatına göre katkı marjı: ${percent(margin)}` }
  }
  if (slug === 'satis-fiyati-hesaplama') {
    const denominator = 1 - Math.max(0, values.rate || 0) / 100 - Math.max(0, values.margin || 0) / 100
    if (denominator <= 0) return { label: 'Bu girdilerle sonlu fiyat hesaplanamıyor', value: null, detail: 'Satışa bağlı gider oranı ile hedef marjın toplamı %100’den küçük olmalı.' }
    const price = (values.cost || 0) / denominator
    return { label: 'Hedefe uygun yaklaşık satış fiyatı', value: price, detail: `Tahmini birim katkı: ${money(price * (values.margin || 0) / 100)}` }
  }
  if (slug === 'basabas-noktasi-hesaplama') {
    const contribution = (values.price || 0) - (values.variable || 0)
    if (contribution <= 0) return { label: 'Pozitif katkı yok', value: null, detail: 'Satış fiyatı, satış başına değişken maliyetten yüksek olmalı.' }
    const units = Math.ceil((values.fixed || 0) / contribution)
    return { label: 'Başabaş için gereken satış adedi', value: units, detail: `Birim katkı: ${money(contribution)} · Yaklaşık ciro: ${money(units * (values.price || 0))}` }
  }
  const price = values.price || 0
  const commission = price * Math.max(0, values.rate || 0) / 100
  const returnRisk = (values.shipping || 0) * 2 * Math.min(100, Math.max(0, values.returns || 0)) / 100
  const contribution = price - commission - (values.cost || 0) - (values.shipping || 0) - (values.packaging || 0) - (values.ads || 0) - returnRisk
  const margin = price > 0 ? contribution / price * 100 : 0
  return { label: 'Tahmini sipariş katkısı', value: contribution, detail: `Satış fiyatına göre katkı marjı: ${percent(margin)} · Tahmini iade kargo payı: ${money(returnRisk)}` }
}

export default function SeoCalculatorPage() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/\/$/, '').split('/').at(-1)
  const page = SEO_CALCULATORS[slug]
  const [values, setValues] = useState(() => initialValues(page))
  const [vatMode, setVatMode] = useState('inclusive')
  const result = useMemo(() => compute(slug, values, vatMode), [slug, values, vatMode])
  const url = `https://localkarar.com/araclar/${slug}`

  useSayfaMeta({
    baslik: page.title,
    aciklama: page.description,
    yol: `/araclar/${slug}`,
    schema: {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebApplication', name: page.title, url, description: page.description, applicationCategory: 'BusinessApplication', operatingSystem: 'Any', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' } },
        { '@type': 'FAQPage', mainEntity: page.faq.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
      ],
    },
  })

  return <div className={styles.page}>
    <AuthThemeToggle />
    <div className={styles.ustAlan}><div className={styles.glowCool} aria-hidden="true" /><div className={styles.ustIcerik}>
      <header className={styles.ust}><Link to="/" className={styles.brandRow}><BrandMark size={30} /><span className={styles.brandText}>LocalKarar</span></Link><nav className={styles.ustEylemler} aria-label="Ana gezinme"><Link to="/hesaplamalar" className={styles.girisLink}>Hesaplamalar</Link><Link to="/register" className={styles.kayitDugmesi}>Ücretsiz hesap oluştur</Link></nav></header>
      <section className={styles.kahraman}><span className={styles.eyebrow}>Ücretsiz işletme hesaplayıcısı</span><h1>{page.h1}</h1><p className={styles.kahramanMetin}>{page.intro}</p></section>
    </div></div>
    <main className={`${styles.icerik} ${article.page}`}>
      <div className={article.calculatorGrid}>
        <section className={styles.kart} aria-labelledby="calculator-title">
          <h2 id="calculator-title" className={styles.kartBaslik}><Calculator size={18} aria-hidden="true" /> Kendi rakamlarınla hesapla</h2>
          {slug === 'kdv-dahil-haric-hesaplama' && <div className={article.mode} role="group" aria-label="Girdiğin tutar türü"><button type="button" aria-pressed={vatMode === 'inclusive'} onClick={() => setVatMode('inclusive')}>KDV dahil tutarım var</button><button type="button" aria-pressed={vatMode === 'exclusive'} onClick={() => setVatMode('exclusive')}>KDV hariç tutarım var</button></div>}
          <div className={styles.alanlar}>{page.fields.map(([key, label, , unit]) => <label key={key} className={styles.alan} htmlFor={`field-${key}`}><span className={styles.alanEtiket}>{label}</span><span className={styles.alanKutu}><input id={`field-${key}`} type="number" min="0" step="any" inputMode="decimal" value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: Math.max(0, Number(event.target.value) || 0) }))} /><span className={styles.birim}>{unit}</span></span></label>)}</div>
          <p className={article.note}><Info size={16} /> Tutarları ve oranları kendi kayıtlarından gir. Bu sayfadaki örnek başlangıç değerleri resmi tarife veya vergi oranı değildir.</p>
        </section>
        <section className={`${styles.kart} ${styles.sonuc}`} aria-live="polite" aria-labelledby="result-heading"><h2 id="result-heading" className={styles.kartBaslik}>Hesap sonucu</h2><div className={styles.ana}><span className={styles.anaEtiket}>{result.label}</span><strong className={styles.anaTutar}>{result.value === null ? '—' : slug === 'basabas-noktasi-hesaplama' ? `${result.value} adet` : money(result.value)}</strong><span className={styles.anaAlt}>{result.detail}</span></div>
          <div className={styles.cagri}><p>Bu hesabı her sipariş için otomatik yap: LocalKarar, Ücretsiz</p><Link to="/register" className={styles.cagriDugme}>Ücretsiz hesabı incele <ArrowRight size={16} /></Link><div className={article.stores}><a href={APP_STORE} rel="noopener noreferrer">App Store</a><a href={PLAY_STORE} rel="noopener noreferrer">Google Play</a></div></div>
        </section>
      </div>
      <article className={article.article}>
        <div className={article.toc}><strong>Bu rehberde</strong><nav aria-label="Sayfa içeriği"><a href="#yontem">Hesaplama yöntemi</a><a href="#adimlar">Nasıl kullanılır?</a><a href="#sik-sorulanlar">Sık sorulanlar</a></nav></div>
        <section id="yontem"><h2>{page.h1}: yöntem ve dikkat noktaları</h2><p>{page.intro} Bu sayfa, küçük işletmelerin sık karşılaştığı fiyatlama ve maliyet sorularını kendi girdileriyle incelemesi için hazırlandı. Sonuç bir tahmindir; karar vermeden önce kaynak kayıtlarınla karşılaştır.</p>{page.paragraphs.map(([heading, text]) => <section key={heading}><h3>{heading}</h3><p>{text}</p></section>)}</section>
        <section id="adimlar"><h2>Hesaplayıcı nasıl kullanılır?</h2><ol><li>Hangi dönemi veya sipariş türünü değerlendirdiğini belirle.</li><li>Satış, maliyet, oran ve ek gider alanlarına aynı para birimindeki kendi verilerini gir.</li><li>Sonucu, formülün kapsadığı kalemleri ve dahil etmediğin giderleri kontrol ederek yorumla.</li><li>Önemli bir karar öncesinde gerçek sipariş veya muhasebe kayıtlarından örneklerle karşılaştır.</li></ol><p>Oranlar, kesintiler ve vergi uygulamaları değişebilir. Araç belirli bir platformun güncel tarifesini doğrulamaz; oran veya mevzuatı kendi güvenilir kaynağından kontrol et.</p></section>
        <section id="sik-sorulanlar"><h2>Sık sorulan sorular</h2><div className={article.faq}>{page.faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
      </article>
      <section className={article.related}><div><span>İlgili hesaplamalar</span><nav aria-label="Diğer ücretsiz hesaplayıcılar">{SEO_CALCULATOR_PATHS.filter(path => path !== pathname).map(path => { const other = SEO_CALCULATORS[path.split('/').at(-1)]; return <Link key={path} to={path}>{other.h1}</Link> })}<Link to="/hesaplamalar">Tüm hesaplamalar</Link><Link to="/karar-araclari">Karar araçları</Link></nav></div></section>
    </main><PublicFooter />
  </div>
}
