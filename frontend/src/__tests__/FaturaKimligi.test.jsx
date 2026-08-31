import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BillingProfileForm, { formDoldu } from '@/components/billing/BillingProfileForm'
import MembershipModal from '@/components/billing/MembershipModal'

/*
 * FATURA KİMLİK FORMU.
 *
 * 🔴 ÖLÇÜLEN EKSİK: ödeme çalışıyordu ama fatura kesilebilecek hiçbir
 * bilgi toplanmıyordu — PayTR'ye `user_address` ve `user_phone`
 * olarak "Belirtilmedi" gidiyordu.
 *
 * Ürün sahibi kararları (31.08.2026):
 *   - Form ödeme panelinin İÇİNDE, karttan önceki adım.
 *   - Bireysel alıcıda TCKN İSTEĞE BAĞLI.
 *
 * ⚠️ Sağlama (TCKN/VKN doğruluğu) BURADA sınanmıyor ve sınanmamalı:
 * doğrulamanın otoritesi sunucu (`tests/fatura-kimlik.test.ts`).
 * Aynı kuralı iki dilde iki kez yazmak, ikisinin sessizce ayrışması
 * demek olurdu. Burada sınanan şey AKIŞ ve kullanıcıya ne söylendiği.
 */

const sahteApi = vi.hoisted(() => ({
  faturaKimligiOku: vi.fn(),
  faturaKimligiYaz: vi.fn(),
  checkout: vi.fn(),
}))

vi.mock('@/services/api', () => ({
  api: { payments: sahteApi },
  ApiError: class extends Error {},
}))

function sar(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const TAM = {
  tip: 'INDIVIDUAL',
  unvan: 'Ayşe Yılmaz',
  tckn: '',
  vkn: '',
  vergiDairesi: '',
  telefon: '5321112233',
  adres: 'Atatürk Caddesi No 12',
  il: 'İstanbul',
  ilce: 'Kadıköy',
}

beforeEach(() => {
  sahteApi.faturaKimligiOku.mockResolvedValue({ faturaKimligi: null })
  sahteApi.faturaKimligiYaz.mockResolvedValue({ ok: true })
  sahteApi.checkout.mockResolvedValue({ iframeUrl: 'https://www.paytr.com/odeme/guvenli/JETON' })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('form doluluk kuralı', () => {
  it('🔴 bireyselde TCKN BOŞKEN form dolu sayılıyor', () => {
    /* Ürün sahibi kararı: isteğe bağlı. Zorunlu yapsaydık her
       alıcıdan kimlik numarası istemiş olurduk. */
    expect(formDoldu(TAM)).toBe(true)
  })

  it('kurumsalda VKN ve vergi dairesi olmadan dolu SAYILMIYOR', () => {
    const kurumsal = { ...TAM, tip: 'CORPORATE' }
    expect(formDoldu(kurumsal)).toBe(false)
    expect(formDoldu({ ...kurumsal, vkn: '1234567890', vergiDairesi: 'Kadıköy' })).toBe(true)
  })

  it('ortak alanlardan biri eksikse dolu sayılmıyor', () => {
    for (const alan of ['unvan', 'adres', 'il', 'ilce', 'telefon']) {
      expect(formDoldu({ ...TAM, [alan]: '' }), `${alan} eksikken`).toBe(false)
    }
  })
})

describe('fatura formu', () => {
  it('TCKN alanının İSTEĞE BAĞLI olduğu ekranda YAZILI', () => {
    sar(<BillingProfileForm onKaydedildi={() => {}} />)

    /* Yıldızsız bırakıp susmak, kullanıcıya zorunlu sandırırdı.

       ⚠️ `İ` (U+0130) `/i` bayrağıyla ASCII `i`ye KATLANMIYOR;
       `/isteğe/i` "İsteğe"yi bulmuyor. Bu tuzağa aynı oturumda ikinci
       kez düşüldü. */
    expect(screen.getByText(/[İi]steğe bağlı/)).toBeInTheDocument()
  })

  it('kurumsal seçilince VKN ve vergi dairesi beliriyor, TCKN kalkıyor', async () => {
    const kullanici = userEvent.setup()
    sar(<BillingProfileForm onKaydedildi={() => {}} />)

    expect(screen.queryByLabelText(/vergi kimlik/i)).toBeNull()

    await kullanici.click(screen.getByLabelText(/kurumsal/i))

    expect(screen.getByLabelText(/vergi kimlik/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/vergi dairesi/i)).toBeInTheDocument()
    /* Kurumsal faturada TCKN'nin işi yok; sunucu da atıyor. */
    expect(screen.queryByLabelText(/T\.C\. Kimlik/i)).toBeNull()
  })

  it('🦷 sunucunun ALAN ALAN hataları ilgili kutunun altında görünüyor', async () => {
    const kullanici = userEvent.setup()
    const hata = Object.assign(new Error('422'), {
      data: { hatalar: { adres: 'zorunlu', telefon: 'gecersiz' } },
    })
    sahteApi.faturaKimligiYaz.mockRejectedValueOnce(hata)

    sar(<BillingProfileForm baslangic={TAM} onKaydedildi={() => {}} />)
    await kullanici.click(screen.getByRole('button', { name: /kaydet/i }))

    /* Tek bir "form hatalı" mesajı hangi kutuyu düzelteceğini
       söylemez. */
    await waitFor(() => {
      expect(screen.getByLabelText(/adres/i)).toHaveAttribute('aria-invalid', 'true')
    })
    expect(screen.getByLabelText(/telefon/i)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/zorunlu/i)).toBeInTheDocument()
  })

  it('kullanıcı yazmaya başlayınca o alanın hatası kalkıyor', async () => {
    const kullanici = userEvent.setup()
    sahteApi.faturaKimligiYaz.mockRejectedValueOnce(
      Object.assign(new Error('422'), { data: { hatalar: { adres: 'zorunlu' } } }),
    )

    sar(<BillingProfileForm baslangic={TAM} onKaydedildi={() => {}} />)
    await kullanici.click(screen.getByRole('button', { name: /kaydet/i }))
    await waitFor(() => expect(screen.getByLabelText(/adres/i)).toHaveAttribute('aria-invalid', 'true'))

    await kullanici.type(screen.getByLabelText(/adres/i), 'x')

    /* Duran kırmızı yazı "hâlâ yanlış" diye okunuyor. */
    expect(screen.getByLabelText(/adres/i)).not.toHaveAttribute('aria-invalid')
  })
})

describe('ödeme paneli — fatura adımı', () => {
  const onaylariVer = async kullanici => {
    for (const kutu of screen.getAllByRole('checkbox')) await kullanici.click(kutu)
  }

  it('🦷 fatura bilgisi YOKKEN ödeme değil FORM açılıyor', async () => {
    const kullanici = userEvent.setup()
    sar(<MembershipModal open onClose={() => {}} />)
    await waitFor(() => expect(sahteApi.faturaKimligiOku).toHaveBeenCalled())

    await onaylariVer(kullanici)
    await kullanici.click(screen.getByRole('button', { name: /öde ve üyeliği başlat/i }))

    expect(await screen.findByText(/fatura tipi/i)).toBeInTheDocument()
    expect(sahteApi.checkout, 'fatura bilgisi yokken ödeme başlamamalı').not.toHaveBeenCalled()
  })

  it('form kaydedilince ödeme KENDİLİĞİNDEN başlıyor', async () => {
    const kullanici = userEvent.setup()
    sar(<MembershipModal open onClose={() => {}} />)
    await waitFor(() => expect(sahteApi.faturaKimligiOku).toHaveBeenCalled())

    await onaylariVer(kullanici)
    await kullanici.click(screen.getByRole('button', { name: /öde ve üyeliği başlat/i }))
    await screen.findByText(/fatura tipi/i)

    for (const [alan, deger] of [
      [/ad ve soyad/i, 'Ayşe Yılmaz'],
      [/telefon/i, '5321112233'],
      [/adres/i, 'Atatürk Caddesi No 12'],
      [/^İl$/, 'İstanbul'],
      [/İlçe/, 'Kadıköy'],
    ]) {
      await kullanici.type(screen.getByLabelText(alan), deger)
    }

    await kullanici.click(screen.getByRole('button', { name: /kaydet ve ödemeye geç/i }))

    /* Kullanıcı zaten "Öde ve üyeliği başlat"a bastı; araya ikinci
       bir onay koymak akışı gereksiz uzatırdı. */
    await waitFor(() => expect(sahteApi.checkout).toHaveBeenCalledTimes(1))
  })

  it('fatura bilgisi VARSA form hiç görünmüyor, doğrudan ödeme', async () => {
    sahteApi.faturaKimligiOku.mockResolvedValue({ faturaKimligi: TAM })
    const kullanici = userEvent.setup()
    sar(<MembershipModal open onClose={() => {}} />)
    await waitFor(() => expect(sahteApi.faturaKimligiOku).toHaveBeenCalled())

    await onaylariVer(kullanici)
    await kullanici.click(screen.getByRole('button', { name: /öde ve üyeliği başlat/i }))

    await waitFor(() => expect(sahteApi.checkout).toHaveBeenCalledTimes(1))
    expect(screen.queryByText(/fatura tipi/i), 'ikinci ödemede tekrar sorulmamalı').toBeNull()
  })
})
