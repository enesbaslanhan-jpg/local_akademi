import { ArrowLeft, Cookie, FileText, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandMark from '@/components/ui/BrandMark'
import styles from './LegalPage.module.css'

const DOCUMENTS = {
  privacy: {
    icon: ShieldCheck,
    title: 'Gizlilik ve KVKK Aydınlatma Metni',
    intro: 'LocalKarar hesabınız ve işletme çalışma alanlarınız kapsamında işlenen kişisel veriler hakkında bilgilendirme.',
    sections: [
      ['İşlenen veriler', 'Hesap kimliği, e-posta adresi, işletme profil bilgileri, uygulama içi tercihler, güvenlik ve denetim kayıtları işlenebilir. Parolalar açık biçimde saklanmaz.'],
      ['İşleme amaçları', 'Hesap güvenliğini sağlamak, uygulama özelliklerini sunmak, işletme kayıtlarını yönetmek, destek vermek ve yasal yükümlülükleri yerine getirmek.'],
      ['Saklama ve güvenlik', 'Veriler yalnızca hizmet ve yasal yükümlülükler için gerekli süre boyunca saklanır. Erişim yetkilendirme, kayıt tutma ve teknik güvenlik kontrolleriyle sınırlandırılır.'],
      ['Haklarınız', 'Verilerinize erişme, düzeltme isteme, işleme faaliyetleri hakkında bilgi alma ve uygun olduğu ölçüde silme veya anonimleştirme talep etme hakkınız bulunur. Hesap yönetimi işlemlerini Ayarlar sayfasından başlatabilirsiniz.'],
      ['İletişim', 'Gizlilik talepleri için uygulamanın yetkili işletmecisi tarafından ilan edilen destek ve iletişim kanalını kullanın.']
    ]
  },
  terms: {
    icon: FileText,
    title: 'Kullanım Koşulları',
    intro: 'LocalKarar hizmetlerinin güvenli ve sorumlu kullanımına ilişkin temel kurallar.',
    sections: [
      ['Hizmetin kapsamı', 'LocalKarar eğitim, işletme takibi, finansal hesaplama, topluluk ve karar desteği araçları sunar. Çıktılar profesyonel hukuk, vergi, muhasebe veya yatırım danışmanlığının yerine geçmez.'],
      ['Hesap güvenliği', 'Kullanıcılar giriş bilgilerini korumak, hesaplarındaki faaliyetleri takip etmek ve yetkisiz erişimi gecikmeden bildirmekle sorumludur.'],
      ['İçerik ve topluluk', 'Paylaşılan içerik hukuka uygun, özgün ve üçüncü taraf haklarına saygılı olmalıdır. Moderasyon kuralları ihlal edilen içerikler yayından kaldırılabilir.'],
      ['Hizmet değişiklikleri', 'Güvenlik, mevzuat veya ürün gereksinimleri nedeniyle özelliklerde değişiklik yapılabilir. Önemli değişiklikler uygun kanallardan duyurulur.'],
      ['Hesabın sona ermesi', 'Kullanıcı hesabını Ayarlar alanından silebilir. Güvenlik, denetim ve yasal saklama yükümlülüklerine tabi kayıtlar kişisel kimlikten ayrıştırılarak korunabilir.']
    ]
  },
  cookies: {
    icon: Cookie,
    title: 'Çerez ve Yerel Depolama Politikası',
    intro: 'Uygulamanın cihazınızda hangi zorunlu tercihleri sakladığını açıklayan politika.',
    sections: [
      ['Zorunlu depolama', 'Oturum anahtarı, tema tercihi ve sidebar görünümü gibi uygulamanın çalışması için gerekli bilgiler tarayıcının yerel depolama alanında tutulabilir.'],
      ['Analitik ve reklam', 'Bu sürümde kullanıcı davranışını reklam amacıyla izleyen üçüncü taraf çerezleri kullanılmaz. Böyle bir özellik eklenirse açık bilgilendirme ve gerekli tercih kontrolleri sağlanır.'],
      ['Tercihlerin yönetimi', 'Tema ve görünüm tercihlerini Ayarlar sayfasından değiştirebilirsiniz. Oturumu kapatmak oturum anahtarını cihazdan kaldırır.'],
      ['Tarayıcı kontrolleri', 'Yerel verileri tarayıcı ayarlarından silebilirsiniz; bu işlem oturumun kapanmasına ve cihaz tercihlerinizi yeniden seçmenize neden olabilir.']
    ]
  }
}

export default function LegalPage({ type = 'privacy' }) {
  const navigate = useNavigate()
  const document = DOCUMENTS[type] || DOCUMENTS.privacy
  const Icon = document.icon
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button type="button" onClick={() => navigate(-1)} aria-label="Geri dön"><ArrowLeft size={19} /></button>
        <BrandMark size={30} />
        <strong>LocalKarar</strong>
      </header>
      <article className={styles.document}>
        <div className={styles.titleIcon}><Icon size={24} /></div>
        <p className={styles.kicker}>Yasal bilgilendirme</p>
        <h1>{document.title}</h1>
        <p className={styles.intro}>{document.intro}</p>
        <p className={styles.updated}>Son güncelleme: 9 Ağustos 2026</p>
        {document.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}
      </article>
    </main>
  )
}
