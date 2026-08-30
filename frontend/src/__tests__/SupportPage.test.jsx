import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import SupportPage from '@/pages/SupportPage'

/*
 * /yardim testleri: kullanma kılavuzu bölümü ve konu türü seçimi.
 *
 * Konu türü sunucuya GİTMEZ; yalnızca serbest metin `konu` alanını
 * ön doldurur (arka uç şeması değişmedi).
 */

const mocks = vi.hoisted(() => ({
  destekTalebi: vi.fn()
}))

vi.mock('@/services/api', () => ({
  api: {
    auth: {
      destekTalebi: mocks.destekTalebi
    }
  }
}))

function ciz() {
  return render(
    <MemoryRouter>
      <SupportPage />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.destekTalebi.mockResolvedValue({ success: true })
})

describe('SupportPage — kullanma kılavuzu', () => {
  it('beş ana akışı sırayla listeler', () => {
    ciz()
    expect(screen.getByRole('heading', { name: 'Kullanma kılavuzu' })).toBeInTheDocument()
    expect(screen.getByText('1. İşletmeni oluştur')).toBeInTheDocument()
    expect(screen.getByText('2. Kayıt ekle')).toBeInTheDocument()
    expect(screen.getByText('3. Belge yükle')).toBeInTheDocument()
    expect(screen.getByText('4. Pazaryeri mağazanı bağla')).toBeInTheDocument()
    expect(screen.getByText('5. Mentora sor')).toBeInTheDocument()
  })

  /* Kılavuz gerçek arayüzü anlatır: bağlanabilir dört sağlayıcı;
     WooCommerce katalogdan çıktığı için hiç geçmez, Amazon ise
     yalnızca "hazırlanıyor" olarak. */
  it('pazaryeri adımını çalışan sağlayıcılarla anlatır', () => {
    ciz()
    const pazaryeriAkisi = screen.getByText('4. Pazaryeri mağazanı bağla').closest('li')
    expect(pazaryeriAkisi.textContent).toContain('Trendyol')
    expect(pazaryeriAkisi.textContent).toContain('Shopify')
    expect(pazaryeriAkisi.textContent).toContain('Amazon hazırlanıyor')
    expect(pazaryeriAkisi.textContent).not.toContain('WooCommerce')
  })

  it('modül betimlerini Hakkında sayfasındaki anlatımlardan alır', () => {
    ciz()
    /* AI Mentor betimi AboutPage MODULLER'deki cümlenin aynısı. */
    expect(screen.getByText(/Takıldığın yeri sorarsın\. Kurs içeriğine ve kurduysan kendi işletme rakamlarına bakarak cevap verir/)).toBeInTheDocument()
  })
})

describe('SupportPage — konu türü seçimi', () => {
  it('seçim “Konu” alanını ön doldurur', () => {
    ciz()
    fireEvent.change(screen.getByLabelText('Konunuz ne hakkında?'), { target: { value: 'sorun' } })
    expect(screen.getByLabelText('Konu')).toHaveValue('Sorun bildirimi')
  })

  it('ön doldurulan metnin üzerine yazılabilir', async () => {
    const user = userEvent.setup()
    ciz()
    fireEvent.change(screen.getByLabelText('Konunuz ne hakkında?'), { target: { value: 'soru' } })
    const konu = screen.getByLabelText('Konu')
    await user.clear(konu)
    await user.type(konu, 'Fatura okunmuyor')
    expect(konu).toHaveValue('Fatura okunmuyor')
  })

  it('gönderimde konu alanı sunucuya gider, tür seçimi gitmez', async () => {
    const user = userEvent.setup()
    ciz()
    fireEvent.change(screen.getByLabelText('Konunuz ne hakkında?'), { target: { value: 'geri-bildirim' } })
    await user.type(screen.getByLabelText('Adınız'), 'Ayşe Yılmaz')
    await user.type(screen.getByLabelText('E-posta adresiniz'), 'ayse@ornek.com')
    await user.type(screen.getByLabelText(/Mesajınız/), 'Geri bildirim: ekranlar çok hızlı açılıyor, teşekkürler.')
    await user.click(screen.getByRole('button', { name: /Gönder/ }))

    await waitFor(() => expect(mocks.destekTalebi).toHaveBeenCalledTimes(1))
    const govde = mocks.destekTalebi.mock.calls[0][0]
    expect(govde.konu).toBe('Geri bildirim')
    expect(govde.konuTuru).toBeUndefined()
  })
})
