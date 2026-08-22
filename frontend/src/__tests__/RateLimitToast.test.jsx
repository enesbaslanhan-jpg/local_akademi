import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ToastProvider } from '@/context/ToastContext'
import { RATE_LIMIT_EVENT, RATE_LIMIT_MESSAGE } from '@/services/api'

describe('global 429 bildirimi', () => {
  it('SPA içeriğini kaldırmadan kontrollü mesaj ve kalan süreyi gösterir', async () => {
    render(
      <ToastProvider>
        <main>Uygulama içeriği</main>
      </ToastProvider>
    )

    window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT, {
      detail: { message: RATE_LIMIT_MESSAGE, retryAfterSeconds: 12 }
    }))

    expect(screen.getByText('Uygulama içeriği')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent(RATE_LIMIT_MESSAGE)
    expect(screen.getByRole('alert')).toHaveTextContent('12 saniye')
  })
})
