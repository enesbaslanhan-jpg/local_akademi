import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import Loading from '@/components/ui/Loading'

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return <Loading fullPage text="Kontrol ediliyor..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    if (!allowedRoles.includes(user?.role) && user?.role !== 'admin') {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return children || <Outlet />
}
