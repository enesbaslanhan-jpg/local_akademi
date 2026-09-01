import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AuthContext } from '@/context/AuthContext'
import MembershipSettings from '@/components/billing/MembershipSettings'
import MembershipStrip from '@/components/billing/MembershipStrip'
import MembershipBanner from '@/components/layout/MembershipBanner'
import { uyelikSunumu, UYELIK_TONU } from '@/components/billing/uyelik-sunumu'

/*
 * ÜYELİK GÖRÜNÜRLÜĞÜ.
 *
 * 🔴 ÜRÜN SAHİBİNİN ÜÇ ŞİKÂYETİ (31.08.2026), üçü de ölçüldü ve
 * gerçekti:
 *
 *   1. "üyelik aktif diyelim tamam ama ben bunu nerde göreceğim,
 *      ana sayfada beliren hiçbir şey yok"
 *   2. "diğerleri de görünür olsun, şu an denemede mesela o belli olsun"
 *   3. "bu sayfaya erişmek çok zor, taa ayarlara gideceğim sonra
 *      üyeliğe gireceğim"
 *
 * 🔴 BİR KEZ YANLIŞ CEVAP VERDİM ve bu testler onu tekrarlamamak
 * için var: "ana sayfada rozet var" demiştim. Rozet
 * `membership.founder` false iken HİÇ çizilmiyor, `founder` da
 * `BILLING_STARTS_AT` null olduğu sürece HERKESTE false. Yani
 * bugünkü tek gerçek durumda ana sayfada hiçbir şey görünmüyordu.
 *
 * Bu yüzden aşağıdaki ilk test `billing_not_started`ı sınıyor:
 * şerit tam da bugünkü durumda görünmezse hiçbir işe yaramaz.
 */

/*
 * ⚠️ `vi.mock('@/context/AuthContext')` KULLANILMIYOR ve sebebi
 * ölçüldü: mock fabrikası dosyanın en üstüne taşınıyor, dolayısıyla
 * fabrikanın içinden dosya kapsamındaki bir değişkeni okumak
 * "Cannot access 'AuthContext' before initialization" ile düşüyor.
 * Gerçek bağlamı sağlayıcıyla beslemek hem çalışıyor hem de
 * bileşenin bağlamı gerçekten nasıl okuduğunu sınıyor.
 */
function sar(ui, uyelik) {
  return render(
    <AuthContext.Provider value={uyelik === undefined ? null : { user: { membership: uyelik } }}>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthContext.Provider>,
  )
}

afterEach(cleanup)

describe('ana sayfa üyelik şeridi', () => {
  it('🦷 BUGÜNKÜ durumda (billing_not_started) GÖRÜNÜYOR', () => {
    /* Rozetin düştüğü yer tam olarak burası. Şerit "ücretsiz
       kullanımda sessiz kalsın" diye yazılsaydı, ürün sahibi yine
       ana sayfada hiçbir şey görmezdi. */
    sar(<MembershipStrip />, { state: 'billing_not_started', founder: false })
    expect(screen.getByText(/ücretsiz kullanım/i)).toBeInTheDocument()
  })

  it('denemede KAÇ GÜN kaldığını yazıyor', () => {
    sar(<MembershipStrip />, { state: 'trial', trialDaysLeft: 12, founder: true })

    expect(screen.getByText(/deneme sürüyor/i)).toBeInTheDocument()
    expect(screen.getByText(/12 gün/i)).toBeInTheDocument()
  })

  it('üyelik ekranına DOĞRUDAN gidiyor — kısa yol bu', () => {
    sar(<MembershipStrip />, { state: 'trial', trialDaysLeft: 3 })

    /* Ürün sahibi "taa ayarlara gideceğim sonra üyeliğe gireceğim"
       dedi. Bağlantı doğrudan üyelik bölümünü açmalı; yalnız
       /app/settings'e gitmek aynı derdi bırakırdı. */
    const hedef = screen.getByRole('link').getAttribute('href')
    expect(hedef).toMatch(/\/app\/settings[?#].*uyelik/)
  })

  it('oturum yokken hiç çizilmiyor — boş yer tutmuyor', () => {
    const { container } = sar(<MembershipStrip />, undefined)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('üyelik ekranı — tek düzen, dört durum', () => {
  const durumlar = ['billing_not_started', 'trial', 'active', 'expired']

  it.each(durumlar)('%s durumunda ekran BOŞ DEĞİL ve durumu söylüyor', durum => {
    sar(<MembershipSettings membership={{ state: durum, trialDaysLeft: 5 }} />)

    /* Her durumda okunur bir başlık ve iki ölçü olmalı. Önceki hâlde
       `billing_not_started` bambaşka bir iskelete düşüyordu ve
       onaylanan tasarım hiçbirine uymuyordu. */
    /* ⚠️ `İ` (U+0130) `/i` bayrağıyla ASCII `i`ye KATLANMIYOR: JS'in
       basit büyük/küçük eşlemesi Türkçe noktalı büyük İ'yi tanımıyor.
       `/ilk tahsilat/i` bu yüzden "İlk tahsilat"ı bulamıyordu — test
       ilk yazıldığında tam olarak buna düştü. */
    expect(screen.getByText(/bugün ödediğin|aylık ücretin/i)).toBeInTheDocument()
    expect(screen.getByText(/sonraki tahsilat|[İi]lk tahsilat|erişimini açmak/i)).toBeInTheDocument()
  })

  it('🦷 ücretlendirme başlamamışken İPTAL kartı ÇİZİLMİYOR', () => {
    /* Olmayan bir üyeliği "iptal et" demek, üyelik varmış gibi
       gösterirdi. */
    sar(<MembershipSettings membership={{ state: 'billing_not_started' }} />)
    expect(screen.queryByRole('button', { name: /iptal/i })).toBeNull()
  })

  it('🦷 üyelik varken iptal GÖRÜNÜYOR ama DEVRE DIŞI', () => {
    sar(<MembershipSettings membership={{ state: 'active' }} />)

    const iptal = screen.getByRole('button', { name: /iptal/i })
    expect(iptal).toBeInTheDocument()
    /* Uçlar yok. Etkin bırakmak, kullanıcıya iptal ettiğini
       sandırırdı — sebep ekranda yazılı. */
    expect(iptal).toBeDisabled()
    expect(screen.getByText(/etkinleştiğinde/i)).toBeInTheDocument()
  })

  it('kurucu rozeti kararı SUNUCUDAN — founder false iken çizilmiyor', () => {
    sar(<MembershipSettings membership={{ state: 'active', founder: false }} />)

    /* ⚠️ Serbest arama YAPILMIYOR: "kurucu üye" ifadesi açıklama
       metinlerinde de geçiyor ("kurucu üye fiyatıyla devam
       ediyorsun"). Aranan şey ROZETİN KENDİSİ, yani tüm metni tam
       olarak rozet etiketi olan öge. */
    expect(screen.queryByText('Kurucu Üye')).toBeNull()

    sar(<MembershipSettings membership={{ state: 'active', founder: true }} />)
    expect(screen.getByText('Kurucu Üye')).toBeInTheDocument()
  })
})

describe('uyelikSunumu — saf eşleyici', () => {
  it('her durum bir ton taşıyor', () => {
    for (const durum of Object.keys(UYELIK_TONU)) {
      expect(uyelikSunumu({ state: durum }).ton).toBe(UYELIK_TONU[durum])
    }
  })

  it('bilinmeyen durum ÇÖKMÜYOR, sakin hâle düşüyor', () => {
    /* Sunucu ileride yeni bir durum eklerse arayüz beyaz ekran
       vermemeli. */
    expect(uyelikSunumu({ state: 'past_due' }).ton).toBe('sakin')
  })

  it('🦷 aktif üyede sonraki tahsilat tarihi UYDURULMUYOR', () => {
    /* Sunucu bugün `currentPeriodEnd` göndermiyor. Bir tarih
       uydurmak, kullanıcıya kartından ne zaman çekileceği konusunda
       yanlış gün söylemek olurdu. */
    expect(uyelikSunumu({ state: 'active' }).sag.deger).toBe('—')
    expect(uyelikSunumu({ state: 'active', currentPeriodEnd: '2026-10-01T00:00:00.000Z' }).sag.deger)
      .toMatch(/1 Eki/)
  })

  it('metin değil ANAHTAR dönüyor — çeviri json`da kalıyor', () => {
    const s = uyelikSunumu({ state: 'trial', trialDaysLeft: 4 })
    expect(s.baslik.anahtar).toMatch(/^billing\./)
    expect(s.alt.degerler).toEqual({ count: 4 })
  })

  /*
   * 🔴 `check-i18n` BU ANAHTARLARI GÖREMİYOR.
   *
   * Betik `t('...')` çağrılarını metinden tarıyor; burada anahtar
   * değişkenden geliyor (`t(s.baslik.anahtar)`), o yüzden "dynamic
   * i18n key" deyip geçiyor. Yani eksik bir anahtar betiği düşürmez;
   * kullanıcı ekranda ham anahtar metnini görür.
   *
   * Bu test o güvenceyi geri koyuyor: eşleyicinin döndürdüğü HER
   * anahtar iki dilde de bulunmalı.
   */
  it('🦷 döndürülen her anahtar tr ve en`de MEVCUT', async () => {
    const tr = (await import('@/i18n/locales/tr/common.json')).default
    const en = (await import('@/i18n/locales/en/common.json')).default

    const oku = (sozluk, anahtar) =>
      anahtar.split('.').reduce((o, p) => (o == null ? undefined : o[p]), sozluk)

    /* Çoğul anahtarlar json'da `_one`/`_other` olarak duruyor;
       i18next taban adı üzerinden çözüyor. İkisinden biri varsa
       anahtar mevcuttur. */
    const varMi = (sozluk, anahtar) =>
      oku(sozluk, anahtar) !== undefined ||
      oku(sozluk, `${anahtar}_other`) !== undefined

    const eksik = []
    for (const durum of [...Object.keys(UYELIK_TONU), 'past_due']) {
      const s = uyelikSunumu({ state: durum, trialDaysLeft: 3 })
      const anahtarlar = [
        s.baslik.anahtar, s.alt.anahtar,
        s.sol.etiket, s.sol.degerAnahtar,
        s.sag.etiket, s.sag.degerAnahtar,
        s.birincil.anahtar, s.planBaslik, s.planNotu, s.faturaNotu,
      ].filter(Boolean)

      for (const a of anahtarlar) {
        if (!varMi(tr, a)) eksik.push(`tr: ${a} (${durum})`)
        if (!varMi(en, a)) eksik.push(`en: ${a} (${durum})`)
      }
    }

    expect(eksik).toEqual([])
  })
})

/*
 * UYGULAMA KABUĞUNDAKİ ÜYELİK ŞERİDİ.
 *
 * 🔴 Bu şerit bugün YERELDE GÖRÜLEMİYOR: `BILLING_STARTS_AT` null
 * olduğu sürece sunucu herkese `showBanner: false` döndürüyor. Yani
 * tarayıcıda bakarak doğrulanamaz — kanıt buradan gelmek zorunda.
 *
 * Korunan iki karar (ürün sahibi, 31.08.2026):
 *   1. Süre dolunca kullanıcı uygulamada KALIR (salt okunur), üstte
 *      kaybolmayan bir şerit ödeme yolunu gösterir.
 *   2. O şerit KAPATILAMAZ — kullanıcının yazamamasının tek açıklaması.
 */
describe('kabuk üyelik şeridi', () => {
  it('showBanner false iken HİÇ çizilmiyor', () => {
    const { container } = sar(<MembershipBanner />, { state: 'trial', showBanner: false, trialDaysLeft: 20 })
    expect(container).toBeEmptyDOMElement()
  })

  it('deneme eşiğinde kalan günü yazıyor ve KAPATILABİLİYOR', () => {
    sar(<MembershipBanner />, { state: 'trial', showBanner: true, trialDaysLeft: 5 })

    expect(screen.getByText(/5 gün/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /kapat/i })).toBeInTheDocument()
  })

  it('🦷 süresi dolunca şerit var ve KAPATILAMIYOR', () => {
    sar(<MembershipBanner />, { state: 'expired', showBanner: true })

    expect(screen.getByText(/deneme süren doldu/i)).toBeInTheDocument()
    /* Kapatılabilir olsaydı, kapatan kullanıcı uygulamanın neden
       çalışmadığını bir daha hiçbir yerde göremezdi. */
    expect(screen.queryByRole('button', { name: /kapat/i })).toBeNull()
  })

  it('şerit ödeme panelini AÇIYOR — çıkmaz değil', async () => {
    const kullanici = userEvent.setup()
    sar(<MembershipBanner />, { state: 'expired', showBanner: true })

    await kullanici.click(screen.getByRole('button', { name: /üyeliği başlat/i }))

    /* Panelin açıldığının kanıtı: onay kutuları ekranda.

       ⚠️ İKİ kutu — üçüncüsü (kart saklama izni) 01.09.2026'da
       kaldırıldı, otomatik yenilemeden vazgeçildiği için. */
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })
})
