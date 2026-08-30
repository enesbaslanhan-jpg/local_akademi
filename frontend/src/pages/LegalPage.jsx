import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ClipboardList, Cookie, CreditCard, FileText, PackageCheck, Scale, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandMark from '@/components/ui/BrandMark'
import PublicFooter from '@/components/layout/PublicFooter'
import { api } from '@/services/api'
import privacy from '@/content/legal/privacy'
import privacyEn from '@/content/legal/privacy.en'
import terms from '@/content/legal/terms'
import termsEn from '@/content/legal/terms.en'
import cookies from '@/content/legal/cookies'
import cookiesEn from '@/content/legal/cookies.en'
import onBilgilendirme from '@/content/legal/on-bilgilendirme'
import mesafeliSatis from '@/content/legal/mesafeli-satis'
import teslimatIade from '@/content/legal/teslimat-iade'
import abonelik from '@/content/legal/abonelik'
import styles from './LegalPage.module.css'

/*
 * Yasal metin görüntüleyicisi.
 *
 * Metinler burada DEĞİL, `content/legal/` altında. Üç belge birlikte
 * kırk küsur bölüm; bileşenin içinde tutulsalardı dosya okunamaz hale
 * gelirdi ve metni düzelten kişi JSX'e bulaşmak zorunda kalırdı.
 *
 * SÜRÜM VE TARİH API'DEN GELİYOR. Önceden burada elle yazılıydı
 * ("Son güncelleme: 9 Ağustos 2026") ama sürümün gerçek kaynağı arka
 * uçtaki `src/config/legal-documents.ts`. İki yerde tutulan bir tarih
 * kaçınılmaz olarak ayrışır: metin güncellenir, sayfa eski tarihi
 * göstermeye devam eder — ve onay kaydı ile gösterilen metin birbirini
 * tutmaz. Bu, KVKK açısından onayın kanıtlanabilirliğini zedeler.
 *
 * Tarih alınamazsa hiç tarih gösterilmiyor; yanlış tarih göstermek
 * göstermemekten kötüdür.
 */

export const BELGELER = {
  privacy: { icon: ShieldCheck, baslikKey: 'legal.documents.privacy', icerik: { tr: privacy, en: privacyEn } },
  terms: { icon: FileText, baslikKey: 'legal.documents.terms', icerik: { tr: terms, en: termsEn } },
  cookies: { icon: Cookie, baslikKey: 'legal.documents.cookies', icerik: { tr: cookies, en: cookiesEn } },

  /*
   * TİCARİ SATIŞ BELGELERİ — yalnız Türkçe (29.08.2026).
   *
   * 🔴 İngilizce sürümleri BİLEREK YOK. Bunlar Türk hukukuna tabi,
   * bağlayıcı sözleşme metinleri. Bir sözleşme maddesini yanlış
   * çevirmek, çevirmemekten daha büyük bir sorumluluk doğurur:
   * iki dilli metinde hangisinin esas alınacağı ayrı bir tartışma
   * konusudur.
   *
   * İngilizce arayüzdeki kullanıcı Türkçe metni görür ve sayfa bunu
   * SÖYLER (aşağıdaki `dilNotu`). Sessizce Türkçe göstermek, dilin
   * bozuk olduğu izlenimi verirdi.
   */
  'on-bilgilendirme': { icon: ClipboardList, baslikKey: 'legal.documents.preInfo', icerik: { tr: onBilgilendirme } },
  'mesafeli-satis': { icon: Scale, baslikKey: 'legal.documents.distanceSale', icerik: { tr: mesafeliSatis } },
  'teslimat-iade': { icon: PackageCheck, baslikKey: 'legal.documents.deliveryRefund', icerik: { tr: teslimatIade } },
  abonelik: { icon: CreditCard, baslikKey: 'legal.documents.subscription', icerik: { tr: abonelik } }
}

/**
 * Belgenin gösterilecek dildeki içeriği.
 *
 * İngilizce sürümü olmayan belgelerde Türkçe'ye DÜŞÜYOR. Önceki hâli
 * `belge.icerik['en']` döndürüyordu ve karşılığı yoksa çağıran taraf
 * `undefined`ı yapıbozuma sokup sayfayı düşürüyordu.
 */
export function belgeIcerigi(belge, language) {
  const istenen = language?.startsWith('en') ? 'en' : 'tr'
  return belge.icerik[istenen] || belge.icerik.tr
}

/** Gösterilen metin, istenen dilden farklı mı. */
export function dilDustu(belge, language) {
  return Boolean(language?.startsWith('en') && !belge.icerik.en)
}

function surumuTarihEt(surum, locale) {
  /* Sürüm biçimi `YYYY-MM-DD`; kendi içinde yürürlük tarihini taşıyor. */
  if (!/^\d{4}-\d{2}-\d{2}$/.test(surum || '')) return null
  const tarih = new Date(`${surum}T00:00:00`)
  if (Number.isNaN(tarih.getTime())) return null
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(tarih)
}

export function Bolum({ bolum }) {
  return (
    <section id={bolum.id}>
      <h2>{bolum.baslik}</h2>

      {bolum.paragraflar?.map((metin, i) => <p key={`p${i}`}>{metin}</p>)}

      {bolum.tanimlar && (
        <dl className={styles.tanimlar}>
          {bolum.tanimlar.map(([terim, aciklama]) => (
            <div key={terim}>
              <dt>{terim}</dt>
              <dd>{aciklama}</dd>
            </div>
          ))}
        </dl>
      )}

      {bolum.tablo && (
        /* Dar ekranda tablo kendi içinde kayar; sayfa yatay kaymaz. */
        <div className={styles.tabloSarmal}>
          <table className={styles.tablo}>
            <thead>
              <tr>{bolum.tablo.basliklar.map(b => <th key={b} scope="col">{b}</th>)}</tr>
            </thead>
            <tbody>
              {bolum.tablo.satirlar.map((satir, i) => (
                <tr key={i}>{satir.map((hucre, j) => <td key={j}>{hucre}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bolum.liste && (
        <ul className={styles.liste}>
          {bolum.liste.map((madde, i) => <li key={i}>{madde}</li>)}
        </ul>
      )}

      {bolum.son?.map((metin, i) => <p key={`s${i}`}>{metin}</p>)}
    </section>
  )
}

export default function LegalPage({ type = 'privacy' }) {
  const { t, i18n } = useTranslation('common')
  const navigate = useNavigate()
  const [surum, setSurum] = useState(null)

  const belge = BELGELER[type] || BELGELER.privacy
  const Icon = belge.icon
  const dil = i18n.resolvedLanguage || i18n.language
  const { giris, bolumler } = belgeIcerigi(belge, dil)
  /* Metin Türkçe gösteriliyorsa ve kullanıcı İngilizce seçtiyse söyle. */
  const turkceyeDustu = dilDustu(belge, dil)

  useEffect(() => {
    let gecerli = true
    api.auth.getLegalDocuments()
      .then(sonuc => {
        if (!gecerli) return
        const eslesme = sonuc?.documents?.find(d => d.type === type)
        if (eslesme?.version) setSurum(eslesme.version)
      })
      .catch(() => { /* Tarih gösterilmez; yanlış tarihten iyidir. */ })
    return () => { gecerli = false }
  }, [type])

  const tarih = surumuTarihEt(surum, i18n.resolvedLanguage || i18n.language)

  return (
    <>
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)} aria-label={t('buttons.back')}><ArrowLeft size={19} /></button>
        <BrandMark size={30} interactive />
        <strong>LocalKarar</strong>
      </header>

      <article className={styles.document}>
        <div className={styles.titleIcon}><Icon size={24} /></div>
        <p className={styles.kicker}>{t('legal.kicker')}</p>
        <h1>{t(belge.baslikKey)}</h1>
        {turkceyeDustu && (
          <p className={styles.dilNotu} role="note">{t('legal.turkishOnly')}</p>
        )}
        <p className={styles.intro}>{giris}</p>
        {tarih && <p className={styles.updated}>{t('legal.effectiveVersion', { date: tarih, version: surum })}</p>}

        <nav className={styles.icindekiler} aria-label={t('legal.contents')}>
          <h2>{t('legal.contents')}</h2>
          <ol>
            {bolumler.map(b => (
              <li key={b.id}><a href={`#${b.id}`}>{b.baslik}</a></li>
            ))}
          </ol>
        </nav>

        {bolumler.map(b => <Bolum key={b.id} bolum={b} />)}
      </article>
    </main>
    {/* PayTR incelemecisi /terms'e doğrudan düşerse buradan diğer
        yasal sayfalara gidebilmeli. Önceden hiç çıkış yoktu. */}
    <PublicFooter />
    </>
  )
}
