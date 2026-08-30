import styles from './Loading.module.css'
import { useTranslation } from 'react-i18next'

export default function Loading({ text, fullPage }) {
  const { t } = useTranslation('common')
  const effectiveText = text === undefined ? t('states.loading') : text
  return (
    <div className={`${styles.loading} ${fullPage ? styles.fullPage : ''}`} role="status" aria-label={effectiveText}>
      <div className={styles.spinner} />
      {effectiveText && <p className={styles.text}>{effectiveText}</p>}
    </div>
  )
}
