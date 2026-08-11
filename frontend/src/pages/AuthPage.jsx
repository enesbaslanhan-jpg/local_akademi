import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import BrandMark from '@/components/ui/BrandMark'

export default function AuthPage({ mode: initialMode }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState(initialMode || 'login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      if (mode === 'login') await login(form.email, form.password)
      else await register(form.email, form.password, form.name)
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-ambient auth-ambient-left" aria-hidden="true" />
      <div className="auth-ambient auth-ambient-right" aria-hidden="true" />

      <div className="auth-glass-frame">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form-brand" aria-hidden="true">
            <BrandMark size={44} />
            <span>LocalKarar</span>
          </div>
          <h1 className="sr-only">LocalKarar — {mode === 'login' ? 'Giriş yap' : 'Hesap oluştur'}</h1>
          <h2>{mode === 'login' ? 'Giriş yap' : 'Hesap oluştur'}</h2>
          <p className="auth-form-intro">
            {mode === 'login' ? 'İşletme paneline güvenle devam et.' : 'Kararlarını tek merkezden yönetmeye başla.'}
          </p>

          <label className="auth-field">
            <span>E-posta</span>
            <span className="auth-input-shell">
              <Mail size={19} aria-hidden="true" />
              <input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="mail@gmail.com" required />
            </span>
          </label>

          {mode === 'register' && (
            <label className="auth-field">
              <span>Ad Soyad</span>
              <span className="auth-input-shell">
                <UserRound size={19} aria-hidden="true" />
                <input type="text" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Ad Soyad" required />
              </span>
            </label>
          )}

          <label className="auth-field">
            <span>Şifre</span>
            <span className="auth-input-shell">
              <LockKeyhole size={19} aria-hidden="true" />
              <input type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="••••••••" required />
            </span>
          </label>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" className="btn btn-cta">{mode === 'login' ? 'Giriş yap' : 'Kayıt ol'}</button>
          <button type="button" className="auth-mode-switch" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
          </button>
          <div className="auth-legal-links" aria-label="Yasal belgeler">
            <Link to="/privacy">Gizlilik</Link>
            <Link to="/terms">Kullanım koşulları</Link>
            <Link to="/cookies">Çerezler</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
