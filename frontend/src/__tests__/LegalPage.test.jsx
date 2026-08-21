import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/*
 * Yasal metinlerde sessizce bozulabilecek üç şey var; üçü de burada.
 *
 *   1. TARİH. Sayfa sürümü API'den okuyor. Önceden elle yazılıydı ve
 *      metin güncellenince eski tarihi göstermeye devam ederdi — onay
 *      kaydı ile gösterilen metnin ayrışması KVKK açısından onayın
 *      kanıtlanabilirliğini zedeler. Biri tarihi tekrar sabitlerse bu
 *      test düşer.
 *
 *   2. İÇİNDEKİLER ÇAPALARI. Bağlantı hedefi ile bölüm kimliği
 *      ayrışırsa tıklayan hiçbir yere gitmez. Gözle fark edilmez.
 *
 *   3. AKTARIM TABLOSU. Aydınlatma metninde yurt dışına aktarılan
 *      alıcıların adı geçmek ZORUNDA. Bir alıcı metinden düşerse
 *      metin eksik beyan hâline gelir.
 */

const getLegalDocuments = vi.fn()
vi.mock('@/services/api', () => ({
  api: { auth: { getLegalDocuments: () => getLegalDocuments() } }
}))

const { default: LegalPage } = await import('@/pages/LegalPage')

function ciz(type) {
  return render(<MemoryRouter><LegalPage type={type} /></MemoryRouter>)
}

describe('LegalPage', () => {
  beforeEach(() => {
    getLegalDocuments.mockReset()
    getLegalDocuments.mockResolvedValue({
      documents: [
        { type: 'privacy', title: 'Gizlilik', version: '2030-01-15' },
        { type: 'terms', title: 'Koşullar', version: '2030-01-15' },
        { type: 'cookies', title: 'Çerezler', version: '2030-01-15' }
      ]
    })
  })

  it('yürürlük tarihini API sürümünden türetir, sabit yazmaz', async () => {
    ciz('privacy')
    /* Uydurma bir tarih verildi; sayfada onun görünmesi, tarihin
       gerçekten API'den geldiğini kanıtlar. */
    await waitFor(() =>
      expect(screen.getByText(/15 Ocak 2030/)).toBeInTheDocument()
    )
  })

  it('API yanıt vermezse tarih GÖSTERMEZ — yanlış tarih göstermez', async () => {
    getLegalDocuments.mockRejectedValue(new Error('ağ hatası'))
    ciz('privacy')
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument())
    expect(screen.queryByText(/Yürürlük tarihi/)).not.toBeInTheDocument()
  })

  it.each(['privacy', 'terms', 'cookies'])(
    '%s: içindekiler bağlantılarının hepsi var olan bir bölüme gider',
    async type => {
      const { container } = ciz(type)
      const baglantilar = [...container.querySelectorAll('nav[aria-label="İçindekiler"] a')]
      expect(baglantilar.length).toBeGreaterThan(3)

      const bolumKimlikleri = [...container.querySelectorAll('article section')].map(s => s.id)
      const kirik = baglantilar
        .map(a => a.getAttribute('href').slice(1))
        .filter(hedef => !bolumKimlikleri.includes(hedef))

      expect(kirik).toEqual([])
      expect(baglantilar.length).toBe(bolumKimlikleri.length)
    }
  )

  it('aydınlatma metni yurt dışına aktarılan alıcıların HEPSİNİ adlandırır', () => {
    ciz('privacy')
    for (const alici of ['OVH', 'Mistral', 'Resend', 'Cloudflare']) {
      expect(screen.getAllByText(new RegExp(alici)).length).toBeGreaterThan(0)
    }
    /* Ülke adları da geçmeli — "yurt dışı" demek yeterli değil. */
    expect(screen.getAllByText(/Fransa/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/İrlanda/).length).toBeGreaterThan(0)
  })

  it('çerez politikası, çerez KULLANILMADIĞINI söyler', () => {
    ciz('cookies')
    expect(screen.getAllByText(/çerez kullanmaz|Çerez kullanılmıyor/i).length).toBeGreaterThan(0)
  })
})
