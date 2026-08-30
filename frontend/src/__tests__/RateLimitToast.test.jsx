import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { ToastProvider } from '@/context/ToastContext'
import { RATE_LIMIT_EVENT, ERROR_CODES } from '@/services/api'

describe('global 429 bildirimi', () => {
  it('SPA içeriğini kaldırmadan kontrollü mesaj ve kalan süreyi gösterir', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ToastProvider>
          <main>Uygulama içeriği</main>
        </ToastProvider>
      </I18nextProvider>
    )

    window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT, {
      detail: { code: ERROR_CODES.RATE_LIMIT, retryAfterSeconds: 12 }
    }))

    expect(screen.getByText('Uygulama içeriği')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('12')
    expect(screen.getByRole('alert')).toHaveTextContent('saniye')
  })
})
