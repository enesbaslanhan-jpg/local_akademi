import { useTranslation } from 'react-i18next'
import styles from './CitationBadge.module.css'

/*
 * MENTOR ATIF ROZETİ.
 *
 * ⚠️ TIKLANABİLİR DEĞİL ve bu bilinçli. Rozet eskiden
 * `/app/knowledge/:code` sayfasına gidiyordu; Bilgi Kütüphanesi ürün
 * sahibi kararıyla kaldırıldı (03.09.2026) ve ürünün öğrenme yüzeyi
 * 38 kanonik kursa indirildi.
 *
 * Rozet DURUYOR çünkü işi yalnız cevabın neye dayandığını göstermek:
 * kaynak adı ve kodu görünür, ama gidilecek bir sayfa yok. Ölü bir
 * bağlantı bırakmak, tıklayan kullanıcıyı 404'e göndermek olurdu.
 */
export default function CitationBadge({ title, code, sourceRefs }) {
  const { t } = useTranslation('mentor')
  const label = title || t('citation.unknownSource')
  const sourceCount = Array.isArray(sourceRefs) ? sourceRefs.length : 0
  const showSourceIndicator = sourceCount > 0

  const baseClasses = `
    inline-flex items-center text-[11px] px-1.5 py-0.5 rounded mr-1 mb-1
    bg-[var(--primary-light)] text-[var(--primary)]
    ${styles.badge}
  `

  return (
    <span className={baseClasses}>
      <span className={`truncate max-w-[150px] md:max-w-[200px] ${styles.label}`}>{label}</span>
      {code && <span className={`ml-1 opacity-80 ${styles.code}`}>({code})</span>}
      {showSourceIndicator && (
        <span className={`ml-1 w-1 h-1 rounded-full bg-current opacity-60 ${styles.sourceDot}`} aria-hidden="true" />
      )}
    </span>
  )
}
