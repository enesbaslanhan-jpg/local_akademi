import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="auth-form" style={{ textAlign: 'center' }}>
        <h1>404</h1>
        <h2 style={{ marginTop: 8 }}>Sayfa bulunamadı</h2>
        <p style={{ color: 'var(--text-light)', marginTop: 16, marginBottom: 24 }}>
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>
        <Button onClick={() => navigate('/app/dashboard')} full>
          Ana Sayfaya Dön
        </Button>
      </div>
    </div>
  )
}
