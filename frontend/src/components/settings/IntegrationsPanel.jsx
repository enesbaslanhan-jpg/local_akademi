import { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Store, Unplug, Plug, Clock } from 'lucide-react'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import { Badge, Button } from '@/components/ui'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import PasswordInput from '@/components/ui/PasswordInput'
import styles from './IntegrationsPanel.module.css'

const STATUS_LABELS = {
  PENDING: 'Beklemede',
  ACTIVE: 'Bağlı',
  ERROR: 'Hata',
  DISABLED: 'Kapalı'
}

/*
 * Provider yuzeyleri. Ortak modal shell + kart iskeleti; credential
 * alanlari provider'a gore degisir (resmi dokuman modeli):
 * - TRENDYOL    : merchantId (sayisal) + apiKey + apiSecret
 * - HEPSIBURADA : merchantId (UUID)   + username + password
 * - N11         : storeName (magaza adi) + appKey + appSecret
 *                 (header auth; resmi dokuman developer.n11.com)
 * - SHOPIFY     : myshopify.com domain + OAuth authorization-code grant
 */
const PROVIDERS = {
  TRENDYOL: {
    label: 'Trendyol',
    connect: (ws, payload) => api.integrations.trendyolConnect(ws, payload),
    status: ws => api.integrations.trendyolStatus(ws),
    sync: ws => api.integrations.trendyolSync(ws),
    disconnect: ws => api.integrations.trendyolDisconnect(ws)
  },
  HEPSIBURADA: {
    label: 'Hepsiburada',
    connect: (ws, payload) => api.integrations.hepsiburadaConnect(ws, payload),
    status: ws => api.integrations.hepsiburadaStatus(ws),
    sync: ws => api.integrations.hepsiburadaSync(ws),
    disconnect: ws => api.integrations.hepsiburadaDisconnect(ws)
  },
  N11: {
    label: 'N11',
    connect: (ws, payload) => api.integrations.n11Connect(ws, payload),
    status: ws => api.integrations.n11Status(ws),
    sync: ws => api.integrations.n11Sync(ws),
    disconnect: ws => api.integrations.n11Disconnect(ws)
  },
  SHOPIFY: {
    label: 'Shopify',
    connect: (ws, payload) => api.integrations.shopifyConnect(ws, payload),
    status: ws => api.integrations.shopifyStatus(ws),
    sync: ws => api.integrations.shopifySync(ws),
    disconnect: ws => api.integrations.shopifyDisconnect(ws)
  }
}

const EMPTY_FORM = { merchantId: '', username: '', password: '', apiKey: '', apiSecret: '', storeName: '', shopDomain: '' }

function formatDateTime(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}

/*
 * Ayarlar > Entegrasyonlar paneli.
 *
 * - Yalnizca LocalKarar backend'inden okur; sayfa acilisi pazaryerine
 *   HICBIR istek gondermez.
 * - "Simdi esitle" arka planda sync baslatir ve durumunu poll eder.
 * - Credential input'lari password'dur; degerler GERI OKUNUP
 *   GOSTERILMEZ (sunucu da donmez).
 */
export default function IntegrationsPanel() {
  const { activeWorkspaceId } = useWorkspace()
  const [catalog, setCatalog] = useState([])
  const [statusByProvider, setStatusByProvider] = useState({ TRENDYOL: null, HEPSIBURADA: null, N11: null, SHOPIFY: null })
  const [loading, setLoading] = useState(true)
  const [connectProvider, setConnectProvider] = useState(null)
  const [disconnectProvider, setDisconnectProvider] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [syncingProvider, setSyncingProvider] = useState(null)
  const [message, setMessage] = useState(null)
  /* Ödeme vadesi taslağı — sağlayıcı başına. Kaydedilene kadar sunucuya
     gitmez; her tuşta istek atmak gereksiz yük olurdu. */
  const [vadeTaslak, setVadeTaslak] = useState({})
  const [vadeKaydediliyor, setVadeKaydediliyor] = useState(null)

  async function vadeKaydet(providerKey, connectionId) {
    if (!connectionId) return
    const ham = (vadeTaslak[providerKey] ?? '').trim()
    /* Boş = "bilmiyorum". `null` gönderiliyor: sunucu vade yazmıyor,
       kayıt yine oluşuyor ama takvime girmiyor. */
    const deger = ham === '' ? null : Number(ham)
    if (deger !== null && (!Number.isInteger(deger) || deger < 0 || deger > 365)) {
      setMessage({ type: 'err', text: 'Ödeme vadesi 0 ile 365 gün arasında bir tam sayı olmalı.' })
      return
    }
    setVadeKaydediliyor(providerKey)
    try {
      await api.integrations.updateSettings(connectionId, { payoutDelayDays: deger })
      setMessage({
        type: 'ok',
        text: deger === null
          ? 'Ödeme vadesi temizlendi. Yeni sipariş kayıtları vadesiz oluşacak.'
          : `Ödeme vadesi ${deger} gün olarak kaydedildi. Bundan sonraki sipariş kayıtları takvime düşecek.`
      })
      await refresh()
    } catch (error) {
      setMessage({ type: 'err', text: error.message || 'Ödeme vadesi kaydedilemedi.' })
    } finally {
      setVadeKaydediliyor(null)
    }
  }

  const refresh = useCallback(async () => {
    if (!activeWorkspaceId) {
      setLoading(false)
      return
    }
    try {
      const [catalogData, trendyolStatus, hbStatus, n11Status, shopifyStatus] = await Promise.all([
        api.integrations.catalog(),
        PROVIDERS.TRENDYOL.status(activeWorkspaceId).catch(() => null),
        PROVIDERS.HEPSIBURADA.status(activeWorkspaceId).catch(() => null),
        PROVIDERS.N11.status(activeWorkspaceId).catch(() => null),
        PROVIDERS.SHOPIFY.status(activeWorkspaceId).catch(() => null)
      ])
      setCatalog(catalogData.marketplaces || [])
      const durumlar = { TRENDYOL: trendyolStatus, HEPSIBURADA: hbStatus, N11: n11Status, SHOPIFY: shopifyStatus }
      setStatusByProvider(durumlar)
      /* Kayıtlı vade alana yazılıyor; kullanıcı kaydettiği değeri geri
         görmeli, boş bir kutu "kaydedilmedi mi?" dedirtir. */
      const vadeler = {}
      for (const [anahtar, durum] of Object.entries(durumlar)) {
        const gun = durum?.connections?.[0]?.payoutDelayDays
        vadeler[anahtar] = gun === null || gun === undefined ? '' : String(gun)
      }
      setVadeTaslak(vadeler)
    } catch (error) {
      setMessage({ type: 'err', text: error.message || 'Entegrasyon bilgileri alınamadı.' })
    } finally {
      setLoading(false)
    }
  }, [activeWorkspaceId])

  useEffect(() => { refresh() }, [refresh])

  // Sync arka planda kosar: RUNNING iken ilgili provider durumu poll edilir.
  useEffect(() => {
    if (!syncingProvider || !activeWorkspaceId) return undefined
    const provider = PROVIDERS[syncingProvider]
    const timer = window.setInterval(async () => {
      try {
        const statusData = await provider.status(activeWorkspaceId)
        setStatusByProvider(current => ({ ...current, [syncingProvider]: statusData }))
        if (!statusData?.syncing) {
          setSyncingProvider(null)
          setMessage({ type: 'ok', text: 'Eşitleme tamamlandı.' })
        }
      } catch { /* gecici hata polling'i bozmasin */ }
    }, 3000)
    return () => window.clearInterval(timer)
  }, [syncingProvider, activeWorkspaceId])

  function openConnect(provider) {
    setForm(EMPTY_FORM)
    setFormError(null)
    setConnectProvider(provider)
  }

  async function handleConnect(event) {
    event.preventDefault()
    setFormError(null)
    const providerKey = connectProvider
    if (!providerKey) return

    if (providerKey === 'TRENDYOL') {
      if (!form.merchantId.trim() || !form.apiKey.trim() || !form.apiSecret.trim()) {
        setFormError('Tüm alanları doldurun.')
        return
      }
    } else if (providerKey === 'N11') {
      if (!form.storeName.trim() || !form.apiKey.trim() || !form.apiSecret.trim()) {
        setFormError('Tüm alanları doldurun.')
        return
      }
    } else if (providerKey === 'SHOPIFY') {
      if (!form.shopDomain.trim()) {
        setFormError('Shopify mağaza alan adını yazın.')
        return
      }
    } else if (!form.merchantId.trim() || !form.username.trim() || !form.password.trim()) {
      setFormError('Tüm alanları doldurun.')
      return
    }

    setSaving(true)
    try {
      if (providerKey === 'TRENDYOL') {
        await PROVIDERS.TRENDYOL.connect(activeWorkspaceId, {
          merchantId: form.merchantId.trim(),
          apiKey: form.apiKey.trim(),
          apiSecret: form.apiSecret.trim()
        })
      } else if (providerKey === 'N11') {
        await PROVIDERS.N11.connect(activeWorkspaceId, {
          storeName: form.storeName.trim(),
          appKey: form.apiKey.trim(),
          appSecret: form.apiSecret.trim()
        })
      } else if (providerKey === 'SHOPIFY') {
        const result = await PROVIDERS.SHOPIFY.connect(activeWorkspaceId, {
          shopDomain: form.shopDomain.trim()
        })
        if (!result?.authorizationUrl) throw new Error('Shopify yetkilendirme adresi alınamadı.')
        window.location.assign(result.authorizationUrl)
        return
      } else {
        await PROVIDERS.HEPSIBURADA.connect(activeWorkspaceId, {
          merchantId: form.merchantId.trim(),
          username: form.username.trim(),
          password: form.password.trim()
        })
      }
      setForm(EMPTY_FORM)
      setConnectProvider(null)
      setMessage({ type: 'ok', text: `${PROVIDERS[providerKey].label} mağazanız bağlandı. İlk eşitleme başlayabilir.` })
      await refresh()
    } catch (error) {
      setFormError(error.message || 'Bağlantı kurulamadı.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSync(providerKey) {
    setMessage(null)
    try {
      await PROVIDERS[providerKey].sync(activeWorkspaceId)
      setSyncingProvider(providerKey)
      setMessage({ type: 'ok', text: `${PROVIDERS[providerKey].label} eşitlemesi başlatıldı…` })
    } catch (error) {
      if (error.status === 409) {
        setSyncingProvider(providerKey)
        return
      }
      setMessage({ type: 'err', text: error.message || 'Eşitleme başlatılamadı.' })
    }
  }

  async function handleDisconnect() {
    const providerKey = disconnectProvider
    setDisconnectProvider(null)
    try {
      await PROVIDERS[providerKey].disconnect(activeWorkspaceId)
      setSyncingProvider(null)
      setMessage({ type: 'ok', text: 'Bağlantı kaldırıldı. Geçmiş sipariş kayıtları işletme geçmişinizde korunur.' })
      await refresh()
    } catch (error) {
      setMessage({ type: 'err', text: error.message || 'Bağlantı kaldırılamadı.' })
    }
  }

  if (!activeWorkspaceId) {
    return (
      <div className={styles.empty}>
        <p>Pazaryeri entegrasyonları işletmenize bağlıdır. Önce bir işletme oluşturun veya seçin.</p>
      </div>
    )
  }

  const enabledProviders = ['TRENDYOL', 'HEPSIBURADA', 'N11', 'SHOPIFY'].filter(key =>
    catalog.find(entry => entry.provider === key)?.enabled !== false
  )
  const soonProviders = catalog.filter(entry => !enabledProviders.includes(entry.provider))

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {enabledProviders.map(providerKey => {
          const provider = PROVIDERS[providerKey]
          const status = statusByProvider[providerKey]
          const connected = Boolean(status?.connected)
          const syncing = syncingProvider === providerKey
          const lastSync = formatDateTime(status?.connections?.[0]?.lastSyncedAt)
          return (
            <article key={providerKey} className={styles.card} aria-label={`${provider.label} entegrasyonu`}>
              <header className={styles.cardHead}>
                <span className={styles.logo} aria-hidden="true">
                  <Store size={18} />
                </span>
                <div className={styles.cardTitle}>
                  <strong>{provider.label}</strong>
                  <small>Pazaryeri</small>
                </div>
                <Badge variant={connected ? 'success' : 'default'}>{connected ? STATUS_LABELS.ACTIVE : 'Bağlı değil'}</Badge>
              </header>

              {loading ? (
                <p className={styles.soon}>Yükleniyor…</p>
              ) : (
                <>
                  <dl className={styles.meta}>
                    <div><dt>{providerKey === 'N11' ? 'Mağaza Adı' : providerKey === 'SHOPIFY' ? 'Shopify Alan Adı' : 'Mağaza / Merchant ID'}</dt><dd>{status?.connections?.[0]?.externalAccountId || '—'}</dd></div>
                    <div><dt>Son eşitleme</dt><dd>
                      <Clock size={13} aria-hidden="true" />{' '}
                      {lastSync || 'Hiç'}
                      {status?.syncing && <em> · eşitleniyor…</em>}
                    </dd></div>
                    <div><dt>Kayıtlar</dt><dd>{status?.counts?.orders ?? 0} sipariş · {status?.counts?.products ?? 0} ürün</dd></div>
                    {status?.circuitBreakerTripped && (
                      <div className={styles.warnRow}><dt>Durum</dt><dd>Tekrarlayan hata nedeniyle zamanlanmış eşitleme duraklatıldı.</dd></div>
                    )}
                  </dl>

                  {/*
                    ÖDEME VADESİ — yalnız bağlıyken.

                    🔴 Bu alan boşken sipariş kaydı Kayıtlar'da görünür ama
                    TAKVİME ve 30 günlük tahsilat toplamına GİRMEZ; ölçüldü.
                    Gömülü bir varsayılan koymuyoruz: "Trendyol 14 günde
                    öder" gibi bir tahmin yanlış olduğunda sessizce hatalı
                    nakit planı üretirdi.
                  */}
                  {connected && (
                    <div className={styles.vadeAlani}>
                      <label htmlFor={`vade-${providerKey}`}>
                        Ödeme vadesi (gün)
                      </label>
                      <div className={styles.vadeSatir}>
                        <input
                          id={`vade-${providerKey}`}
                          type="number" min="0" max="365"
                          className={styles.vadeGiris}
                          placeholder="örn. 14"
                          value={vadeTaslak[providerKey] ?? ''}
                          onChange={e => setVadeTaslak(t => ({ ...t, [providerKey]: e.target.value }))}
                        />
                        <Button
                          type="button" variant="secondary"
                          onClick={() => vadeKaydet(providerKey, status?.connections?.[0]?.id)}
                          disabled={vadeKaydediliyor === providerKey}
                        >
                          {vadeKaydediliyor === providerKey ? 'Kaydediliyor…' : 'Kaydet'}
                        </Button>
                      </div>
                      <p className={styles.vadeIpucu}>
                        Bu pazaryeri satıştan kaç gün sonra ödüyor? Girerseniz sipariş
                        kaydınız takvime ve 30 günlük tahsilat tahminine düşer.
                        Boş bırakırsanız kayıt yine oluşur, sadece vadesiz kalır.
                      </p>
                    </div>
                  )}

                  <div className={styles.actions}>
                    {!connected ? (
                      <Button type="button" onClick={() => openConnect(providerKey)}>
                        <Plug size={15} aria-hidden="true" /> Bağla
                      </Button>
                    ) : (
                      <>
                        <Button type="button" variant="secondary" onClick={() => handleSync(providerKey)} disabled={syncing}>
                          <RefreshCw size={15} aria-hidden="true" className={syncing ? styles.spinning : ''} />
                          {syncing ? 'Eşitleniyor…' : 'Şimdi eşitle'}
                        </Button>
                        <Button type="button" variant="danger" onClick={() => setDisconnectProvider(providerKey)}>
                          <Unplug size={15} aria-hidden="true" /> Bağlantıyı kaldır
                        </Button>
                      </>
                    )}
                  </div>

                  {status?.latestRuns?.some(run => run.errorCode) && !status.syncing && (
                    <p className={styles.errorNote}>Son eşitlemede sorun oluştu. Tekrar denemek için “Şimdi eşitle”yi kullanın.</p>
                  )}
                </>
              )}
            </article>
          )
        })}

        {/* Diger pazaryerleri — yakinda */}
        {soonProviders.map(entry => (
          <article key={entry.provider} className={`${styles.card} ${styles.disabled}`} aria-label={`${entry.label} entegrasyonu`}>
            <header className={styles.cardHead}>
              <span className={styles.logo} aria-hidden="true"><Store size={18} /></span>
              <div className={styles.cardTitle}><strong>{entry.label}</strong><small>Pazaryeri</small></div>
              <Badge>Yakında</Badge>
            </header>
            <p className={styles.soon}>{entry.label} entegrasyonu hazırlanıyor.</p>
          </article>
        ))}
      </div>

      {message && (
        <p className={`${styles.note} ${message.type === 'ok' ? styles.noteOk : styles.noteErr}`} role="status">{message.text}</p>
      )}

      {/* ORTAK MODAL SHELL — alanlar provider'a gore degisir */}
      <Modal open={Boolean(connectProvider)} onClose={() => { setConnectProvider(null); setFormError(null) }} title={`${connectProvider ? PROVIDERS[connectProvider].label : ''} Mağazanı Bağla`}>
        <form onSubmit={handleConnect} className={styles.form}>
          {connectProvider === 'TRENDYOL' && (
            <p className={styles.hint}>
              Bilgilere Trendyol Satıcı Paneli → <strong>Hesap Bilgileri → Entegrasyon Bilgileri</strong> sayfasından ulaşabilirsiniz
              (yalnızca ana kullanıcı görebilir). Bilgileriniz şifrelenerek saklanır ve geri okunarak gösterilmez.
            </p>
          )}
          {connectProvider === 'HEPSIBURADA' && (
            <p className={styles.hint}>
              Bilgilere Hepsiburada Satıcı Paneli (<strong>merchant.hepsiburada.com</strong>) → <strong>Ayarlar → Entegrasyonlar</strong> sayfasından ulaşabilirsiniz.
              Merchant ID UUID formatındadır; API kullanıcı adı ve şifreniz Basic Authentication ile kullanılır.
              Bilgileriniz şifrelenerek saklanır ve geri okunarak gösterilmez.
            </p>
          )}
          {connectProvider === 'N11' && (
            <p className={styles.hint}>
              Bilgilere N11 Satıcı Paneli (<strong>so.n11.com</strong>) → <strong>Hesabım → API Hesapları</strong> sayfasından ulaşabilirsiniz.
              App Key ve App Secret her istekte header ile iletilir; mağaza adı bağlantınızı tanımlamak için kullanılır.
              Bilgileriniz şifrelenerek saklanır ve geri okunarak gösterilmez.
            </p>
          )}
          {connectProvider === 'SHOPIFY' && (
            <p className={styles.hint}>
              Mağazanızın <strong>magazaniz.myshopify.com</strong> alan adını yazın. Devam ettiğinizde Shopify’ın resmi izin ekranına yönlendirilirsiniz.
              LocalKarar yalnız sipariş, ürün, stok ve iade okuma izinlerini ister; erişim belirteci tarayıcıya geri gösterilmez.
            </p>
          )}
          {connectProvider === 'N11' ? (
            <label className={styles.field}>
              <span>Mağaza Adı</span>
              <input
                autoComplete="off"
                value={form.storeName}
                onChange={event => setForm(current => ({ ...current, storeName: event.target.value }))}
                placeholder="N11'deki mağaza adınız"
                required
              />
            </label>
          ) : connectProvider === 'SHOPIFY' ? (
            <label className={styles.field}>
              <span>Shopify Mağaza Alan Adı</span>
              <input
                autoComplete="off"
                spellCheck="false"
                value={form.shopDomain}
                onChange={event => setForm(current => ({ ...current, shopDomain: event.target.value }))}
                placeholder="magazaniz.myshopify.com"
                required
              />
            </label>
          ) : (
            <label className={styles.field}>
              <span>Mağaza / Merchant ID</span>
              <input
                autoComplete="off"
                value={form.merchantId}
                onChange={event => setForm(current => ({ ...current, merchantId: event.target.value }))}
                placeholder={connectProvider === 'HEPSIBURADA' ? 'UUID biçiminde Merchant ID' : 'Örn. 123456'}
                required
              />
            </label>
          )}
          {connectProvider === 'SHOPIFY' ? null : connectProvider === 'HEPSIBURADA' ? (
            <>
              <label className={styles.field}>
                <span>API Kullanıcı Adı</span>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  value={form.username}
                  onChange={event => setForm(current => ({ ...current, username: event.target.value }))}
                  required
                />
              </label>
              <label className={styles.field}>
                <span>API Şifresi</span>
                <PasswordInput
                  overlay
                  autoComplete="new-password"
                  value={form.password}
                  onChange={event => setForm(current => ({ ...current, password: event.target.value }))}
                  required
                />
              </label>
            </>
          ) : (
            <>
              <label className={styles.field}>
                <span>{connectProvider === 'N11' ? 'App Key' : 'API Key'}</span>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck="false"
                  value={form.apiKey}
                  onChange={event => setForm(current => ({ ...current, apiKey: event.target.value }))}
                  required
                />
              </label>
              <label className={styles.field}>
                <span>{connectProvider === 'N11' ? 'App Secret' : 'API Secret'}</span>
                <PasswordInput
                  overlay
                  autoComplete="new-password"
                  value={form.apiSecret}
                  onChange={event => setForm(current => ({ ...current, apiSecret: event.target.value }))}
                  required
                />
              </label>
            </>
          )}
          {formError && <p className={styles.noteErr} role="alert">{formError}</p>}
          <div className={styles.modalActions}>
            <Button type="button" variant="secondary" onClick={() => { setConnectProvider(null); setFormError(null) }}>Vazgeç</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Doğrulanıyor…' : 'Doğrula ve bağla'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(disconnectProvider)}
        onClose={() => setDisconnectProvider(null)}
        onConfirm={handleDisconnect}
        title={`${disconnectProvider ? PROVIDERS[disconnectProvider].label : ''} bağlantısı kaldırılsın mı?`}
        description="Kimlik bilgileriniz kalıcı olarak silinir ve eşitleme durur. Halihazırda indirilmiş sipariş kayıtları silinmez."
        confirmLabel="Bağlantıyı kaldır"
        variant="danger"
      />
    </div>
  )
}
