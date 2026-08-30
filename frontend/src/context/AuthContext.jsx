import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api, oturumTokenleriniSil, oturumTokenleriniYaz } from '@/services/api'
import { useLocalization } from './LocalizationContext'

/*
 * Bağlamın KENDİSİ de dışa açık.
 *
 * Neredeyse her tüketici `useAuth()` kullanmalı: sağlayıcı yoksa
 * fırlatması doğru, çünkü oturum bilgisine gerçekten ihtiyaç duyan bir
 * ekranın sessizce boş çalışması hatayı gizler.
 *
 * İstisna DEKORATİF bileşenler (ör. `FounderBadge`): sağlayıcı yokken
 * çizilmemeleri gerekir, sayfayı düşürmeleri değil. Onlar bağlamı
 * doğrudan okuyup `null` durumunda kendilerini gizliyor.
 */
export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { setUiLanguage } = useLocalization()
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)

  useEffect(() => {
    if (token) {
      api.auth.me()
        .then(data => {
          setUser(data)
          if (['tr', 'en'].includes(data.uiLanguage)) setUiLanguage(data.uiLanguage)
          setOnboardingCompleted(data.onboardingCompleted ?? true)
        })
        .catch(() => {
          /* Buraya gelindiyse yenileme de basarisiz olmus demektir
             (api.request 401'de bir kez deniyor). */
          oturumTokenleriniSil()
          setToken('')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = useCallback(async (email, password) => {
    const data = await api.auth.login(email, password)
    oturumTokenleriniYaz(data.token, data.refreshToken)
    setToken(data.token)
    setUser(data.user)
    if (['tr', 'en'].includes(data.user.uiLanguage)) setUiLanguage(data.user.uiLanguage)
    setOnboardingCompleted(data.user.onboardingCompleted ?? true)
    return data
  }, [setUiLanguage])

  const register = useCallback(async (email, password, name, acceptedLegal) => {
    const data = await api.auth.register(email, password, name, acceptedLegal)
    oturumTokenleriniYaz(data.token, data.refreshToken)
    setToken(data.token)
    setUser(data.user)
    if (['tr', 'en'].includes(data.user.uiLanguage)) setUiLanguage(data.user.uiLanguage)
    setOnboardingCompleted(data.user.onboardingCompleted ?? true)
    return data
  }, [setUiLanguage])

  const logout = useCallback(() => {
    /*
     * Sunucudaki yenileme tokeni de iptal ediliyor. Yalniz yerel
     * depolamayi temizlemek yetmezdi: token 30 gun daha gecerli kalir
     * ve kopyalanmis olsaydi cikis yapmak hicbir sey degistirmezdi.
     *
     * Cevap BEKLENMIYOR - cikis, ag hatasi yuzunden takilmamali;
     * yereldeki tokenler her halukarda siliniyor.
     */
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) api.auth.logout(refreshToken).catch(() => {})
    oturumTokenleriniSil()
    setToken('')
    setUser(null)
  }, [])

  const replaceSession = useCallback(({ token: nextToken, refreshToken: nextRefresh, user: nextUser }) => {
    oturumTokenleriniYaz(nextToken, nextRefresh)
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const updateUser = useCallback(changes => {
    setUser(current => current ? { ...current, ...changes } : current)
  }, [])

  const completeOnboarding = useCallback(async () => {
    await api.onboarding.complete()
    setOnboardingCompleted(true)
  }, [])

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    onboardingCompleted,
    completeOnboarding,
    login,
    register,
    logout,
    replaceSession,
    updateUser
  }), [token, user, loading, onboardingCompleted, completeOnboarding, login, register, logout, replaceSession, updateUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export default AuthContext
