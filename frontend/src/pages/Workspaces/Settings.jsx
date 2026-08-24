import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import Button from '@/components/ui/Button'
import { Select, Input } from '@/components/ui'
import styles from './Settings.module.css'

const emptyProfile = {
  name: '',
  legalName: '',
  taxNumber: '',
  sector: '',
  city: '',
  businessStage: '',
  employeeCount: '',
  salesChannels: '',
  primaryGoal: '',
  challenges: '',
  monthlySales: '',
  monthlyExpenses: '',
  cashBalance: '',
  debtBalance: ''
}

const emptyPreferences = {
  timezone: 'Europe/Istanbul',
  locale: 'tr-TR',
  defaultCurrency: 'TRY',
  weekStartsOn: 1
}

function listToText(value) {
  return Array.isArray(value) ? value.join(', ') : ''
}

function textToList(value) {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function numberOrZero(value) {
  return value === '' ? 0 : Number(value)
}

export default function Settings() {
  const { workspaceId } = useParams()
  const { refreshActiveWorkspace } = useWorkspace()
  const [profile, setProfile] = useState(emptyProfile)
  const [preferences, setPreferences] = useState(emptyPreferences)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [inbox, setInbox] = useState(null)
  const [inboxIsleniyor, setInboxIsleniyor] = useState(false)
  const [gonderenler, setGonderenler] = useState([])
  const [yeniGonderen, setYeniGonderen] = useState('')
  const [yeniGonderenEtiket, setYeniGonderenEtiket] = useState('')
  const [gonderenIsleniyor, setGonderenIsleniyor] = useState(false)

  async function gonderenleriYukle() {
    try {
      setGonderenler((await api.workspace.inbox.senders(workspaceId)).gonderenler)
    } catch { setGonderenler([]) }
  }

  async function gonderenEkle() {
    setGonderenIsleniyor(true)
    try {
      await api.workspace.inbox.addSender(workspaceId, yeniGonderen.trim(), yeniGonderenEtiket.trim() || undefined)
      setYeniGonderen('')
      setYeniGonderenEtiket('')
      await gonderenleriYukle()
      setMsg({ type: 'success', text: 'Güvenilir gönderen eklendi.' })
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'Gönderen eklenemedi.' })
    } finally {
      setGonderenIsleniyor(false)
    }
  }

  async function gonderenSil(id, email) {
    /* Bu bir güvenlik ayarı: çıkarınca o adresten gelen postalar
       reddedilmeye başlar ve kullanıcı sebebini bilmeyebilir. */
    if (!window.confirm(`${email} adresinden gelen postalar artık KABUL EDİLMEYECEK. Devam edilsin mi?`)) return
    setGonderenIsleniyor(true)
    try {
      await api.workspace.inbox.removeSender(workspaceId, id)
      await gonderenleriYukle()
      setMsg({ type: 'success', text: 'Gönderen çıkarıldı.' })
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'Gönderen çıkarılamadı.' })
    } finally {
      setGonderenIsleniyor(false)
    }
  }

  async function inboxAc() {
    /* Adres zaten varsa bu bir YENİLEME: kullanıcıya ne olacağını
       söylemeden eskisini geçersiz kılmak sürpriz olurdu. */
    if (inbox?.acik && !window.confirm(
      'Yeni bir adres üretilecek ve şu anki adres ÇALIŞMAYI DURDURACAK. Devam edilsin mi?'
    )) return
    setInboxIsleniyor(true)
    try {
      setInbox({ ...(await api.workspace.inbox.enable(workspaceId)), kanalHazir: inbox?.kanalHazir })
      setMsg({ type: 'success', text: 'Gelen kutusu adresi hazır.' })
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Adres oluşturulamadı.' })
    } finally { setInboxIsleniyor(false) }
  }

  async function inboxKapat() {
    if (!window.confirm('Adres kapatılacak; bu adrese gönderilen postalar artık işlenmeyecek. Devam edilsin mi?')) return
    setInboxIsleniyor(true)
    try {
      setInbox({ ...(await api.workspace.inbox.disable(workspaceId)), kanalHazir: inbox?.kanalHazir })
      setMsg({ type: 'success', text: 'Gelen kutusu kapatıldı.' })
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'İşlem tamamlanamadı.' })
    } finally { setInboxIsleniyor(false) }
  }
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.workspace.get(workspaceId),
      api.workspace.settings.get(workspaceId),
      api.workspace.inbox.get(workspaceId).catch(() => null)
    ]).then(([workspace, settings, gelenKutusu]) => {
      setInbox(gelenKutusu)
      /* Liste yalnız kutu AÇIKKEN anlamlı; kapalıyken uç zaten boş
         döner ama gereksiz istek atmıyoruz. */
      if (gelenKutusu?.acik) gonderenleriYukle()
      setProfile({
        name: workspace.name || '',
        legalName: workspace.legalName || '',
        taxNumber: workspace.taxNumber || '',
        sector: workspace.sector || '',
        city: workspace.city || '',
        businessStage: workspace.businessStage || '',
        employeeCount: workspace.employeeCount ?? '',
        salesChannels: listToText(workspace.salesChannels),
        primaryGoal: workspace.primaryGoal || '',
        challenges: listToText(workspace.challenges),
        monthlySales: workspace.monthlySales ?? '',
        monthlyExpenses: workspace.monthlyExpenses ?? '',
        cashBalance: workspace.cashBalance ?? '',
        debtBalance: workspace.debtBalance ?? ''
      })
      setPreferences({
        timezone: settings.timezone,
        locale: settings.locale,
        defaultCurrency: settings.defaultCurrency,
        weekStartsOn: settings.weekStartsOn
      })
    }).catch(error => {
      setMsg({ type: 'error', text: error.message || 'İşletme bilgileri yüklenemedi.' })
    }).finally(() => setLoading(false))
  }, [workspaceId])

  async function saveProfile(event) {
    event.preventDefault()
    setSavingProfile(true)
    setMsg(null)
    try {
      await api.workspace.update(workspaceId, {
        name: profile.name.trim(),
        legalName: profile.legalName.trim() || null,
        taxNumber: profile.taxNumber.trim() || null,
        sector: profile.sector.trim(),
        city: profile.city.trim(),
        businessStage: profile.businessStage || null,
        employeeCount: profile.employeeCount === '' ? null : Number(profile.employeeCount),
        salesChannels: textToList(profile.salesChannels),
        primaryGoal: profile.primaryGoal.trim() || null,
        challenges: textToList(profile.challenges),
        monthlySales: numberOrZero(profile.monthlySales),
        monthlyExpenses: numberOrZero(profile.monthlyExpenses),
        cashBalance: numberOrZero(profile.cashBalance),
        debtBalance: numberOrZero(profile.debtBalance)
      })
      await refreshActiveWorkspace()
      setMsg({ type: 'success', text: 'İşletme bilgileri kaydedildi.' })
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'İşletme bilgileri kaydedilemedi.' })
    } finally {
      setSavingProfile(false)
    }
  }

  async function savePreferences(event) {
    event.preventDefault()
    setSavingPreferences(true)
    setMsg(null)
    try {
      await api.workspace.settings.update(workspaceId, preferences)
      setMsg({ type: 'success', text: 'Çalışma alanı tercihleri kaydedildi.' })
    } catch (error) {
      setMsg({ type: 'error', text: error.message || 'Tercihler kaydedilemedi.' })
    } finally {
      setSavingPreferences(false)
    }
  }

  function setProfileField(field, value) {
    setProfile(current => ({ ...current, [field]: value }))
  }

  if (loading) return <div className={styles.loading}>İşletme bilgileri yükleniyor…</div>

  return (
    <div className={styles.page}>
      {msg && <div className={`${styles.message} ${msg.type === 'success' ? styles.success : styles.error}`}>{msg.text}</div>}

      <form className={styles.card} onSubmit={saveProfile}>
        <div className={styles.heading}>
          <h2>İşletme Profili</h2>
          <p>Mentor önerileri ve işletme takibi bu bilgiler kullanılarak kişiselleştirilir.</p>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>İşletme adı *
            <input required value={profile.name} onChange={event => setProfileField('name', event.target.value)} />
          </label>
          <label className={styles.field}>Resmî unvan
            <input value={profile.legalName} onChange={event => setProfileField('legalName', event.target.value)} />
          </label>
          {/* e-Fatura XML'i okunduğunda faturanın YÖNÜ bununla
              belirleniyor: alıcı bu numaraysa gelen fatura, satıcı bu
              numaraysa giden fatura. Girilmezse yön tahmin edilmez,
              kullanıcıya sorulur. */}
          <label className={styles.field}>Vergi / TC kimlik no
            <input
              value={profile.taxNumber}
              onChange={event => setProfileField('taxNumber', event.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={11}
              placeholder="10 haneli VKN ya da 11 haneli TCKN"
            />
            <small>e-Fatura yüklerken gelen/giden ayrımı bu numaradan yapılır.</small>
          </label>
          <label className={styles.field}>Sektör
            <input value={profile.sector} onChange={event => setProfileField('sector', event.target.value)} placeholder="Örn. E-ticaret, tekstil" />
          </label>
          <label className={styles.field}>Şehir
            <input value={profile.city} onChange={event => setProfileField('city', event.target.value)} />
          </label>
          <label className={styles.field}>İşletme aşaması
            <Select aria-label="İşletme aşaması" placeholder="Seçilmedi" options={[{ value: 'idea', label: 'Fikir aşaması' }, { value: 'startup', label: 'Yeni kuruldu' }, { value: 'growth', label: 'Büyüme aşaması' }, { value: 'established', label: 'Yerleşik işletme' }, { value: 'transformation', label: 'Dönüşüm aşaması' }]} value={profile.businessStage} onChange={v => setProfileField('businessStage', v)} />
          </label>
          <label className={styles.field}>Çalışan sayısı
            <input type="number" min="0" value={profile.employeeCount} onChange={event => setProfileField('employeeCount', event.target.value)} />
          </label>
        </div>

        <label className={styles.field}>Satış kanalları
          <input value={profile.salesChannels} onChange={event => setProfileField('salesChannels', event.target.value)} placeholder="Mağaza, web sitesi, Trendyol, Instagram" />
          <small>Birden fazla kanalı virgülle ayırın.</small>
        </label>
        <label className={styles.field}>Öncelikli hedef
          <input value={profile.primaryGoal} onChange={event => setProfileField('primaryGoal', event.target.value)} placeholder="Örn. E-ticaret satışlarını artırmak" />
        </label>
        <label className={styles.field}>Temel zorluklar
          <input value={profile.challenges} onChange={event => setProfileField('challenges', event.target.value)} placeholder="Nakit akışı, müşteri bulma, kargo maliyeti" />
          <small>Birden fazla konuyu virgülle ayırın.</small>
        </label>

        <h3 className={styles.subheading}>Finansal özet</h3>
        <div className={styles.grid}>
          <label className={styles.field}>Aylık satış
            <input type="number" min="0" step="0.01" value={profile.monthlySales} onChange={event => setProfileField('monthlySales', event.target.value)} />
          </label>
          <label className={styles.field}>Aylık gider
            <input type="number" min="0" step="0.01" value={profile.monthlyExpenses} onChange={event => setProfileField('monthlyExpenses', event.target.value)} />
          </label>
          <label className={styles.field}>Nakit bakiyesi
            <input type="number" min="0" step="0.01" value={profile.cashBalance} onChange={event => setProfileField('cashBalance', event.target.value)} />
          </label>
          <label className={styles.field}>Borç bakiyesi
            <input type="number" min="0" step="0.01" value={profile.debtBalance} onChange={event => setProfileField('debtBalance', event.target.value)} />
          </label>
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={!profile.name.trim() || savingProfile}>
            {savingProfile ? 'Kaydediliyor...' : 'İşletme Bilgilerini Kaydet'}
          </Button>
        </div>
      </form>

      {/*
        * GELEN E-POSTA KUTUSU.
        *
        * Adres VARSAYILAN OLARAK YOK -- kullanılmayan bir kanal, açık
        * bırakılmış bir kapıdır. Kullanıcı açıkça açıyor.
        */}
      <section className={styles.card}>
        <div className={styles.heading}>
          <h2>e-Fatura Gelen Kutusu</h2>
          <p>Muhasebe programınızdan faturaları doğrudan bu adrese gönderin; onay bekleyen kayıt olarak düşsün.</p>
        </div>

        {inbox && !inbox.kanalHazir && (
          <p className={styles.inboxUyari}>
            Bu özellik sunucuda henüz yapılandırılmadı. Adres oluştursanız da gelen posta işlenmez.
          </p>
        )}

        {inbox?.acik ? (
          <>
            <p className={styles.inboxAdres}>{inbox.adres}</p>
            <p className={styles.inboxNot}>
              🔴 Bu adrese yalnız iki grup gönderebilir: <strong>çalışma alanının
              üyeleri</strong> (doğrulanmış kendi adreslerinden) ve aşağıda
              eklediğiniz <strong>güvenilir gönderenler</strong>. Bunların
              dışından gelen posta sessizce atılır. Adres sızarsa yenileyin.
            </p>

            {/*
              GÜVENİLİR GÖNDERENLER.
              Kullanıcı faturayı kendi kutusundan yönlendirdiğinde `From`
              başlığı gönderende kalıyor; bu liste olmadan yönlendirilen
              posta reddediliyor ve "otomatik düşsün" akışı çalışmıyor.
            */}
            <div className={styles.gonderenBlok}>
              <h3>Güvenilir gönderenler</h3>
              <p className={styles.inboxNot}>
                Faturalarınızı kendi e-posta kutunuzdan buraya yönlendiriyorsanız,
                faturayı <strong>gönderen</strong> adresi buraya ekleyin — yönlendirilen
                postada gönderen siz değil, faturayı düzenleyen görünür.
                Liste boşken yalnız üyeler gönderebilir.
              </p>

              <div className={styles.gonderenForm}>
                <Input
                  type="email"
                  aria-label="Güvenilir gönderen e-posta adresi"
                  placeholder="fatura@tedarikci.com"
                  value={yeniGonderen}
                  onChange={e => setYeniGonderen(e.target.value)}
                />
                <Input
                  aria-label="Açıklama"
                  placeholder="Açıklama (isteğe bağlı)"
                  value={yeniGonderenEtiket}
                  onChange={e => setYeniGonderenEtiket(e.target.value)}
                />
                <Button type="button" onClick={gonderenEkle} disabled={gonderenIsleniyor || !yeniGonderen.trim()}>
                  Ekle
                </Button>
              </div>

              {gonderenler.length === 0 ? (
                <p className={styles.inboxNot}>Henüz güvenilir gönderen eklenmedi.</p>
              ) : (
                <ul className={styles.gonderenListe}>
                  {gonderenler.map(g => (
                    <li key={g.id}>
                      <span>
                        <code>{g.email}</code>
                        {g.label && <em> — {g.label}</em>}
                      </span>
                      <Button
                        type="button" variant="ghost"
                        onClick={() => gonderenSil(g.id, g.email)}
                        disabled={gonderenIsleniyor}
                      >
                        Çıkar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={inboxAc} disabled={inboxIsleniyor}>
                Adresi yenile
              </Button>
              <Button type="button" variant="ghost" onClick={inboxKapat} disabled={inboxIsleniyor}>
                Kapat
              </Button>
            </div>
          </>
        ) : (
          <div className={styles.actions}>
            <Button type="button" onClick={inboxAc} disabled={inboxIsleniyor}>
              {inboxIsleniyor ? 'Hazırlanıyor…' : 'Gelen kutusunu aç'}
            </Button>
          </div>
        )}
      </section>

      <form className={styles.card} onSubmit={savePreferences}>
        <div className={styles.heading}>
          <h2>Çalışma Alanı Tercihleri</h2>
          <p>Takvim, para birimi ve bölgesel gösterim ayarları.</p>
        </div>
        <div className={styles.grid}>
          <label className={styles.field}>Saat dilimi
            <Select aria-label="Saat dilimi" options={[{ value: 'Europe/Istanbul', label: 'İstanbul (GMT+3)' }, { value: 'Europe/London', label: 'Londra (GMT+0/+1)' }, { value: 'America/New_York', label: 'New York (GMT-5/-4)' }]} value={preferences.timezone} onChange={v => setPreferences(current => ({ ...current, timezone: v }))} />
          </label>
          <label className={styles.field}>Dil / bölge
            <Select aria-label="Dil / bölge" options={[{ value: 'tr-TR', label: 'Türkçe (Türkiye)' }, { value: 'en-US', label: 'English (US)' }]} value={preferences.locale} onChange={v => setPreferences(current => ({ ...current, locale: v }))} />
          </label>
          <label className={styles.field}>Para birimi
            <Select aria-label="Para birimi" options={[{ value: 'TRY', label: '₺ TRY' }, { value: 'USD', label: '$ USD' }, { value: 'EUR', label: '€ EUR' }, { value: 'GBP', label: '£ GBP' }]} value={preferences.defaultCurrency} onChange={v => setPreferences(current => ({ ...current, defaultCurrency: v }))} />
          </label>
          <label className={styles.field}>Hafta başlangıcı
            <Select aria-label="Hafta başlangıcı" options={[{ value: '1', label: 'Pazartesi' }, { value: '0', label: 'Pazar' }]} value={String(preferences.weekStartsOn)} onChange={v => setPreferences(current => ({ ...current, weekStartsOn: Number(v) }))} />
          </label>
        </div>
        <div className={styles.actions}>
          <Button type="submit" disabled={savingPreferences}>{savingPreferences ? 'Kaydediliyor...' : 'Tercihleri Kaydet'}</Button>
        </div>
      </form>
    </div>
  )
}
