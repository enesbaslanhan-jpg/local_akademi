import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { SearchX } from 'lucide-react'
import styles from './ErrorState.module.css'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.block}>
        <h1 className="sr-only">404 — Sayfa bulunamadı</h1>
        <span className={styles.icon} aria-hidden="true"><SearchX size={26} /></span>
        <p className={styles.code}>404</p>
        <p className={styles.title}>Sayfa bulunamadı</p>
        <p className={styles.desc}>Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
        {/* Sayfanın TEK turuncu ana CTA'sı */}
        <Button variant="cta" onClick={() => navigate('/app/dashboard')}>
          Ana Sayfaya Dön
        </Button>
      </div>
    </div>
  )
}
