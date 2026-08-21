import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertCircle, LifeBuoy, ShieldCheck, Send } from 'lucide-react'
import BrandMark from '@/components/ui/BrandMark'
import { api } from '@/services/api'
import styles from './SupportPage.module.css'

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

const SSS = [
  {
    soru: 'E-posta doğrulama postası gelmedi, ne yapmalıyım?',
    cevap:
      'Önce spam ve tanıtım klasörlerine bakın. Kod 15 dakika geçerlidir; süresi geçtiyse ' +
      'uygulamadaki şeritten yeni kod isteyebilirsiniz. Adresinizi yanlış yazdıysanız ' +
      'Ayarlar sayfasından değiştirebilirsiniz.'
  },
  {
    soru: 'Şifremi unuttum.',
    cevap:
      'Giriş ekranındaki “Şifremi unuttum” bağlantısını kullanın. Bağlantı 1 saat ve ' +
      'yalnızca bir kez geçerlidir. Şifre sıfırlama yalnızca DOĞRULANMIŞ e-posta ' +
      'adreslerine gönderilir; adresinizi henüz doğrulamadıysanız posta gelmez.'
  },
  {
    soru: 'Her açtığımda yeniden giriş yapmam gerekiyor.',
    cevap:
      'Oturumunuz 30 gün açık kalır. Bu süreden önce kopuyorsa, siteye bazen “www” ile ' +
      'bazen “www”suz girmiş olabilirsiniz — tarayıcı bunları iki ayrı site sayar. ' +
      'Adres artık tek biçime yönlendiriliyor; sorun sürerse bize yazın.'
  },
  {
    soru: 'İşletme çalışma alanı ne işe yarar?',
    cevap:
      'Gelir, gider, cari hesap ve belgelerinizi tuttuğunuz alandır. Bir işletmeye başka ' +
      'kişileri davet edebilirsiniz; davet, e-posta ile gönderilen tek kullanımlık bir ' +
      'bağlantı üzerinden kabul edilir.'
  },
  {
    soru: 'Yüklediğim faturadan kayıt nasıl oluşuyor?',
    cevap:
      'Belgedeki metin okunur ve size bir kayıt ÖNERİSİ sunulur. Siz onaylamadan hiçbir ' +
      'şey işletme kayıtlarınıza yazılmaz. Öneriyi düzenleyebilir veya reddedebilirsiniz.'
  },
  {
    soru: 'AI Mentor’un verdiği bilgiye güvenebilir miyim?',
    cevap:
      'Mentor bir dil modeli kullanır ve kendinden emin görünen hatalı bilgi üretebilir. ' +
      'Yanıtı mümkün olduğunda kendi içerik kütüphanemize dayandırır ve kaynağı gösterir. ' +
      'Rakam, oran, süre ve mevzuat içeren bilgileri işlem yapmadan önce resmî kaynağından ' +
      'doğrulayın. Mentor mali müşavir veya avukat yerine geçmez.'
  },
  {
    soru: 'Verilerim nerede tutuluyor?',
    cevap:
      'Sunucularımız Fransa’dadır. Mentor yazışmaları Mistral AI (Fransa) tarafından ' +
      'işlenir ve kötüye kullanım denetimi için 30 gün saklanır; model eğitiminde ' +
      'kullanılmaz. Ayrıntılı döküm Gizlilik ve KVKK Aydınlatma Metni’ndedir.'
  },
  {
    soru: 'Hesabımı nasıl silerim?',
    cevap:
      'Ayarlar → Hesabı sil. Tek sahibi olduğunuz bir işletme varsa önce başka bir üyeyi ' +
      'sahip yapmanız gerekir. Silme sonrası verilerinize ne olduğu aydınlatma metninde ' +
      'yazılıdır.'
  }
]

const BOS_FORM = { ad: '', eposta: '', konu: '', mesaj: '', website: '' }

export default function SupportPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(BOS_FORM)
  const [durum, setDurum] = useState({ tur: null, mesaj: '' })
  const [gonderiliyor, setGonderiliyor] = useState(false)

  const guncelle = alan => olay => setForm(o => ({ ...o, [alan]: olay.target.value }))

  async function gonder(olay) {
    olay.preventDefault()
    if (gonderiliyor) return
    setGonderiliyor(true)
    setDurum({ tur: null, mesaj: '' })

    try {
      await api.auth.destekTalebi(form)
      setForm(BOS_FORM)
      setDurum({
        tur: 'ok',
        mesaj: 'Mesajınız iletildi. Yanıtı yazdığınız e-posta adresine göndereceğiz.'
      })
    } catch (hata) {
      /* Sunucu "iletilemedi" diyorsa aynen o söyleniyor; "gönderildi"
         deyip göndermemek en kötü sonuç olurdu. */
      setDurum({
        tur: 'hata',
        mesaj: hata?.message || 'Mesaj iletilemedi. Lütfen biraz sonra tekrar deneyin.'
      })
    } finally {
      setGonderiliyor(false)
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Geri dön"><ArrowLeft size={19} /></button>
        <BrandMark size={30} interactive />
        <strong>LocalKarar</strong>
      </header>

      <div className={styles.govde}>
        <section className={styles.giris}>
          <div className={styles.ikon}><LifeBuoy size={24} /></div>
          <p className={styles.kicker}>Destek</p>
          <h1>Yardım ve iletişim</h1>
          <p className={styles.aciklama}>
            Sık karşılaşılan durumların yanıtları aşağıda. Aradığınızı bulamazsanız
            formu doldurun; yazdığınız adrese dönüş yapılır.
          </p>
        </section>

        <section className={styles.sss} aria-labelledby="sss-baslik">
          <h2 id="sss-baslik">Sık sorulanlar</h2>
          {SSS.map(({ soru, cevap }) => (
            <details key={soru} className={styles.sssKalem}>
              <summary>{soru}</summary>
              <p>{cevap}</p>
            </details>
          ))}
        </section>

        <section className={styles.kvkkKutu}>
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>Kişisel verilerinizle ilgili talepler</strong>
            <p>
              KVKK kapsamındaki başvurularınızı{' '}
              <a href="mailto:kvkk@localkarar.com">kvkk@localkarar.com</a> adresine
              iletin. Hangi bilgileri eklemeniz gerektiği{' '}
              <Link to="/privacy">Aydınlatma Metni’nin başvuru bölümünde</Link> yazılıdır.
            </p>
          </div>
        </section>

        <section className={styles.formBolum} aria-labelledby="form-baslik">
          <h2 id="form-baslik">Bize yazın</h2>

          <form className={styles.form} onSubmit={gonder}>
            <div className={styles.ikili}>
              <label className={styles.alan}>
                <span>Adınız</span>
                <input
                  id="destek-ad" name="name" autoComplete="name"
                  value={form.ad} onChange={guncelle('ad')}
                  minLength={2} maxLength={100} required
                />
              </label>

              <label className={styles.alan}>
                <span>E-posta adresiniz</span>
                <input
                  id="destek-eposta" name="email" type="email" autoComplete="email"
                  value={form.eposta} onChange={guncelle('eposta')}
                  maxLength={254} required
                />
              </label>
            </div>

            <label className={styles.alan}>
              <span>Konu</span>
              <input
                id="destek-konu" name="subject"
                value={form.konu} onChange={guncelle('konu')}
                minLength={3} maxLength={150} required
              />
            </label>

            <label className={styles.alan}>
              <span>Mesajınız</span>
              <textarea
                id="destek-mesaj" name="message" rows={7}
                value={form.mesaj} onChange={guncelle('mesaj')}
                minLength={20} maxLength={5000} required
                placeholder="Sorununuzu olabildiğince somut anlatın: hangi ekranda, ne yaptığınızda, ne olduğunu yazın."
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
                Web siteniz
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
                Formu gönderdiğinizde adınız, e-posta adresiniz ve mesajınız yalnızca
                talebinizi yanıtlamak için işlenir ve e-posta olarak iletilir; bu
                mesajlar veritabanımızda saklanmaz.{' '}
                <Link to="/privacy">Aydınlatma Metni</Link>
              </p>
              <button type="submit" className={styles.gonderBtn} disabled={gonderiliyor}>
                {gonderiliyor ? 'Gönderiliyor…' : <>Gönder <Send size={16} /></>}
              </button>
            </div>
          </form>
        </section>

        <nav className={styles.altBaglantilar} aria-label="Yasal metinler">
          <Link to="/privacy">Gizlilik ve KVKK</Link>
          <Link to="/terms">Kullanım koşulları</Link>
          <Link to="/cookies">Çerezler</Link>
          <Link to="/hakkinda">LocalKarar hakkında</Link>
        </nav>
      </div>
    </main>
  )
}
