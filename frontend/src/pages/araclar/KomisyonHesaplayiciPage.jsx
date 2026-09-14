import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Calculator, Info, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import BrandMark from '@/components/ui/BrandMark'
import AuthThemeToggle from '@/pages/AuthThemeToggle'
import PublicFooter from '@/components/layout/PublicFooter'
import { useGirisli } from '@/hooks/useGirisli'
import useSayfaMeta from '@/hooks/useSayfaMeta'
import styles from './KomisyonHesaplayiciPage.module.css'

/*
 * PAZARYERİ KOMİSYON HESAPLAYICI — herkese açık, kayıt istemez.
 *
 * Neden var: pazarlama bütçesi ayda 2 bin ₺ (ürün sahibi, 14.09.2026).
 * Bu parayla "kaydol" sayfasına reklam basmak dönüşmüyor; ziyaretçi
 * daha ürünü görmeden hesap açması isteniyor. Onun yerine derdini
 * hemen çözen bir araç: "Trendyol'da şu fiyata satarsam elime ne
 * kalır?" Aracı kullanan, hesabı SAKLAMAK istediğinde kayda gidiyor.
 * Aynı sayfa organik aramada da ("trendyol komisyon hesaplama") tek
 * başına trafik kaynağı.
 *
 * 🔴 FORMÜL UYGULAMA İÇİNDEKİYLE AYNI: `src/services/formulas.ts →
 * calculateMarketplaceProfit`. İki yerde iki farklı sonuç çıkması,
 * kayıt olan kullanıcının "sitede başka sayı gösteriyordu" demesi
 * demek. Oradaki alanlar değişirse burası da değişmeli.
 *
 * 🔴 KOMİSYON ORANLARI SABİT DEĞİL. Pazaryerleri oranı kategoriye göre
 * belirliyor ve sık değiştiriyor; buraya "Trendyol %X" yazmak yanlış
 * bilgi yayımlamak olurdu. Ön ayarlar yalnız BAŞLANGIÇ değeri ve öyle
 * etiketleniyor; kullanıcı kendi sözleşmesindeki oranı yazıyor.
 *
 * ⚠️ Sunucuya hiçbir şey gitmiyor: hesap tarayıcıda. Sayfa çerez
 * yazmıyor, girilen tutarlar kaydedilmiyor — çerez politikasındaki
 * "izleme yok" taahhüdü bu sayfada da geçerli.
 */

/* Başlangıç değerleri. Oranlar ÖRNEK; ekranda da öyle yazıyor. */
const ON_AYARLAR = [
  { kod: 'trendyol', ad: 'Trendyol', komisyon: 21.5, kargo: 79.9 },
  { kod: 'hepsiburada', ad: 'Hepsiburada', komisyon: 20, kargo: 74.9 },
  { kod: 'n11', ad: 'N11', komisyon: 18, kargo: 69.9 },
  { kod: 'diger', ad: null, komisyon: 15, kargo: 60 },
]

const BASLANGIC = {
  satisFiyati: 1000,
  komisyonOrani: 21.5,
  urunMaliyeti: 550,
  kargo: 79.9,
  ambalaj: 15,
  reklamPayi: 0,
  iadeOrani: 5,
}

/* İade riski: uygulamadaki formül ₺ ister; burada oran soruluyor çünkü
   satıcı iadeyi yüzde olarak bilir. Kargo iki yön gider, ürün geri
   gelir — riski (kargo × 2) × oran olarak ₺'ye çeviriyoruz. */
function hesapla(g) {
  const iadeRiski = (g.kargo * 2) * (g.iadeOrani / 100)
  const komisyon = g.satisFiyati * g.komisyonOrani / 100
  const toplamMaliyet = g.urunMaliyeti + komisyon + g.kargo + g.ambalaj + g.reklamPayi + iadeRiski
  const katki = g.satisFiyati - toplamMaliyet
  const marj = g.satisFiyati > 0 ? katki / g.satisFiyati * 100 : 0
  /* Başabaş: katkı = 0 olan fiyat. Komisyon fiyata bağlı olduğu için
     sabit giderler (1 − oran)'a bölünür. */
  const sabitler = g.urunMaliyeti + g.kargo + g.ambalaj + g.reklamPayi + iadeRiski
  const basabas = g.komisyonOrani < 100 ? sabitler / (1 - g.komisyonOrani / 100) : null
  return { iadeRiski, komisyon, toplamMaliyet, katki, marj, basabas }
}

const yerel = dil => (dil === 'en' ? 'en-US' : 'tr-TR')
const oran = (n, dil) => n.toLocaleString(yerel(dil), { maximumFractionDigits: 2 })

function para(n, dil) {
  return new Intl.NumberFormat(dil === 'en' ? 'en-US' : 'tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(n)
}

/*
 * Alan kendi ham metnini tutar. Değeri doğrudan sayıdan üretince kutu
 * silindiğinde "0" beliriyor ve yazılan rakam onun peşine ekleniyordu
 * ("01849" — video kaydında görüldü). Boş kutu boş kalır, hesap 0 alır;
 * ön ayar gibi dış değişiklikler metne geri yazılır.
 */
function Alan({ id, label, deger, onChange, birim, adim = '0.01', min = '0', ipucu }) {
  const [ham, setHam] = useState(String(deger))
  useEffect(() => {
    if (Number(ham === '' ? 0 : ham) !== deger) setHam(String(deger))
  }, [deger]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className={styles.alan} htmlFor={id}>
      <span className={styles.alanEtiket}>{label}</span>
      <span className={styles.alanKutu}>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={adim}
          value={ham}
          onChange={e => { setHam(e.target.value); onChange(e.target.value === '' ? 0 : Number(e.target.value)) }}
        />
        <span className={styles.birim}>{birim}</span>
      </span>
      {ipucu && <span className={styles.ipucu}>{ipucu}</span>}
    </label>
  )
}

export default function KomisyonHesaplayiciPage() {
  const { t, i18n } = useTranslation('common')
  const dil = i18n.resolvedLanguage
  const girisli = useGirisli()
  const [g, setG] = useState(BASLANGIC)
  const [onAyar, setOnAyar] = useState('trendyol')

  useSayfaMeta({
    baslik: t('tools.commission.metaTitle'),
    aciklama: t('tools.commission.metaDescription'),
    yol: '/araclar/pazaryeri-komisyon-hesaplayici',
  })

  const s = useMemo(() => hesapla(g), [g])
  const set = alan => deger => setG(o => ({ ...o, [alan]: deger }))

  function onAyarSec(kod) {
    setOnAyar(kod)
    const p = ON_AYARLAR.find(x => x.kod === kod)
    if (p) setG(o => ({ ...o, komisyonOrani: p.komisyon, kargo: p.kargo }))
  }

  const durum = s.katki > 0 ? 'karli' : s.katki < 0 ? 'zarar' : 'basabas'
  /* Sınıf adları `.basabas` paragrafıyla çakışmasın diye önekli. */
  const DURUM_SINIFI = { karli: styles.durumKarli, zarar: styles.durumZarar, basabas: styles.durumBasabas }

  return (
    <div className={styles.page}>
      <AuthThemeToggle />

      <div className={styles.ustAlan}>
        <div className={styles.glowCool} aria-hidden="true" />
        <div className={styles.ustIcerik}>
          <header className={styles.ust}>
            <Link to="/" className={styles.brandRow}>
              <BrandMark size={30} />
              <span className={styles.brandText}>LocalKarar</span>
            </Link>
            <nav className={styles.ustEylemler}>
              {girisli ? (
                <Link to="/app/dashboard" className={styles.kayitDugmesi}>{t('about.backToApp')}</Link>
              ) : (
                <>
                  <Link to="/login" className={styles.girisLink}>{t('about.signIn')}</Link>
                  <Link to="/register" className={styles.kayitDugmesi}>{t('about.createAccount')}</Link>
                </>
              )}
            </nav>
          </header>

          <section className={styles.kahraman}>
            <span className={styles.eyebrow}>{t('tools.commission.eyebrow')}</span>
            <h1>{t('tools.commission.title')}</h1>
            <p className={styles.kahramanMetin}>{t('tools.commission.description')}</p>
          </section>
        </div>
      </div>

      <main className={styles.icerik}>
        <div className={styles.izgara}>
          {/* ---- Girdiler ---- */}
          <section className={styles.kart} aria-labelledby="girdi-baslik">
            <h2 id="girdi-baslik" className={styles.kartBaslik}>
              <Calculator size={18} aria-hidden="true" /> {t('tools.commission.inputsTitle')}
            </h2>

            <div className={styles.onAyarlar} role="group" aria-label={t('tools.commission.presetAria')}>
              {ON_AYARLAR.map(p => (
                <button
                  key={p.kod}
                  type="button"
                  className={`${styles.onAyar} ${onAyar === p.kod ? styles.onAyarSecili : ''}`}
                  aria-pressed={onAyar === p.kod}
                  onClick={() => onAyarSec(p.kod)}
                >
                  {p.ad ?? t('tools.commission.presetOther')}
                </button>
              ))}
            </div>
            <p className={styles.onAyarNot}>
              <Info size={13} aria-hidden="true" /> {t('tools.commission.presetNote')}
            </p>

            <div className={styles.alanlar}>
              <Alan id="satis" label={t('tools.commission.fields.price')} deger={g.satisFiyati} onChange={set('satisFiyati')} birim="₺" adim="1" ipucu={t('tools.commission.fields.priceHint')} />
              <Alan id="komisyon" label={t('tools.commission.fields.commission')} deger={g.komisyonOrani} onChange={set('komisyonOrani')} birim="%" adim="0.1" ipucu={t('tools.commission.fields.commissionHint')} />
              <Alan id="maliyet" label={t('tools.commission.fields.cost')} deger={g.urunMaliyeti} onChange={set('urunMaliyeti')} birim="₺" adim="1" />
              <Alan id="kargo" label={t('tools.commission.fields.shipping')} deger={g.kargo} onChange={set('kargo')} birim="₺" ipucu={t('tools.commission.fields.shippingHint')} />
              <Alan id="ambalaj" label={t('tools.commission.fields.packaging')} deger={g.ambalaj} onChange={set('ambalaj')} birim="₺" />
              <Alan id="reklam" label={t('tools.commission.fields.ads')} deger={g.reklamPayi} onChange={set('reklamPayi')} birim="₺" ipucu={t('tools.commission.fields.adsHint')} />
              <Alan id="iade" label={t('tools.commission.fields.returns')} deger={g.iadeOrani} onChange={set('iadeOrani')} birim="%" adim="0.5" ipucu={t('tools.commission.fields.returnsHint')} />
            </div>
          </section>

          {/* ---- Sonuç ---- */}
          <section className={`${styles.kart} ${styles.sonuc}`} aria-labelledby="sonuc-baslik" aria-live="polite">
            <h2 id="sonuc-baslik" className={styles.kartBaslik}>{t('tools.commission.resultTitle')}</h2>

            <div className={`${styles.ana} ${DURUM_SINIFI[durum]}`}>
              <span className={styles.anaEtiket}>{t('tools.commission.contribution')}</span>
              <strong className={styles.anaTutar}>{para(s.katki, dil)}</strong>
              <span className={styles.anaAlt}>
                {t('tools.commission.margin', { value: s.marj.toLocaleString(yerel(dil), { maximumFractionDigits: 1 }) })}
                {' · '}
                {t(`tools.commission.status.${durum}`)}
              </span>
            </div>

            <dl className={styles.dokum}>
              <div><dt>{t('tools.commission.rows.revenue')}</dt><dd>{para(g.satisFiyati, dil)}</dd></div>
              <div className={styles.eksi}><dt>{t('tools.commission.rows.commission', { rate: oran(g.komisyonOrani, dil) })}</dt><dd>− {para(s.komisyon, dil)}</dd></div>
              <div className={styles.eksi}><dt>{t('tools.commission.rows.cost')}</dt><dd>− {para(g.urunMaliyeti, dil)}</dd></div>
              <div className={styles.eksi}><dt>{t('tools.commission.rows.shipping')}</dt><dd>− {para(g.kargo, dil)}</dd></div>
              {g.ambalaj > 0 && <div className={styles.eksi}><dt>{t('tools.commission.rows.packaging')}</dt><dd>− {para(g.ambalaj, dil)}</dd></div>}
              {g.reklamPayi > 0 && <div className={styles.eksi}><dt>{t('tools.commission.rows.ads')}</dt><dd>− {para(g.reklamPayi, dil)}</dd></div>}
              <div className={styles.eksi}><dt>{t('tools.commission.rows.returns', { rate: oran(g.iadeOrani, dil) })}</dt><dd>− {para(s.iadeRiski, dil)}</dd></div>
              <div className={styles.toplam}><dt>{t('tools.commission.rows.total')}</dt><dd>{para(s.katki, dil)}</dd></div>
            </dl>

            {s.basabas !== null && (
              <p className={styles.basabas}>
                {t('tools.commission.breakEven')} <strong>{para(s.basabas, dil)}</strong>
                <span>{t('tools.commission.breakEvenHint')}</span>
              </p>
            )}

            {/*
              * ÇAĞRI: hesabı saklamak. Araç bedava ve öyle kalıyor; kayıt,
              * "bu hesabı ürün başına kaydet, siparişlerinle karşılaştır"
              * isteyene. Giriş yapmış kullanıcıya uygulamadaki karşılığı
              * gösteriliyor.
              */}
            <div className={styles.cagri}>
              <p>{t('tools.commission.ctaText')}</p>
              {girisli ? (
                <Link to="/app/calculations" className={styles.cagriDugme}>
                  {t('tools.commission.ctaApp')} <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <Link to="/register" className={styles.cagriDugme}>
                  {t('tools.commission.ctaRegister')} <ArrowRight size={16} aria-hidden="true" />
                </Link>
              )}
              <span className={styles.cagriNot}>{t('tools.commission.ctaNote')}</span>
            </div>
          </section>
        </div>

        {/* ---- Nasıl hesaplanır (arama motoru ve güven için düz metin) ---- */}
        <section className={styles.aciklama} aria-labelledby="nasil-baslik">
          <h2 id="nasil-baslik" className={styles.bolumBaslik}>{t('tools.commission.howTitle')}</h2>
          <ol className={styles.adimlar}>
            <li>{t('tools.commission.how.1')}</li>
            <li>{t('tools.commission.how.2')}</li>
            <li>{t('tools.commission.how.3')}</li>
            <li>{t('tools.commission.how.4')}</li>
          </ol>
          <p className={styles.guvence}>
            <ShieldCheck size={16} aria-hidden="true" /> {t('tools.commission.privacyNote')}
          </p>
        </section>

        <section className={styles.sss} aria-labelledby="sss-baslik">
          <h2 id="sss-baslik" className={styles.bolumBaslik}>{t('tools.commission.faqTitle')}</h2>
          {['rate', 'vat', 'returns', 'free'].map(k => (
            <details key={k}>
              <summary>{t(`tools.commission.faq.${k}.q`)}</summary>
              <p>{t(`tools.commission.faq.${k}.a`)}</p>
            </details>
          ))}
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
