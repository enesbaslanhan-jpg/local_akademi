import { createContext } from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import WelcomePage from '@/pages/WelcomePage'
import MembershipSettings from '@/components/billing/MembershipSettings'
import FounderBadge from '@/components/billing/FounderBadge'
import MembershipModal from '@/components/billing/MembershipModal'
import {
  BILLING_STARTS_AT,
  kuruculUyeFiyati,
  kuruculIndirimYuzdesi,
  yillikTutar,
} from '@/config/billing'

/*
 * ÜYELİK EKRANLARI.
 *
 * Bu ekranların çoğu giriş ARKASINDA olduğu için tarayıcıda
 * doğrulanamıyor (parola girmek doğru olmaz). Kanıt buradan geliyor.
 *
 * Korunan sözleşmeler:
 *
 * 1. `BILLING_STARTS_AT` boşken kullanıcıya "ücret alınmıyor" DENİR.
 *    Fiyat gösterip susmak, bugün ödeme alınabileceğini ima ederdi.
 * 2. Kurucu Üye rozeti `membership.founder` false iken ÇİZİLMEZ ve
 *    oturum sağlayıcısı yokken SAYFAYI DÜŞÜRMEZ.
 * 3. Ödeme panelinde dönem değişince NİHAİ tutar değişir, bugün
 *    ödenecek tutar DEĞİŞMEZ.
 */

const mockAuth = vi.hoisted(() => ({ deger: { user: null } }))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuth.deger,
  AuthContext: createContext(null),
}))

function sar(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

afterEach(() => {
  cleanup()
  mockAuth.deger = { user: null }
})

describe('karşılama ekranı', () => {
  it('kurucu üye programını anlatır ve kart bilgisi İSTEMEZ', () => {
    sar(<WelcomePage />)

    expect(screen.getByRole('heading', { name: /hoş geldin/i })).toBeInTheDocument()

    /* 🔴 Ödeme alanı, kart formu ya da "öde" düğmesi OLMAMALI.
       Ürün sahibi kararı: ilk ay ücretsizken kart istemek vaatle
       doğrudan çelişir. */
    expect(screen.queryByText(/kart numaras/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /öde/i })).not.toBeInTheDocument()
  })

  it('atlanabilir: uygulamaya devam eden birincil eylem var', () => {
    sar(<WelcomePage />)
    expect(screen.getByRole('button', { name: /başla/i })).toBeInTheDocument()
  })

  it('ücretlendirme başlamadığını SÖYLER', () => {
    /* Bu test bugünkü yapılandırmaya bağlı ve bilerek öyle: config
       açıldığında düşmesi DOĞRU, çünkü o zaman metin de değişmeli. */
    expect(BILLING_STARTS_AT).toBeNull()
    sar(<WelcomePage />)
    expect(screen.getByRole('status')).toHaveTextContent(/başlamadı/i)
  })
})

describe('ayarlar → üyelik', () => {
  it('ücretlendirme başlamadıysa dürüst durum gösterir', () => {
    sar(<MembershipSettings membership={{ state: 'billing_not_started' }} />)

    expect(screen.getByText(/ücretsiz kullanım/i)).toBeInTheDocument()
    expect(screen.getByText(/henüz başlamadı/i)).toBeInTheDocument()
    /* Bu hâlde iptal/fatura düğmeleri hiç çizilmez: iptal edilecek
       bir üyelik yok. */
    expect(screen.queryByRole('button', { name: /iptal/i })).not.toBeInTheDocument()
  })

  it('üyelik aktifken indirim ORANSAL anlatılır, "kilitli fiyat" DEĞİL', () => {
    sar(<MembershipSettings membership={{ state: 'active', renewalPeriod: 'monthly' }} />)

    /* Metin yüzdeyi taşımalı. "Fiyatın hiç değişmez" demek, 28.08.2026
       kararından sonra yanlış beyan olurdu. */
    expect(screen.getByText(new RegExp(`%${kuruculIndirimYuzdesi()}`))).toBeInTheDocument()
  })

  it('iptal düğmesi GÖRÜNÜR — saklanmıyor', () => {
    sar(<MembershipSettings membership={{ state: 'active' }} />)

    const iptal = screen.getByRole('button', { name: /iptal/i })
    expect(iptal).toBeInTheDocument()
    /* Bugün devre dışı (uç yok) ama sebebini söyleyen bir not var:
       tıklanıp hiçbir şey yapmayan düğme, kullanıcıya iptal ettiğini
       sandırırdı. */
    expect(iptal).toBeDisabled()
    expect(screen.getByText(/etkinleştiğinde/i)).toBeInTheDocument()
  })
})

describe('kurucu üye rozeti', () => {
  it('founder false iken çizilmez', () => {
    mockAuth.deger = { user: { membership: { founder: false } } }
    const { container } = sar(<FounderBadge />)
    expect(container).toBeEmptyDOMElement()
  })

  it('oturum sağlayıcısı yokken SAYFAYI DÜŞÜRMEZ', () => {
    /* 🦷 Diş kontrolü: `useAuth()` kullanan sürüm burada fırlatıyordu
       ve Dashboard testlerini de düşürüyordu. Dekoratif bir rozet
       yüzünden sayfanın gitmesi orantısız. */
    const { container } = sar(<FounderBadge />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ödeme paneli', () => {
  it('dönem değişince NİHAİ tutar değişir, bugünkü tahsilat değişmez', async () => {
    const kullanici = userEvent.setup()
    sar(<MembershipModal open onClose={() => {}} />)

    const bugunSatiri = screen.getByText(/bugün ödenecek/i).parentElement
    const bugunOnce = bugunSatiri.textContent

    expect(screen.getByText(new RegExp(kuruculUyeFiyati().toLocaleString('tr-TR')))).toBeInTheDocument()

    await kullanici.click(screen.getByRole('radio', { name: /yıllık/i }))

    /* Nihai tutar yıllığa döner... */
    expect(
      screen.getByText(new RegExp(yillikTutar().toLocaleString('tr-TR').replace('.', '\\.'))),
    ).toBeInTheDocument()

    /* ...ama bugün ödenecek tutar AYNI kalır. Dönem seçimi 5. aydan
       itibaren geçerli; bugünkü tahsilat lansman ayının ücreti.
       Değişseydi kullanıcıdan henüz girmediği bir dönemin parası
       peşin alınmış olurdu. */
    expect(bugunSatiri.textContent).toBe(bugunOnce)
  })

  it('ücretlendirme başlamadan sebebi panelde yazılı', () => {
    sar(<MembershipModal open onClose={() => {}} />)

    /*
     * Not GÖRÜNÜR kalıyor: kullanıcıyı hataya tıklatmak yerine sebebi
     * önden söylemek doğrusu.
     *
     * ⚠️ Düğmenin devre dışı olduğu ARTIK SINANMIYOR ve bu bilinçli.
     * Gerçek kapı sunucuda: `/payments/checkout` ücretlendirme
     * kapalıyken 409 döner (`payments-paytr.test.ts`, "test kipi
     * kapısı"). Devre dışı bir düğme güvenlik sınırı değildir —
     * istemci kodu değiştirilebilir. Burada sınanan şey KULLANICIYA
     * NE SÖYLENDİĞİ.
     */
    expect(screen.getByText(/ödeme alınmıyor/i)).toBeInTheDocument()
  })

  /*
   * CAYMA FERAGATİ AYRI KUTUDA.
   *
   * Mesafeli Sözleşmeler Yönetmeliği, anında ifa edilen hizmetlerde
   * cayma hakkı istisnasını tüketicinin AYRI ve AÇIK onayına
   * bağlıyor. Feragati genel "koşulları kabul ediyorum" kutusuna
   * gömmek istisnanın dayanağını ortadan kaldırır — tek kutuyla
   * alınan feragat geçersiz sayılır.
   *
   * ÜÇÜNCÜ KUTU: kart saklama ve otomatik tahsilat (30.08.2026
   * kararı). Tekrarlayan tahsilat için kartın ödeme kuruluşunda
   * saklanması gerekiyor; bu, sözleşmeyi okumaktan da feragatten de
   * ayrı bir izin ve ayrı kutuda alınıyor.
   *
   * 🦷 Bu testler tam olarak o tasarımı koruyor: kutular birleştirilir
   * ya da CTA onaylardan bağımsız hâle gelirse düşerler.
   */
  it('üç AYRI onay kutusu var — hiçbiri genel onaya gömülmemiş', () => {
    sar(<MembershipModal open onClose={() => {}} />)

    const kutular = screen.getAllByRole('checkbox')
    expect(kutular).toHaveLength(3)

    /* İkincisi yalnız feragati, üçüncüsü yalnız otomatik tahsilatı
       anlatmalı — metinler ayrışırsa kutular da anlamını yitirir. */
    expect(screen.getByText(/cayma hakkımı kaybedeceğimi biliyorum/i)).toBeInTheDocument()
    expect(screen.getByText(/kayıtlı kartımdan otomatik tahsil edilmesini kabul ediyorum/i)).toBeInTheDocument()
  })

  it('onaylar işaretlenmeden ödeme düğmesi açılmaz', async () => {
    const kullanici = userEvent.setup()
    /* `demoBasari` ödeme akışı engelini kaldırıyor ki sınanan tek şey
       ONAY kapısı olsun. */
    sar(<MembershipModal open onClose={() => {}} demoBasari />)

    const dugme = screen.getByRole('button', { name: /öde ve üyeliği başlat/i })
    const [sozlesme, feragat, tahsilat] = screen.getAllByRole('checkbox')

    expect(dugme).toBeDisabled()

    await kullanici.click(sozlesme)
    expect(dugme, 'yalnız sözleşme onayı yetmez').toBeDisabled()

    await kullanici.click(feragat)
    expect(dugme, 'sözleşme + feragat de yetmez — tahsilat izni ayrı').toBeDisabled()

    await kullanici.click(tahsilat)
    expect(dugme, 'üç onay birden verilince açılır').toBeEnabled()
  })

  it('ödeme paneli ticari belgelere bağlantı veriyor', () => {
    sar(<MembershipModal open onClose={() => {}} />)

    const hedefler = screen.getAllByRole('link').map(a => a.getAttribute('href'))
    expect(hedefler).toContain('/mesafeli-satis')
    expect(hedefler).toContain('/on-bilgilendirme')
    expect(hedefler).toContain('/terms')
  })
})
