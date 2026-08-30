import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/services/api'
import { useWorkspace } from '@/context/WorkspaceContext'
import Button from '@/components/ui/Button'
import { Select, Input } from '@/components/ui'
import styles from './Settings.module.css'
import { Trans, useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('workspace')
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
      setMsg({ type: 'success', text: t('settings.senderAdded') })
    } catch (error) {
      setMsg({ type: 'error', text: error.message || t('settings.senderAddFailed') })
    } finally {
      setGonderenIsleniyor(false)
    }
  }

  async function gonderenSil(id, email) {
    /* Bu bir güvenlik ayarı: çıkarınca o adresten gelen postalar
       reddedilmeye başlar ve kullanıcı sebebini bilmeyebilir. */
    if (!window.confirm(t('settings.confirmSenderRemove', { email }))) return
    setGonderenIsleniyor(true)
    try {
      await api.workspace.inbox.removeSender(workspaceId, id)
      await gonderenleriYukle()
      setMsg({ type: 'success', text: t('settings.senderRemoved') })
    } catch (error) {
      setMsg({ type: 'error', text: error.message || t('settings.senderRemoveFailed') })
    } finally {
      setGonderenIsleniyor(false)
    }
  }

  async function inboxAc() {
    /* Adres zaten varsa bu bir YENİLEME: kullanıcıya ne olacağını
       söylemeden eskisini geçersiz kılmak sürpriz olurdu. */
    if (inbox?.acik && !window.confirm(
      t('settings.confirmInboxRenew')
    )) return
    setInboxIsleniyor(true)
    try {
      setInbox({ ...(await api.workspace.inbox.enable(workspaceId)), kanalHazir: inbox?.kanalHazir })
      setMsg({ type: 'success', text: t('settings.inboxReady') })
    } catch (e) {
      setMsg({ type: 'error', text: e.message || t('settings.addressCreateFailed') })
    } finally { setInboxIsleniyor(false) }
  }

  async function inboxKapat() {
    if (!window.confirm(t('settings.confirmInboxClose'))) return
    setInboxIsleniyor(true)
    try {
      setInbox({ ...(await api.workspace.inbox.disable(workspaceId)), kanalHazir: inbox?.kanalHazir })
      setMsg({ type: 'success', text: t('settings.inboxClosed') })
    } catch (e) {
      setMsg({ type: 'error', text: e.message || t('settings.operationFailed') })
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
      setMsg({ type: 'error', text: error.message || t('settings.loadFailed') })
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
      setMsg({ type: 'success', text: t('settings.saved') })
    } catch (error) {
      setMsg({ type: 'error', text: error.message || t('settings.saveFailed') })
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
      setMsg({ type: 'success', text: t('settings.prefsSaved') })
    } catch (error) {
      setMsg({ type: 'error', text: error.message || t('settings.prefsSaveFailed') })
    } finally {
      setSavingPreferences(false)
    }
  }

  function setProfileField(field, value) {
    setProfile(current => ({ ...current, [field]: value }))
  }

  if (loading) return <div className={styles.loading}>{t('settings.loading')}</div>

  return (
    <div className={styles.page}>
      {msg && <div className={`${styles.message} ${msg.type === 'success' ? styles.success : styles.error}`}>{msg.text}</div>}

      <form className={styles.card} onSubmit={saveProfile}>
        <div className={styles.heading}>
          <h2>{t('settings.profileTitle')}</h2>
          <p>{t('settings.profileDesc')}</p>
        </div>

        <div className={styles.grid}>
          <label className={styles.field}>{t('settings.nameLabel')}
            <input required value={profile.name} onChange={event => setProfileField('name', event.target.value)} />
          </label>
          <label className={styles.field}>{t('settings.legalName')}
            <input value={profile.legalName} onChange={event => setProfileField('legalName', event.target.value)} />
          </label>
          {/* e-Fatura XML'i okunduğunda faturanın YÖNÜ bununla
              belirleniyor: alıcı bu numaraysa gelen fatura, satıcı bu
              numaraysa giden fatura. Girilmezse yön tahmin edilmez,
              kullanıcıya sorulur. */}
          <label className={styles.field}>{t('settings.taxNumber')}
            <input
              value={profile.taxNumber}
              onChange={event => setProfileField('taxNumber', event.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              maxLength={11}
              placeholder={t('settings.taxPlaceholder')}
            />
            <small>{t('settings.taxHint')}</small>
          </label>
          <label className={styles.field}>{t('settings.sector')}
            <input value={profile.sector} onChange={event => setProfileField('sector', event.target.value)} placeholder={t('settings.sectorPlaceholder')} />
          </label>
          <label className={styles.field}>{t('settings.city')}
            <input value={profile.city} onChange={event => setProfileField('city', event.target.value)} />
          </label>
          <label className={styles.field}>{t('settings.businessStage')}
            <Select aria-label={t('settings.businessStage')} placeholder={t('settings.stage.none')} options={[{ value: 'idea', label: t('settings.stage.idea') }, { value: 'startup', label: t('settings.stage.startup') }, { value: 'growth', label: t('settings.stage.growth') }, { value: 'established', label: t('settings.stage.established') }, { value: 'transformation', label: t('settings.stage.transformation') }]} value={profile.businessStage} onChange={v => setProfileField('businessStage', v)} />
          </label>
          <label className={styles.field}>{t('settings.employeeCount')}
            <input type="number" min="0" value={profile.employeeCount} onChange={event => setProfileField('employeeCount', event.target.value)} />
          </label>
        </div>

        <label className={styles.field}>{t('settings.salesChannels')}
          <input value={profile.salesChannels} onChange={event => setProfileField('salesChannels', event.target.value)} placeholder={t('settings.salesChannelsPlaceholder')} />
          <small>{t('settings.salesChannelsHint')}</small>
        </label>
        <label className={styles.field}>{t('settings.primaryGoal')}
          <input value={profile.primaryGoal} onChange={event => setProfileField('primaryGoal', event.target.value)} placeholder={t('settings.goalPlaceholder')} />
        </label>
        <label className={styles.field}>{t('settings.challenges')}
          <input value={profile.challenges} onChange={event => setProfileField('challenges', event.target.value)} placeholder={t('settings.challengesPlaceholder')} />
          <small>{t('settings.challengesHint')}</small>
        </label>

        <h3 className={styles.subheading}>{t('settings.financialSummary')}</h3>
        <div className={styles.grid}>
          <label className={styles.field}>{t('settings.monthlySales')}
            <input type="number" min="0" step="0.01" value={profile.monthlySales} onChange={event => setProfileField('monthlySales', event.target.value)} />
          </label>
          <label className={styles.field}>{t('settings.monthlyExpenses')}
            <input type="number" min="0" step="0.01" value={profile.monthlyExpenses} onChange={event => setProfileField('monthlyExpenses', event.target.value)} />
          </label>
          <label className={styles.field}>{t('settings.cashBalance')}
            <input type="number" min="0" step="0.01" value={profile.cashBalance} onChange={event => setProfileField('cashBalance', event.target.value)} />
          </label>
          <label className={styles.field}>{t('settings.debtBalance')}
            <input type="number" min="0" step="0.01" value={profile.debtBalance} onChange={event => setProfileField('debtBalance', event.target.value)} />
          </label>
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={!profile.name.trim() || savingProfile}>
            {savingProfile ? t('settings.saving') : t('settings.saveButton')}
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
          <h2>{t('settings.inboxTitle')}</h2>
          <p>{t('settings.inboxDesc')}</p>
        </div>

        {inbox && !inbox.kanalHazir && (
          <p className={styles.inboxUyari}>
            {t('settings.inboxNotReady')}
          </p>
        )}

        {inbox?.acik ? (
          <>
            <p className={styles.inboxAdres}>{inbox.adres}</p>
            <p className={styles.inboxNot}>
              🔴 <Trans t={t} i18nKey="settings.inboxNote" components={{ strong: <strong /> }} />
            </p>

            {/*
              GÜVENİLİR GÖNDERENLER.
              Kullanıcı faturayı kendi kutusundan yönlendirdiğinde `From`
              başlığı gönderende kalıyor; bu liste olmadan yönlendirilen
              posta reddediliyor ve "otomatik düşsün" akışı çalışmıyor.
            */}
            <div className={styles.gonderenBlok}>
              <h3>{t('settings.trustedSenders')}</h3>
              <p className={styles.inboxNot}>
                <Trans t={t} i18nKey="settings.trustedSendersDesc" components={{ strong: <strong /> }} />
              </p>

              <div className={styles.gonderenForm}>
                <Input
                  type="email"
                  aria-label={t('settings.senderEmailLabel')}
                  placeholder={t('settings.senderEmailPlaceholder')}
                  value={yeniGonderen}
                  onChange={e => setYeniGonderen(e.target.value)}
                />
                <Input
                  aria-label={t('settings.description')}
                  placeholder={t('settings.senderDescOptional')}
                  value={yeniGonderenEtiket}
                  onChange={e => setYeniGonderenEtiket(e.target.value)}
                />
                <Button type="button" onClick={gonderenEkle} disabled={gonderenIsleniyor || !yeniGonderen.trim()}>
                  {t('settings.add')}
                </Button>
              </div>

              {gonderenler.length === 0 ? (
                <p className={styles.inboxNot}>{t('settings.noSenders')}</p>
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
                        {t('team.remove')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="secondary" onClick={inboxAc} disabled={inboxIsleniyor}>
                {t('settings.renewAddress')}
              </Button>
              <Button type="button" variant="ghost" onClick={inboxKapat} disabled={inboxIsleniyor}>
                {t('common:buttons.close')}
              </Button>
            </div>
          </>
        ) : (
          <div className={styles.actions}>
            <Button type="button" onClick={inboxAc} disabled={inboxIsleniyor}>
              {inboxIsleniyor ? t('settings.preparing') : t('settings.openInbox')}
            </Button>
          </div>
        )}
      </section>

      <form className={styles.card} onSubmit={savePreferences}>
        <div className={styles.heading}>
          <h2>{t('settings.prefsTitle')}</h2>
          <p>{t('settings.prefsDesc')}</p>
        </div>
        <div className={styles.grid}>
          <label className={styles.field}>{t('settings.timezone')}
            <Select aria-label={t('settings.timezone')} options={[{ value: 'Europe/Istanbul', label: t('settings.timezoneIstanbul') }, { value: 'Europe/London', label: t('settings.timezoneLondon') }, { value: 'America/New_York', label: t('settings.timezoneNewYork') }]} value={preferences.timezone} onChange={v => setPreferences(current => ({ ...current, timezone: v }))} />
          </label>
          {/* "Dil / bölge" DEĞİL: seçenek yalnızca tarih ve sayı
              biçimini değiştirir; arayüz dili Türkçe kalır. English (US)
              etiketi seçilse bile arayüzü İngilizce yapmaz — yanlış
              vaat yerine gerçeğini yazıyoruz. Seçenek kaldırılmadı,
              biçim ayarı gerçek bir ihtiyaç. */}
          <label className={styles.field}>{t('settings.dateFormat')}
            <Select aria-label={t('settings.dateFormat')} options={[{ value: 'tr-TR', label: t('settings.localeTurkishTurkey') }, { value: 'en-US', label: t('settings.localeEnglishUS') }]} value={preferences.locale} onChange={v => setPreferences(current => ({ ...current, locale: v }))} />
            <small>{t('settings.dateFormatHint')}</small>
          </label>
          <label className={styles.field}>{t('settings.currency')}
            <Select aria-label={t('settings.currency')} options={[{ value: 'TRY', label: '₺ TRY' }, { value: 'USD', label: '$ USD' }, { value: 'EUR', label: '€ EUR' }, { value: 'GBP', label: '£ GBP' }]} value={preferences.defaultCurrency} onChange={v => setPreferences(current => ({ ...current, defaultCurrency: v }))} />
          </label>
          <label className={styles.field}>{t('settings.weekStart')}
            <Select aria-label={t('settings.weekStart')} options={[{ value: '1', label: t('settings.monday') }, { value: '0', label: t('settings.sunday') }]} value={String(preferences.weekStartsOn)} onChange={v => setPreferences(current => ({ ...current, weekStartsOn: Number(v) }))} />
          </label>
        </div>
        <div className={styles.actions}>
          <Button type="submit" disabled={savingPreferences}>{savingPreferences ? t('settings.saving') : t('settings.savePrefs')}</Button>
        </div>
      </form>
    </div>
  )
}
