import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { SearchX } from 'lucide-react'
import styles from './ErrorState.module.css'

export default function NotFound() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.block}>
        <h1 className="sr-only">{t('errors.notFoundSr')}</h1>
        <span className={styles.icon} aria-hidden="true"><SearchX size={26} /></span>
        <p className={styles.code}>404</p>
        <p className={styles.title}>{t('errors.notFoundTitle')}</p>
        <p className={styles.desc}>{t('errors.notFoundDescription')}</p>
        {/* Sayfanın TEK turuncu ana CTA'sı */}
        <Button variant="cta" onClick={() => navigate('/app/dashboard')}>
          {t('errors.backHome')}
        </Button>
      </div>
    </div>
  )
}
