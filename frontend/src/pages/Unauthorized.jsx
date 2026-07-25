import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'

export default function Unauthorized() {
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="auth-form" style={{ textAlign: 'center' }}>
        <h1>Yetkisiz Erişim</h1>
        <p style={{ color: 'var(--text-light)', marginTop: 16, marginBottom: 24 }}>
          Bu sayfaya erişim yetkiniz bulunmamaktadır.
        </p>
        <Button onClick={() => navigate('/app/dashboard')} full>
          Ana Sayfaya Dön
        </Button>
      </div>
    </div>
  )
}
