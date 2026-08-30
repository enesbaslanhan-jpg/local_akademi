import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { ShieldAlert } from 'lucide-react'
import styles from './ErrorState.module.css'

export default function Unauthorized() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.block}>
        <h1 className="sr-only">{t('errors.unauthorizedTitle')}</h1>
        {/* Erişim engeli bir uyarı durumu → bordo ailesi */}
        <span className={`${styles.icon} ${styles.iconWarn}`} aria-hidden="true">
          <ShieldAlert size={26} />
        </span>
        <p className={styles.title}>{t('errors.unauthorizedTitle')}</p>
        <p className={styles.desc}>{t('errors.unauthorizedDescription')}</p>
        {/* Sayfanın TEK turuncu ana CTA'sı */}
        <Button variant="cta" onClick={() => navigate('/app/dashboard')}>
          {t('errors.backHome')}
        </Button>
      </div>
    </div>
  )
}
