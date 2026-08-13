import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '@/services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)

  useEffect(() => {
    if (token) {
      api.auth.me()
        .then(data => {
          setUser(data)
          setOnboardingCompleted(data.onboardingCompleted ?? true)
        })
        .catch(() => {
          localStorage.removeItem('token')
          setToken('')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = useCallback(async (email, password) => {
    const data = await api.auth.login(email, password)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    setOnboardingCompleted(data.user.onboardingCompleted ?? true)
    return data
  }, [])

  const register = useCallback(async (email, password, name) => {
    const data = await api.auth.register(email, password, name)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    setOnboardingCompleted(data.user.onboardingCompleted ?? true)
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken('')
    setUser(null)
  }, [])

  const replaceSession = useCallback(({ token: nextToken, user: nextUser }) => {
    localStorage.setItem('token', nextToken)
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
