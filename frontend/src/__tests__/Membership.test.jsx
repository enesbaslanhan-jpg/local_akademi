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
       kararından sonra yanlış beyan olurdu.

       ⚠️ `getAllByText`: ekran tek düzene indirilince (31.08.2026)
       oran İKİ yerde geçer oldu — aşama listesindeki nihai aşama ve
       altındaki oransal not. `getByText` "birden çok eşleşme" diye
       düşüyordu; korunan şey sayı değil, oranın YAZILI OLMASI. */
    expect(screen.getAllByText(new RegExp(`%${kuruculIndirimYuzdesi()}`)).length).toBeGreaterThan(0)
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
  /*
   * 🔴 KAMPANYA BOYUNCA DÖNEM SEÇİMİ YOK (ürün sahibi kararı,
   * 31.08.2026).
   *
   * Önceki sürümde panelde aylık/yıllık seçici vardı ve bu test onu
   * koruyordu. Sorun şuydu: yıllık tutar (₺2.990) kampanyadan SONRA,
   * 5. ayda başlıyordu; kampanyanın içinde gösterilince aylıkla
   * karşılaştırılamıyordu. Ölçüldü: aylık seçen ilk 12 ayda ₺2.839,
   * yıllık seçen ₺3.437 ödüyordu — çünkü yıllık 16. aya kadar
   * kapsıyordu. Ürün sahibi haklı olarak "rakamlar yanlış" dedi.
   *
   * 🦷 Bu test artık seçicinin GERİ GELMEMESİNİ koruyor.
   */
  it('dönem seçici GÖSTERİLMİYOR ve tutarlar aylık', () => {
    sar(<MembershipModal open onClose={() => {}} />)

    expect(screen.queryByRole('radio', { name: /yıllık/i })).toBeNull()
    expect(screen.queryByRole('radio', { name: /aylık/i })).toBeNull()

    /* Yıllık tutar panelde hiç geçmemeli. */
    expect(
      screen.queryByText(new RegExp(yillikTutar().toLocaleString('tr-TR').replace('.', '\.'))),
    ).toBeNull()

    /* Nihai aşama aylık fiyatla anlatılıyor. */
    expect(screen.getByText(new RegExp(kuruculUyeFiyati().toLocaleString('tr-TR')))).toBeInTheDocument()
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

  /*
   * 🔴 BELGELER PANELDEN ÇIKMADAN OKUNUYOR (31.08.2026).
   *
   * Önceden `target="_blank"` bağlantılardı ve ürün sahibi bildirdi:
   * "metinleri okuyup geri dönünce sayfa gidiyor, içinde açılması
   * gerek değil mi". Onaylar panelin durumunda; metni okumak için
   * paneli terk etmek, işaretlenmiş üç kutuyu kaybetmekti.
   *
   * Test artık ADRES değil ERİŞİM sınıyor: belgeye ulaşan bir eylem
   * var mı, ve metin PANELİN İÇİNDE mi açılıyor. Adrese çakılı bir
   * test, doğru çalışan bu akış yüzünden düşerdi.
   */
  it('ödeme paneli ticari belgelere erişim veriyor', async () => {
    const kullanici = userEvent.setup()
    sar(<MembershipModal open onClose={() => {}} />)

    for (const ad of [/mesafeli hizmet/i, /ön bilgilendirme/i, /kullanım koşulları/i]) {
      expect(screen.getByRole('button', { name: ad }), `${ad} erişilebilir olmalı`).toBeInTheDocument()
    }

    await kullanici.click(screen.getByRole('button', { name: /mesafeli hizmet/i }))

    /* 🦷 Metin panelden ÇIKMADAN açılmalı: ödeme paneli hâlâ ekranda. */
    expect(screen.getByText(/öde ve üyeliği başlat/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('link').map(a => a.getAttribute('href')))
      .not.toContain('/mesafeli-satis')
  })
})

/*
 * ÖDEME GİRİŞ NOKTASI.
 *
 * 🔴 ÖLÇÜLEN EKSİK (ürün sahibi, 31.08.2026): "üye ol senaryosunu
 * nerden başlatacağım, fiyatlarda yok, üyelik ve faturalandırmada da
 * yok, ben çözemedim."
 *
 * Haklıydı — arayüzde o düğme HİÇ YOKTU. Test ödemesi tarayıcı
 * konsolundan `/payments/checkout` çağrılarak yapılmıştı.
 *
 * `membership.testCheckout` sunucudan geliyor ve `/checkout`taki
 * kapının aynısını taşıyor (PayTR test kipi + admin). Ön yüzde tahmin
 * etseydik çalışmayacak bir düğme gösterirdik.
 *
 * 🦷 Bu testler iki yönü de koruyor: yöneticiye görünüyor, normal
 * kullanıcıya GÖRÜNMÜYOR. İkincisi olmadan bu bir üretim deliği olurdu.
 */
describe('ödeme giriş noktası', () => {
  const denemeMetni = /ödeme akışını dene/i

  it('🦷 testCheckout DOĞRUYKEN deneme düğmesi görünüyor', () => {
    sar(<MembershipSettings membership={{ state: 'billing_not_started', testCheckout: true }} />)
    expect(screen.getByRole('button', { name: denemeMetni })).toBeInTheDocument()
  })

  it('🦷 testCheckout YOKKEN düğme HİÇ çizilmiyor', () => {
    /* Normal kullanıcının gördüğü hâl: sunucu bayrağı göndermiyor. */
    sar(<MembershipSettings membership={{ state: 'billing_not_started' }} />)
    expect(screen.queryByRole('button', { name: denemeMetni })).toBeNull()
  })

  it('düğme ödeme panelini AÇIYOR', async () => {
    const kullanici = userEvent.setup()
    sar(<MembershipSettings membership={{ state: 'billing_not_started', testCheckout: true }} />)

    await kullanici.click(screen.getByRole('button', { name: denemeMetni }))

    /* Panelin açıldığının kanıtı: üç onay kutusu ekranda. */
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })

  it('ücretlendirme kapalıyken bölüm ÇIKMAZ değil — sırada ne var yazılı', () => {
    sar(<MembershipSettings membership={{ state: 'billing_not_started' }} />)

    /* Eski hâli iki satır + tek bağlantıydı; kullanıcı Fiyatlar ↔
       Ayarlar arasında dönüp duruyordu. */
    expect(screen.getByText(/ücretlendirme başladığında/i)).toBeInTheDocument()
    expect(screen.getByText(/haber vereceğiz/i)).toBeInTheDocument()
  })
})

/*
 * ÜST ÜSTE PENCERELER — ESCAPE YALNIZ EN ÜSTTEKİNİ KAPATIR.
 *
 * 🔴 ÖLÇÜLEN ARIZA (31.08.2026). Her `Modal` Escape dinleyicisini
 * `document`e bağlıyordu. Ödeme panelinin üstünde yasal metin
 * açıkken tek bir Escape İKİSİNİ BİRDEN kapatıyordu: kullanıcı
 * metni kapatmak isterken işaretlediği üç onayı da kaybediyordu.
 *
 * Bu, ürün sahibinin "metinleri okuyup geri dönünce sayfa gidiyor"
 * şikâyetinin metni panelin içine aldıktan sonraki hâli olurdu —
 * yani sorunu çözerken yerine yenisini koymak.
 */
describe('yasal metin panelin içinde', () => {
  it('🦷 Escape ÜSTTEKİ metni kapatır, ödeme panelini AYAKTA bırakır', async () => {
    const kullanici = userEvent.setup()
    sar(<MembershipModal open onClose={() => {}} />)

    /* Onaylar işaretleniyor: kaybolup kaybolmadıkları ölçülecek. */
    for (const kutu of screen.getAllByRole('checkbox')) await kullanici.click(kutu)

    await kullanici.click(screen.getByRole('button', { name: /mesafeli hizmet/i }))
    expect(screen.getAllByRole('dialog')).toHaveLength(2)

    await kullanici.keyboard('{Escape}')

    const kalan = screen.getAllByRole('dialog')
    expect(kalan, 'yalnız üstteki kapanmalı').toHaveLength(1)
    /* 🔴 Asıl korunan şey bu: onaylar duruyor. */
    for (const kutu of screen.getAllByRole('checkbox')) expect(kutu).toBeChecked()
  })
})

/*
 * 🔴 PENCERE KAPANINCA SAYFA YENİDEN KAYDIRILABİLMELİ.
 *
 * ÖLÇÜLEN ARIZA (01.09.2026) ve ürün sahibi yakaladı: "sayfalar
 * aşağı yukarı oynamıyor". Hiçbir pencere açık olmadığı hâlde
 * `body.style.overflow` `hidden` takılı kalıyordu.
 *
 * Sebep: her `Modal` açılıştaki `overflow` değerini KENDİ içinde
 * saklıyordu. Tek pencere varken bu hep `''` oluyor ve sorun
 * görünmüyordu. Yasal metin ödeme panelinin YANINA konunca iki
 * pencere birden açılabilir hâle geldi; araya bir yeniden çizim
 * girdiğinde React önce bütün temizlikleri sonra bütün etkileri
 * çalıştırdığı için, dıştaki pencere içtekinin bıraktığı `hidden`ı
 * yakalıyor ve kapanırken geri yazıyordu.
 *
 * 🦷 Bu test tam o sırayı kuruyor: iki pencere aç, üsttekini kapat,
 * alttakini kapat, sayfanın serbest kaldığını doğrula.
 */
describe('pencere kapanınca sayfa kaydırması', () => {
  it('🦷 iki pencere açılıp kapandıktan sonra body serbest kalıyor', async () => {
    const kullanici = userEvent.setup()
    const baslangic = document.body.style.overflow

    const { unmount } = sar(<MembershipModal open onClose={() => {}} />)

    expect(document.body.style.overflow, 'panel açıkken kilitli').toBe('hidden')

    await kullanici.click(screen.getByRole('button', { name: /mesafeli hizmet/i }))
    expect(document.body.style.overflow, 'iki pencere açıkken kilitli').toBe('hidden')

    await kullanici.keyboard('{Escape}')
    /* Alttaki panel HÂLÂ açık: kilit sürmeli, yoksa sayfa panelin
       arkasından kaydırılırdı. */
    expect(document.body.style.overflow, 'panel duruyorken kilit sürmeli').toBe('hidden')

    unmount()

    expect(document.body.style.overflow, 'hiçbir pencere yokken serbest').toBe(baslangic)
  })
})
