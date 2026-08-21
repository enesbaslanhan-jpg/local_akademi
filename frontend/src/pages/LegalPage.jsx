import { useEffect, useState } from 'react'
import { ArrowLeft, Cookie, FileText, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandMark from '@/components/ui/BrandMark'
import { api } from '@/services/api'
import privacy from '@/content/legal/privacy'
import terms from '@/content/legal/terms'
import cookies from '@/content/legal/cookies'
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

const BELGELER = {
  privacy: { icon: ShieldCheck, baslik: 'Gizlilik ve KVKK Aydınlatma Metni', icerik: privacy },
  terms: { icon: FileText, baslik: 'Kullanım Koşulları', icerik: terms },
  cookies: { icon: Cookie, baslik: 'Çerez ve Yerel Depolama Politikası', icerik: cookies }
}

function surumuTarihEt(surum) {
  /* Sürüm biçimi `YYYY-MM-DD`; kendi içinde yürürlük tarihini taşıyor. */
  if (!/^\d{4}-\d{2}-\d{2}$/.test(surum || '')) return null
  const tarih = new Date(`${surum}T00:00:00`)
  if (Number.isNaN(tarih.getTime())) return null
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(tarih)
}

function Bolum({ bolum }) {
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
  const navigate = useNavigate()
  const [surum, setSurum] = useState(null)

  const belge = BELGELER[type] || BELGELER.privacy
  const Icon = belge.icon
  const { giris, bolumler } = belge.icerik

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

  const tarih = surumuTarihEt(surum)

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Geri dön"><ArrowLeft size={19} /></button>
        <BrandMark size={30} interactive />
        <strong>LocalKarar</strong>
      </header>

      <article className={styles.document}>
        <div className={styles.titleIcon}><Icon size={24} /></div>
        <p className={styles.kicker}>Yasal bilgilendirme</p>
        <h1>{belge.baslik}</h1>
        <p className={styles.intro}>{giris}</p>
        {tarih && <p className={styles.updated}>Yürürlük tarihi: {tarih} · Sürüm {surum}</p>}

        <nav className={styles.icindekiler} aria-label="İçindekiler">
          <h2>İçindekiler</h2>
          <ol>
            {bolumler.map(b => (
              <li key={b.id}><a href={`#${b.id}`}>{b.baslik}</a></li>
            ))}
          </ol>
        </nav>

        {bolumler.map(b => <Bolum key={b.id} bolum={b} />)}
      </article>
    </main>
  )
}
