import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StorageNotice from './StorageNotice'

describe('StorageNotice', () => {
  beforeEach(() => window.localStorage.clear())

  it('login ekranında sabit bildirimi gizler', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <StorageNotice />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.queryByRole('note')).not.toBeInTheDocument()
    })
  })

  it('akış içindeki bildirimi kapatır ve tercihi saklar', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <StorageNotice inline />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Bildirimi kapat' }))

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(window.localStorage.getItem('localkarar-storage-notice-seen')).toBe('true')
  })
})
