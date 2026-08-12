import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ShieldAlert } from 'lucide-react'
import styles from './ErrorState.module.css'

export default function Unauthorized() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.block}>
        <h1 className="sr-only">Yetkisiz erişim</h1>
        {/* Erişim engeli bir uyarı durumu → bordo ailesi */}
        <span className={`${styles.icon} ${styles.iconWarn}`} aria-hidden="true">
          <ShieldAlert size={26} />
        </span>
        <p className={styles.title}>Yetkisiz erişim</p>
        <p className={styles.desc}>Bu sayfaya erişim yetkiniz bulunmuyor.</p>
        {/* Sayfanın TEK turuncu ana CTA'sı */}
        <Button variant="cta" onClick={() => navigate('/app/dashboard')}>
          Ana Sayfaya Dön
        </Button>
      </div>
    </div>
  )
}
