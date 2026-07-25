import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function AuthPage({ mode: initialMode }) {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState(initialMode || 'login')
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
      } else {
        await register(form.email, form.password, form.name)
      }
      navigate('/app/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h1>LocalAkademi</h1>
        <h2>{mode === 'login' ? 'Giriş yap' : 'Hesap oluştur'}</h2>

        <label>E-posta</label>
        <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="ornek@email.com" required />

        {mode === 'register' && (
          <>
            <label>Ad Soyad</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ad Soyad" required />
          </>
        )}

        <label>Şifre</label>
        <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />

        {error && <div className="alert alert-danger">{error}</div>}

        <button type="submit" className="btn">{mode === 'login' ? 'Giriş yap' : 'Kayıt ol'}</button>

        <a onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
        </a>
      </form>
    </div>
  )
}
