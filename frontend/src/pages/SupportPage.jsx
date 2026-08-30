import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertCircle, LifeBuoy, ShieldCheck, Send } from 'lucide-react'
import BrandMark from '@/components/ui/BrandMark'
import { api } from '@/services/api'
/* Modül anlatımlarının TEK KAYNAĞI: Hakkında sayfasındaki dizi.
   Aşağıdaki kılavuz aynı betimlerden besleniyor, ikinci bir tanım yok. */
import { MODULLER } from './AboutPage'
import styles from './SupportPage.module.css'
import PublicFooter from '@/components/layout/PublicFooter'

/*
 * Destek ve Yardım.
 *
 * Giriş GEREKTİRMİYOR — hesabına erişemeyen kullanıcı da yazabilmeli ve
 * zaten en sık destek sebebi budur. Giriş yapılmışsa istek yine de token
 * taşır ve sunucu hesap bilgisini mesaja ekler.
 *
 * Formda üçüncü taraf CAPTCHA yok. Yeni bir yurt dışı aktarım kalemi ve
 * yeni bir izleme yüzeyi açardı; aydınlatma metnini ve çerez politikasını
 * da değiştirirdi. Yerine gizli bir bal küpü alanı ve sunucu tarafında
 * saatlik hız sınırı var.
 */

const SSS = ['verificationEmail', 'forgotPassword', 'session', 'workspace', 'invoice', 'mentor', 'data', 'deleteAccount']

const BOS_FORM = { ad: '', eposta: '', konu: '', mesaj: '', website: '' }

/*
 * KONU TÜRÜ SEÇİMİ — kullanıcının "konu" kutusuna ne yazacağını
 * bilmediği için. Arka uç DEĞİŞMEDİ: şema serbest metin bekliyor,
 * seçim yalnızca o metni ÖN DOLDURUR ve kullanıcı üzerine yazar.
 */
const KONU_TURLERI = [
  ['soru', 'support.topicTypes.question'],
  ['sorun', 'support.topicTypes.issue'],
  ['geri-bildirim', 'support.topicTypes.feedback'],
  ['diger', 'support.topicTypes.other']
]

/*
 * KULLANMA KILAVUZU — ana akış adım adım.
 *
 * Betimlemeler MODULLER'den gelir (aynı cümleler Hakkında sayfasında
 * da var); pazaryeri bağlantısı MODULLER'de olmadığı için onun tek
 * satırlığı burada, gerçekten çalışan dört sağlayıcıyla yazıldı.
 * Var olmayan özellik anlatılmıyor.
 */
const modulBetimi = tur => `about.modules.${MODULLER.find(m => m.tur === tur)?.key}.description`

const KILAVUZ = [
  {
    key: 'createBusiness', betimKey: modulBetimi('isletme-takibi')
  },
  {
    key: 'addRecord', betimKey: 'support.guide.addRecord.description'
  },
  {
    key: 'uploadDocument', betimKey: 'support.guide.uploadDocument.description'
  },
  {
    key: 'connectMarketplace', betimKey: 'support.guide.connectMarketplace.description'
  },
  {
    key: 'askMentor', betimKey: modulBetimi('ai-mentor')
  }
]

export default function SupportPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const [form, setForm] = useState(BOS_FORM)
  const [konuTuru, setKonuTuru] = useState('')
  const [durum, setDurum] = useState({ tur: null, mesaj: '' })
  const [gonderiliyor, setGonderiliyor] = useState(false)

  const guncelle = alan => olay => setForm(o => ({ ...o, [alan]: olay.target.value }))

  /* Seçim konu alanını ön doldurur; alan form.konu'ya bağlı kaldığı
     için kullanıcı yazının üzerine serbestçe değiştirebilir. */
  function konuTuruSec(olay) {
    const deger = olay.target.value
    setKonuTuru(deger)
    const secilen = KONU_TURLERI.find(([anahtar]) => anahtar === deger)
    if (secilen) setForm(o => ({ ...o, konu: t(secilen[1]) }))
  }

  async function gonder(olay) {
    olay.preventDefault()
    if (gonderiliyor) return
    setGonderiliyor(true)
    setDurum({ tur: null, mesaj: '' })

    try {
      await api.auth.destekTalebi(form)
      setForm(BOS_FORM)
      setKonuTuru('')
      setDurum({
        tur: 'ok',
        mesaj: t('support.form.success')
      })
    } catch (hata) {
      /* Sunucu "iletilemedi" diyorsa aynen o söyleniyor; "gönderildi"
         deyip göndermemek en kötü sonuç olurdu. */
      setDurum({
        tur: 'hata',
        mesaj: hata?.message || t('support.form.failed')
      })
    } finally {
      setGonderiliyor(false)
    }
  }

  return (
    <div className={styles.kabuk}>
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)} aria-label={t('buttons.back')}><ArrowLeft size={19} /></button>
        <BrandMark size={30} interactive />
        <strong>LocalKarar</strong>
      </header>

      <div className={styles.govde}>
        <section className={styles.giris}>
          <div className={styles.ikon}><LifeBuoy size={24} /></div>
          <p className={styles.kicker}>{t('support.kicker')}</p>
          <h1>{t('support.title')}</h1>
          <p className={styles.aciklama}>{t('support.intro')}</p>
        </section>

        <section className={styles.sss} aria-labelledby="sss-baslik">
          <h2 id="sss-baslik">{t('support.faqTitle')}</h2>
          {SSS.map(key => (
            <details key={key} className={styles.sssKalem}>
              <summary>{t(`support.faq.${key}.question`)}</summary>
              <p>{t(`support.faq.${key}.answer`)}</p>
            </details>
          ))}
        </section>

        <section className={styles.kilavuz} aria-labelledby="kilavuz-baslik">
          <h2 id="kilavuz-baslik">{t('support.guideTitle')}</h2>
          <p className={styles.kilavuzGiris}>{t('support.guideIntro')}</p>
          <ol className={styles.kilavuzListe}>
            {KILAVUZ.map((akis, sira) => (
              <li key={akis.key} className={styles.kilavuzAkis}>
                <h3>{sira + 1}. {t(`support.guide.${akis.key}.title`)}</h3>
                <p>{t(akis.betimKey)}</p>
                <ol className={styles.kilavuzAdimlar}>
                  {Object.values(t(`support.guide.${akis.key}.steps`, { returnObjects: true })).map(adim => <li key={adim}>{adim}</li>)}
                </ol>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.kvkkKutu}>
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>{t('support.privacy.title')}</strong>
            <p>
              {t('support.privacy.beforeEmail')}{' '}
              <a href="mailto:kvkk@localkarar.com">kvkk@localkarar.com</a> adresine
              {' '}{t('support.privacy.afterEmail')}{' '}
              <Link to="/privacy">{t('support.privacy.link')}</Link> {t('support.privacy.suffix')}
            </p>
          </div>
        </section>

        <section className={styles.formBolum} aria-labelledby="form-baslik">
          <h2 id="form-baslik">{t('support.form.title')}</h2>

          <form className={styles.form} onSubmit={gonder}>
            <div className={styles.ikili}>
              <label className={styles.alan}>
                <span>{t('support.form.name')}</span>
                <input
                  id="destek-ad" name="name" autoComplete="name"
                  value={form.ad} onChange={guncelle('ad')}
                  minLength={2} maxLength={100} required
                />
              </label>

              <label className={styles.alan}>
                <span>{t('support.form.email')}</span>
                <input
                  id="destek-eposta" name="email" type="email" autoComplete="email"
                  value={form.eposta} onChange={guncelle('eposta')}
                  maxLength={254} required
                />
              </label>
            </div>

            <label className={styles.alan}>
              <span>{t('support.form.topicType')}</span>
              <select
                id="destek-konu-turu"
                className={styles.secim}
                value={konuTuru}
                onChange={konuTuruSec}
              >
                <option value="">{t('support.form.selectOptional')}</option>
                {KONU_TURLERI.map(([deger, etiketKey]) => (
                  <option key={deger} value={deger}>{t(etiketKey)}</option>
                ))}
              </select>
            </label>

            <label className={styles.alan}>
              <span>{t('support.form.subject')}</span>
              <input
                id="destek-konu" name="subject"
                value={form.konu} onChange={guncelle('konu')}
                minLength={3} maxLength={150} required
              />
            </label>

            <label className={styles.alan}>
              <span>{t('support.form.message')}</span>
              <textarea
                id="destek-mesaj" name="message" rows={7}
                value={form.mesaj} onChange={guncelle('mesaj')}
                minLength={20} maxLength={5000} required
                placeholder={t('support.form.messagePlaceholder')}
              />
              <small className={styles.sayac}>{form.mesaj.length} / 5000</small>
            </label>

            {/*
              BAL KÜPÜ — gerçek kullanıcı görmez ve odaklanamaz; formu
              otomatik dolduran botlar her alanı doldurur. `display: none`
              yerine ekran dışına alınıyor: bazı botlar gizli alanları
              atlar, bu ise sıradan bir alan gibi görünür.
            */}
            <div className={styles.balKupu} aria-hidden="true">
              <label>
                {t('support.form.website')}
                <input
                  type="text" name="website" tabIndex={-1} autoComplete="off"
                  value={form.website} onChange={guncelle('website')}
                />
              </label>
            </div>

            {durum.tur && (
              <p
                className={durum.tur === 'ok' ? styles.basarili : styles.hata}
                role={durum.tur === 'ok' ? 'status' : 'alert'}
              >
                {durum.tur === 'ok' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
                {durum.mesaj}
              </p>
            )}

            <div className={styles.formAlt}>
              <p className={styles.aydinlatma}>
                {t('support.form.privacyNote')}{' '}
                <Link to="/privacy">{t('support.form.privacyLink')}</Link>
              </p>
              <button type="submit" className={styles.gonderBtn} disabled={gonderiliyor}>
                {gonderiliyor ? t('support.form.sending') : <>{t('support.form.send')} <Send size={16} /></>}
              </button>
            </div>
          </form>
        </section>

        {/* Kopya yasal bağlantı listesi kaldırıldı; ortak
            `PublicFooter` aşağıda ve satıcı kimliğini de taşıyor. */}
      </div>
    </main>

    {/* Alt bilgi `.page`in DIŞINDA: içeride 24px dolgunun içinde
        kalıyor ve tam genişlik olmuyordu (ölçüldü: 471px / 499px). */}
    <PublicFooter />
    </div>
  )
}
