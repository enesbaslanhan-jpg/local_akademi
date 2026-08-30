import Modal from '@/components/ui/Modal'
import { Bolum, BELGELER, belgeIcerigi } from '@/pages/LegalPage'
import sayfaStilleri from '@/pages/LegalPage.module.css'
import styles from './LegalModal.module.css'
import { useTranslation } from 'react-i18next'

/*
 * YASAL METNİ SAYFADAN ÇIKMADAN GÖSTEREN PENCERE.
 *
 * 🔴 NEDEN VAR: kayıt formundaki onay bağlantıları `target="_blank"` ile
 * yeni sekme açıyordu. Bu bilinçliydi — aynı sekmede gidilseydi formda
 * yazılan e-posta, parola, ad ve onay kutusu KAYBOLURDU. Ama kullanıcı
 * haklı olarak metni uygulamanın içinde okumak istiyor.
 *
 * Pencere ikisini birden veriyor: form arkada olduğu gibi duruyor,
 * metin üstünde açılıyor.
 *
 * ⚠️ Çizim KOPYALANMIYOR: `LegalPage`in `Bolum` bileşeni ve stil
 * dosyası aynen kullanılıyor. İkinci bir çizim yazılsaydı iki yer
 * kaçınılmaz olarak ayrışırdı -- tablo, tanım listesi ve liste
 * biçimleri metinlerin her güncellemesinde ikiye bölünürdü.
 */
export default function LegalModal({ type, open, onClose }) {
  const { t, i18n } = useTranslation('common')
  const belge = BELGELER[type]
  if (!belge) return null

  const { giris, bolumler } = belgeIcerigi(belge, i18n.resolvedLanguage || i18n.language)

  return (
    <Modal open={open} onClose={onClose} title={t(belge.baslikKey)} size="lg">
      {/*
        `sayfaStilleri.document` LegalPage'in tipografisini taşıyor
        (başlık, paragraf, tablo, tanım listesi). `styles.govde` yalnız
        pencere içindeki kaydırmayı ayarlıyor. Metin iki yerde AYNI
        görünüyor.
      */}
      <div className={`${styles.govde} ${sayfaStilleri.document}`}>
        {giris && <p className={sayfaStilleri.intro}>{giris}</p>}
        {bolumler.map(bolum => <Bolum key={bolum.id ?? bolum.baslik} bolum={bolum} />)}
      </div>
    </Modal>
  )
}
