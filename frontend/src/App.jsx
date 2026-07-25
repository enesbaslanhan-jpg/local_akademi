import { Navigate } from 'react-router-dom'

export default function App() {
  const token = localStorage.getItem('token')
  return <Navigate to={token ? '/app/dashboard' : '/login'} replace />
}
