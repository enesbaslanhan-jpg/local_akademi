import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/layout/ProtectedRoute'

const session = vi.hoisted(() => ({ isAuthenticated: false, loading: false, user: null }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => session }))
afterEach(() => cleanup())

function openAdmin() {
  render(<MemoryRouter initialEntries={['/admin/audit-logs']}><Routes>
    <Route element={<ProtectedRoute requiredRole="admin" />}>
      <Route path="/admin/audit-logs" element={<div>Denetim ekranı</div>} />
    </Route>
    <Route path="/login" element={<div>Giriş ekranı</div>} />
    <Route path="/unauthorized" element={<div>Yetki yok</div>} />
  </Routes></MemoryRouter>)
}

describe('admin document session guard', () => {
  it('an expired/missing session goes to login instead of raw JSON', () => {
    Object.assign(session, { isAuthenticated: false, loading: false, user: null })
    openAdmin()
    expect(screen.getByText('Giriş ekranı')).toBeInTheDocument()
  })
  it('a non-admin cannot display the admin page', () => {
    Object.assign(session, { isAuthenticated: true, loading: false, user: { role: 'learner' } })
    openAdmin()
    expect(screen.getByText('Yetki yok')).toBeInTheDocument()
  })
  it('an admin can display the requested page', () => {
    Object.assign(session, { isAuthenticated: true, loading: false, user: { role: 'admin' } })
    openAdmin()
    expect(screen.getByText('Denetim ekranı')).toBeInTheDocument()
  })
})
