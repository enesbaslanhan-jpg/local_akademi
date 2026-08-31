import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  Compass,
  Info,
  ImageUp,
  Laptop,
  Mail,
  Moon,
  Scale,
  ShieldCheck,
  Store,
  Sun,
  Trash2,
  User,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTheme } from '@/context/ThemeContext'
import { api } from '@/services/api'
import { Badge, Button, Select } from '@/components/ui'
import PasswordInput from '@/components/ui/PasswordInput'
import ImageViewer from '@/components/ui/ImageViewer'
import IntegrationsPanel from '@/components/settings/IntegrationsPanel'
import LegalModal from '@/components/legal/LegalModal'
import MembershipSettings from '@/components/billing/MembershipSettings'
import styles from './SettingsPage.module.css'
import { useTranslation } from 'react-i18next'
import { useLocalization } from '@/context/LocalizationContext'

const TIMEZONES = ['Europe/Istanbul', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'Asia/Dubai', 'UTC']
/* "Dil / bölge" DEĞİL: bu değerler arayüz dilini DEĞİŞTİRMEZ, yalnızca
   tarih ve sayı biçimini belirler. Arayüz dili Türkçe; etiket gerçeği
   söylemeli. Seçenekler kaldırılmadı — biçim ayarı gerçek bir ihtiyaç. */
const LOCALES = ['tr-TR', 'en-US', 'en-GB', 'de-DE']
const CURRENCIES = ['TRY', 'USD', 'EUR']
const WEEK_DAYS = [[0, 'settings.values.weekDays.sunday'], [1, 'settings.values.weekDays.monday'], [2, 'settings.values.weekDays.tuesday'], [3, 'settings.values.weekDays.wednesday'], [4, 'settings.values.weekDays.thursday'], [5, 'settings.values.weekDays.friday'], [6, 'settings.values.weekDays.saturday']]
const ROLE_LABELS = { admin: 'settings.values.roles.admin', content_editor: 'settings.values.roles.editor', learner: 'settings.values.roles.member', student: 'settings.values.roles.member' }
const STAGES = [['idea', 'settings.values.stages.idea'], ['startup', 'settings.values.stages.startup'], ['growth', 'settings.values.stages.growth'], ['established', 'settings.values.stages.established']]

function initials(name = 'LK') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

/*
 * AÇILIŞ BÖLÜMÜ — hem "?bolum=" hem "#bolum" destekleniyor.
 *
 * 🔴 ÖLÇÜLMÜŞ ARIZA (31.08.2026, ürün sahibi bildirdi): kod yalnız
 * SORGU parametresini okuyordu ve izin listesinde 'uyelik' YOKTU.
 * Sonuç: "/app/settings#uyelik" her seferinde 'profile' bölümünü
 * açıyordu — kullanıcı üyelik yerine "Profil ve işletme" görüyordu.
 *
 * Etkilenen dört yer vardı, dördü de kullanıcıyı yanlış bölüme
 * götürüyordu:
 *   - Fiyatlar sayfasındaki "Üyeliğim" düğmesi
 *   - Ödeme sonucu sayfasındaki "Üyelik ayarlarına dön"
 *   - AccountNotification varsayılan bağlantısı ("Ödemeniz alındı")
 *   - Ödeme e-postası şablonundaki bağlantı (mail-templates.ts)
 *
 * İki gelenek de yaşıyor — "?bolum=integrations" dört yerde
 * kullanılıyor ve çalışıyor. Bu yüzden biri diğerine çevrilmedi;
 * ikisi birden okunuyor ve sorgu önceliği koruyor.
 */
export const BOLUMLER = ['profile', 'notifications', 'security', 'privacy', 'integrations', 'uyelik', 'appearance']

/**
 * Bir ayarlar adresinin HANGİ BÖLÜMÜ açtığını çözer.
 *
 * ⚠️ `window`dan okumuyor: saf olması, adresi elde olan başka
 * kodun da (ve testlerin) aynı kuralı çalıştırabilmesini sağlıyor.
 * Kuralı ikinci bir yere kopyalamak, iki yorumun sessizce ayrışması
 * demek olurdu.
 */
export function bolumSec(search = '', hash = '') {
  const sorgu = new URLSearchParams(search).get('bolum')
  if (BOLUMLER.includes(sorgu)) return sorgu
  const temizHash = String(hash).replace(/^#/, '')
  if (BOLUMLER.includes(temizHash)) return temizHash
  /* Bölüm verilmeyen her adres profile düşüyor. Menüde hem
     `/app/settings` hem `?bolum=profile` bulunmasının aynı yere
     gitmesinin sebebi budur. */
  return 'profile'
}

export function acilisBolumu() {
  return bolumSec(window.location.search, window.location.hash)
}

export default function SettingsPage() {
  const { t } = useTranslation('common')
  const { uiLanguage, formatLocale, setUiLanguage, setFormatLocale } = useLocalization()
  const { user, logout, replaceSession, updateUser } = useAuth()
  const { activeWorkspaceId, activeWorkspace } = useWorkspace()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.name || '')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountMsg, setAccountMsg] = useState(null)
  const [emailForm, setEmailForm] = useState({ email: user?.email || '', password: '' })
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailMsg, setEmailMsg] = useState(null)
  const [deleteForm, setDeleteForm] = useState({ password: '', confirmation: '' })
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteMsg, setDeleteMsg] = useState(null)
  const [pw, setPw] = useState({ current: '', next: '', repeat: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState(null)
  const [sessionsSaving, setSessionsSaving] = useState(false)
  const [sessionsMsg, setSessionsMsg] = useState(null)
  const [wsSettings, setWsSettings] = useState(null)
  const [wsSaving, setWsSaving] = useState(false)
  const [wsMsg, setWsMsg] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState(null)
  const [systemInfo, setSystemInfo] = useState(null)
  const [activeSection, setActiveSection] = useState(() => acilisBolumu())
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState(null)
  const [avatarBuyuk, setAvatarBuyuk] = useState(false)
  const [languageSaving, setLanguageSaving] = useState(false)
  const [languageMsg, setLanguageMsg] = useState(null)

  const [consents, setConsents] = useState([])
  const [missingConsents, setMissingConsents] = useState([])
  const [legalDocuments, setLegalDocuments] = useState([])
  const [consentsLoading, setConsentsLoading] = useState(true)
  const [consentsError, setConsentsError] = useState(null)
  const [consentsSaving, setConsentsSaving] = useState(false)
  const [consentsMsg, setConsentsMsg] = useState(null)
  /* Onay bölümünden açılan yasal metin penceresi ('terms' | 'privacy' | null).
     Onay, metnin OKUNABİLMESİNİ gerektirdiği için sürüm numarası yetmez. */
  const [okunanBelge, setOkunanBelge] = useState(null)

  const location = useLocation()
  const isPrivacySection = activeSection === 'privacy' || location.pathname === '/app/settings#yasal'

  useEffect(() => {
    api.onboarding.getProfile().then(setProfile).catch(() => setProfile(null))
    api.system.health().then(setSystemInfo).catch(() => setSystemInfo({ status: 'unavailable', version: '—', database: { label: t('settings.messages.connectionInfoUnavailable'), connected: false } }))
  }, [])

  async function acceptCurrentConsents() {
    setConsentsSaving(true)
    setConsentsMsg(null)
    try {
      await api.auth.acceptConsents()
      const [consentData, legalData] = await Promise.all([
        api.auth.getConsents(),
        api.auth.getLegalDocuments(),
      ])
      setConsents(consentData.accepted || [])
      setMissingConsents(consentData.missing || [])
      setLegalDocuments(legalData.documents || [])
      setConsentsError(null)
      setConsentsMsg({ type: 'ok', text: t('settings.messages.consentsAccepted') })
    } catch (error) {
      setConsentsMsg({ type: 'err', text: error.message || t('settings.messages.consentsError') })
    } finally {
      setConsentsSaving(false)
    }
  }

  useEffect(() => {
    let mounted = true
    setConsentsLoading(true)
    Promise.all([api.auth.getConsents(), api.auth.getLegalDocuments()])
      .then(([consentData, legalData]) => {
        if (mounted) {
          setConsents(consentData.accepted || [])
          setMissingConsents(consentData.missing || [])
          setLegalDocuments(legalData.documents || [])
          setConsentsError(null)
        }
      })
      .catch(err => {
        if (mounted) {
          setConsentsError(err.message)
          setConsents([])
          setMissingConsents([])
          setLegalDocuments([])
        }
      })
      .finally(() => {
        if (mounted) setConsentsLoading(false)
      })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!activeWorkspaceId) { setWsSettings(null); return }
    api.workspace.settings.get(activeWorkspaceId).then(data => {
      setWsSettings(data)
      setFormatLocale(data.locale || 'tr-TR')
    }).catch(() => setWsSettings(null))
  }, [activeWorkspaceId, setFormatLocale])

  async function changeUiLanguage(nextLanguage) {
    if (nextLanguage === uiLanguage || languageSaving) return
    const previous = uiLanguage
    setLanguageSaving(true)
    setLanguageMsg(null)
    await setUiLanguage(nextLanguage)
    try {
      await api.auth.updatePreferences({ uiLanguage: nextLanguage })
      updateUser({ uiLanguage: nextLanguage })
      flash(setLanguageMsg, 'ok', t('language.saved'))
    } catch {
      await setUiLanguage(previous)
      flash(setLanguageMsg, 'err', t('language.saveError'))
    } finally {
      setLanguageSaving(false)
    }
  }

  const [tourMsg, setTourMsg] = useState(null)
  const [tourSaving, setTourSaving] = useState(false)

  const flash = useCallback((setter, type, text) => {
    setter({ type, text })
    window.setTimeout(() => setter(null), 4000)
  }, [])

  async function saveAccount(event) {
    event.preventDefault(); setAccountSaving(true); setAccountMsg(null)
    try { await api.onboarding.updateProfile({ name }); flash(setAccountMsg, 'ok', t('settings.messages.accountSaved')) }
    catch (error) { flash(setAccountMsg, 'err', error.message || t('settings.messages.saveError')) }
    finally { setAccountSaving(false) }
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) return flash(setAvatarMsg, 'err', t('settings.messages.avatarType'))
    if (file.size > 5 * 1024 * 1024) return flash(setAvatarMsg, 'err', t('settings.messages.avatarSize'))
    setAvatarSaving(true)
    try {
      const result = await api.auth.uploadAvatar(file)
      updateUser({ avatarUrl: `${result.avatarUrl}?v=${Date.now()}` })
      flash(setAvatarMsg, 'ok', t('settings.messages.avatarUpdated'))
    } catch (error) { flash(setAvatarMsg, 'err', error.message || t('settings.messages.avatarUploadError')) }
    finally { setAvatarSaving(false) }
  }

  async function removeAvatar() {
    setAvatarSaving(true)
    try {
      await api.auth.removeAvatar()
      updateUser({ avatarUrl: null })
      flash(setAvatarMsg, 'ok', t('settings.messages.avatarRemoved'))
    } catch (error) { flash(setAvatarMsg, 'err', error.message || t('settings.messages.avatarRemoveError')) }
    finally { setAvatarSaving(false) }
  }

  async function savePassword(event) {
    event.preventDefault(); setPwMsg(null)
    if (pw.next.length < 10) return flash(setPwMsg, 'err', t('settings.messages.passwordMinimum'))
    if (pw.next !== pw.repeat) return flash(setPwMsg, 'err', t('settings.messages.passwordMismatch'))
    setPwSaving(true)
    try {
      /* Sunucu sifre degisiminde tum oturumlari iptal edip taze token doner.
         Saklamazsak kullanici kendi cihazindan da atilir. */
      const session = await api.auth.changePassword(pw.current, pw.next)
      if (session?.token) replaceSession(session)
      setPw({ current: '', next: '', repeat: '' })
      flash(setPwMsg, 'ok', t('settings.messages.passwordUpdated'))
    }
    catch (error) { flash(setPwMsg, 'err', error.message || t('settings.messages.passwordError')) }
    finally { setPwSaving(false) }
  }

  /* Şifre değiştirmeden tüm oturumları kapatmak isteyenler için: cihaz
     kaybı ya da bir yerde açık kalmış oturum şüphesi. */
  async function endAllSessions() {
    setSessionsMsg(null); setSessionsSaving(true)
    try {
      const session = await api.auth.logoutAll()
      if (session?.token) replaceSession(session)
      flash(setSessionsMsg, 'ok', t('settings.messages.sessionsClosed'))
    }
    catch (error) { flash(setSessionsMsg, 'err', error.message || t('settings.messages.sessionsError')) }
    finally { setSessionsSaving(false) }
  }

  async function saveEmail(event) {
    event.preventDefault(); setEmailSaving(true); setEmailMsg(null)
    try {
      const session = await api.auth.changeEmail(emailForm.email, emailForm.password)
      replaceSession(session)
      setEmailForm(current => ({ ...current, email: session.user.email, password: '' }))
      flash(setEmailMsg, 'ok', t('settings.messages.emailUpdated'))
    } catch (error) { flash(setEmailMsg, 'err', error.message || t('settings.messages.emailError')) }
    finally { setEmailSaving(false) }
  }

  async function deleteAccount(event) {
    event.preventDefault(); setDeleteMsg(null)
    if (deleteForm.confirmation !== 'HESABIMI SİL') return flash(setDeleteMsg, 'err', t('settings.messages.deleteConfirmation'))
    setDeleteSaving(true)
    try {
      await api.auth.deleteAccount(deleteForm.password, deleteForm.confirmation)
      logout()
      navigate('/login', { replace: true })
    } catch (error) { flash(setDeleteMsg, 'err', error.message || t('settings.messages.deleteError')) }
    finally { setDeleteSaving(false) }
  }

  async function saveWorkspaceSettings(event) {
    event.preventDefault(); setWsSaving(true); setWsMsg(null)
    try {
      const saved = await api.workspace.settings.update(activeWorkspaceId, {
        timezone: wsSettings.timezone,
        locale: wsSettings.locale,
        defaultCurrency: wsSettings.defaultCurrency,
        weekStartsOn: Number(wsSettings.weekStartsOn),
        notificationPrefs: { ...(wsSettings.notificationPrefs || {}), dueReminders: wsSettings.notificationPrefs?.dueReminders !== false },
      })
      setWsSettings(saved); setFormatLocale(saved.locale || 'tr-TR'); flash(setWsMsg, 'ok', t('settings.messages.workspaceSaved'))
    } catch (error) { flash(setWsMsg, 'err', error.message || t('settings.messages.saveError')) }
    finally { setWsSaving(false) }
  }

  async function saveProfile(event) {
    event.preventDefault(); setProfileSaving(true); setProfileMsg(null)
    try {
      await api.onboarding.updateProfile({
        sector: profile.sector || '', city: profile.city || '', businessStage: profile.businessStage || null,
        employeeCount: profile.employeeCount === '' || profile.employeeCount === null ? null : Number(profile.employeeCount),
        primaryGoal: profile.primaryGoal || null,
      })
      flash(setProfileMsg, 'ok', t('settings.messages.businessProfileSaved'))
    } catch (error) { flash(setProfileMsg, 'err', error.message || t('settings.messages.saveError')) }
    finally { setProfileSaving(false) }
  }

  function Message({ msg }) {
    if (!msg) return null
    return <p className={`${styles.message} ${msg.type === 'ok' ? styles.msgOk : styles.msgErr}`} role="status">{msg.type === 'ok' && <Check size={15} />}{msg.text}</p>
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeading}><span>{t('settings.eyebrow')}</span><h1>{t('settings.title')}</h1><p>{t('settings.subtitle')}</p></header>
      {activeSection === 'profile' && <section className={styles.profileHeader}>
        {/* Fotoğraf varsa tıklanabilir: büyütür ve oradan değiştirme/kaldırma
            sunar. Fotoğraf yoksa baş harfler duruyor, tıklanacak bir şey yok. */}
        {user?.avatarUrl ? (
          <button type="button" className={styles.avatarButton} onClick={() => setAvatarBuyuk(true)} aria-label={t('settings.avatar.enlarge')}>
            <span className={styles.avatar}><img src={user.avatarUrl} alt={t('settings.avatar.alt', { name: name || user?.name || t('settings.values.user') })} /></span>
          </button>
        ) : (
          <div className={styles.avatar}>{initials(name || user?.name)}</div>
        )}
        <div className={styles.profileIdentity}><h2>{name || user?.name}</h2><p>{user?.email}</p><div><Badge variant="info">{ROLE_LABELS[user?.role] ? t(ROLE_LABELS[user.role]) : user?.role || t('settings.values.roles.member')}</Badge>{activeWorkspace?.name && <Badge>{activeWorkspace.name}</Badge>}</div>
          <div className={styles.avatarActions}>
            <label className={styles.avatarUpload}><ImageUp size={15} />{avatarSaving ? t('settings.avatar.processing') : user?.avatarUrl ? t('settings.avatar.change') : t('settings.avatar.add')}<input type="file" accept="image/png,image/jpeg" onChange={uploadAvatar} disabled={avatarSaving} /></label>
            {user?.avatarUrl && <button type="button" onClick={removeAvatar} disabled={avatarSaving}>{t('settings.avatar.remove')}</button>}
          </div>
          <Message msg={avatarMsg} />
        </div>

        {avatarBuyuk && user?.avatarUrl && (
          <ImageViewer
            url={user.avatarUrl}
            alt={t('settings.avatar.alt', { name: name || user?.name || t('settings.values.user') })}
            onClose={() => setAvatarBuyuk(false)}
            actions={
              <>
                {/* Aynı yükleme akışı; dosya seçilince görüntüleyici kapanır
                    ki kullanıcı yeni fotoğrafı listede görsün. */}
                <label className={styles.viewerAction}>
                  <ImageUp size={15} />
                  {avatarSaving ? t('settings.avatar.processing') : t('settings.avatar.change')}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={event => { setAvatarBuyuk(false); uploadAvatar(event) }}
                    disabled={avatarSaving}
                  />
                </label>
                <button
                  type="button"
                  className={`${styles.viewerAction} ${styles.viewerDanger}`}
                  onClick={async () => { setAvatarBuyuk(false); await removeAvatar() }}
                  disabled={avatarSaving}
                >
                  <Trash2 size={15} /> {t('settings.avatar.remove')}
                </button>
              </>
            }
          />
        )}
      </section>}

      <div className={styles.settingsShell}>
        <nav className={styles.settingsNav} aria-label={t('settings.sectionsAria')}>
          <button className={activeSection === 'profile' ? styles.activeNav : ''} onClick={() => setActiveSection('profile')}><User size={17} /> {t('settings.profileBusiness')}</button>
          <button className={activeSection === 'integrations' ? styles.activeNav : ''} onClick={() => setActiveSection('integrations')}><Store size={17} /> {t('settings.integrations')}</button>
          <button className={activeSection === 'notifications' ? styles.activeNav : ''} onClick={() => setActiveSection('notifications')}><Bell size={17} /> {t('settings.notifications')}</button>
          <button className={activeSection === 'uyelik' ? styles.activeNav : ''} onClick={() => setActiveSection('uyelik')}><CreditCard size={17} /> {t('settings.membership.title')}</button>
          <button className={activeSection === 'appearance' ? styles.activeNav : ''} onClick={() => setActiveSection('appearance')}><Laptop size={17} /> {t('settings.accessibility')}</button>
          <button className={activeSection === 'security' ? styles.activeNav : ''} onClick={() => setActiveSection('security')}><ShieldCheck size={17} /> {t('settings.security')}</button>
          <button className={activeSection === 'privacy' ? styles.activeNav : ''} onClick={() => setActiveSection('privacy')}><Scale size={17} /> {t('settings.privacy')}</button>
        </nav>
        <div className={`${styles.flow} ${styles[`show_${activeSection}`]}`}>
          <SettingsSection id="hesap" icon={<User />} title={t('settings.account.title')} description={t('settings.account.description')}>
            <form onSubmit={saveAccount}><Field label={t('settings.fields.displayName')}><input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={100} required /></Field><Readonly label={t('settings.fields.email')} value={user?.email} /><Readonly label={t('settings.fields.accountRole')} value={ROLE_LABELS[user?.role] ? t(ROLE_LABELS[user.role]) : user?.role || t('settings.values.roles.member')} /><Footer message={<Message msg={accountMsg} />}><Button type="submit" disabled={accountSaving}>{accountSaving ? t('buttons.saving') : t('settings.actions.saveChanges')}</Button></Footer></form>
          </SettingsSection>

          <SettingsSection id="eposta" icon={<Mail />} title={t('settings.email.title')} description={t('settings.email.description')}>
            <form onSubmit={saveEmail}><Field label={t('settings.fields.newEmail')}><input type="email" autoComplete="email" value={emailForm.email} onChange={event => setEmailForm(current => ({ ...current, email: event.target.value }))} required /></Field><Field label={t('settings.fields.currentPassword')} hint={t('settings.email.passwordHint')}><PasswordInput overlay wrapClassName={styles.pwWrap} autoComplete="current-password" value={emailForm.password} onChange={event => setEmailForm(current => ({ ...current, password: event.target.value }))} required /></Field><Footer message={<Message msg={emailMsg} />}><Button type="submit" disabled={emailSaving}>{emailSaving ? t('settings.actions.updating') : t('settings.actions.changeEmail')}</Button></Footer></form>
          </SettingsSection>

          <SettingsSection id="guvenlik" icon={<ShieldCheck />} title={t('settings.securitySection.title')} description={t('settings.securitySection.description')}>
            <form onSubmit={savePassword}><Field label={t('settings.fields.currentPassword')}><PasswordInput overlay wrapClassName={styles.pwWrap} autoComplete="current-password" value={pw.current} onChange={event => setPw(current => ({ ...current, current: event.target.value }))} required /></Field><div className={styles.twoFields}><Field label={t('settings.fields.newPassword')} hint={t('settings.fields.passwordMinimum')}><PasswordInput overlay wrapClassName={styles.pwWrap} autoComplete="new-password" minLength={10} value={pw.next} onChange={event => setPw(current => ({ ...current, next: event.target.value }))} required /></Field><Field label={t('settings.fields.repeatPassword')}><PasswordInput overlay wrapClassName={styles.pwWrap} autoComplete="new-password" value={pw.repeat} onChange={event => setPw(current => ({ ...current, repeat: event.target.value }))} required /></Field></div><Footer message={<Message msg={pwMsg} />}><Button type="submit" disabled={pwSaving}>{pwSaving ? t('settings.actions.updating') : t('settings.actions.changePassword')}</Button></Footer></form>
            <div className={styles.switchRow}>
              <span><strong>{t('settings.sessions.title')}</strong><small>{t('settings.sessions.description')}</small></span>
              <Button type="button" onClick={endAllSessions} disabled={sessionsSaving}>{sessionsSaving ? t('settings.sessions.closing') : t('settings.sessions.signOutOthers')}</Button>
            </div>
            <Message msg={sessionsMsg} />
          </SettingsSection>

          <SettingsSection id="gorunum" icon={<Laptop />} title={t('settings.appearance.title')} description={t('settings.appearance.description')}>
            <div className={styles.themeGrid}><ThemeChoice active={theme === 'light'} icon={<Sun />} title="Persian Mosaic" text={t('settings.appearance.lightDescription')} onClick={() => setTheme('light')} /><ThemeChoice active={theme === 'dark'} icon={<Moon />} title="Midnight Premium" text={t('settings.appearance.darkDescription')} onClick={() => setTheme('dark')} /></div>
          </SettingsSection>

          {/* Tur, profil ANKETINDEN ayri sifirlanir: ikisi ayri bayrak
              tasiyor, bu yuzden "turu tekrar goster" anketi geri
              getirmez. */}
          <SettingsSection id="karsilama-turu" icon={<Compass />} title={t('settings.welcomeTour.title')} description={t('settings.welcomeTour.description')}>
            <Footer message={<Message msg={tourMsg} />}>
              <Button
                variant="secondary"
                disabled={tourSaving}
                onClick={async () => {
                  setTourSaving(true)
                  try {
                    await api.onboarding.resetTour()
                    flash(setTourMsg, 'ok', t('settings.messages.tourReset'))
                  } catch (err) {
                    flash(setTourMsg, 'error', err.message || t('settings.messages.tourResetError'))
                  } finally {
                    setTourSaving(false)
                  }
                }}
              >
                {tourSaving ? t('settings.welcomeTour.resetting') : t('settings.welcomeTour.showAgain')}
              </Button>
            </Footer>
          </SettingsSection>

          <SettingsSection id="bildirimler" icon={<Bell />} title={t('settings.notificationsSection.title')} description={t('settings.notificationsSection.description')}>
            {!activeWorkspaceId || !wsSettings ? <p className={styles.muted}>{t('settings.notificationsSection.selectBusiness')}</p> : <label className={styles.switchRow}><span><strong>{t('settings.notificationsSection.reminders')}</strong><small>{t('settings.notificationsSection.remindersDescription')}</small></span><input type="checkbox" checked={wsSettings.notificationPrefs?.dueReminders !== false} onChange={event => setWsSettings(current => ({ ...current, notificationPrefs: { ...(current.notificationPrefs || {}), dueReminders: event.target.checked } }))} /></label>}
          </SettingsSection>

          {/* Üyelik durumu SAKLANMIYOR, /auth/me'de türetiliyor.
              Ücretlendirme başlamadıysa bileşen dürüst hâli gösterir. */}
          <SettingsSection id="uyelik" icon={<CreditCard />} title={t('settings.membership.title')} description={t('settings.membership.description')}>
            <MembershipSettings membership={user?.membership} />
          </SettingsSection>

          <SettingsSection id="arayuz-dili" icon={<Compass />} title={t('language.uiLanguage')} description={t('settings.uiLanguageDescription')}>
            <div className={styles.twoFields}>
              <Field label={t('language.uiLanguage')}>
                <Select
                  aria-label={t('language.uiLanguage')}
                  options={[{ value: 'tr', label: t('language.turkish') }, { value: 'en', label: t('language.english') }]}
                  value={uiLanguage}
                  onChange={changeUiLanguage}
                  disabled={languageSaving}
                />
              </Field>
            </div>
            <Message msg={languageMsg} />
          </SettingsSection>

          <SettingsSection id="isletme-ayarlari" icon={<Building2 />} title={t('settings.workspacePreferences.title')} description={t('settings.workspacePreferences.description')}>
            {!activeWorkspaceId ? <div className={styles.emptyBlock}><p>{t('settings.workspacePreferences.createBusiness')}</p><Button onClick={() => navigate('/app/workspaces')}>{t('settings.workspacePreferences.goToTracking')}</Button></div> : !wsSettings ? <p className={styles.muted}>{t('states.loading')}</p> : <form onSubmit={saveWorkspaceSettings}><div className={styles.twoFields}><Field label={t('settings.fields.timezone')}><Select options={TIMEZONES.map(value => ({ value, label: value }))} value={wsSettings.timezone} onChange={v => setWsSettings(current => ({ ...current, timezone: v }))} /></Field><Field label={t('language.formatLocale')} hint={t('language.formatHint')}><Select options={LOCALES.map(value => ({ value, label: t(`formatLocales.${value}`) }))} value={wsSettings.locale || formatLocale} onChange={v => setWsSettings(current => ({ ...current, locale: v }))} /></Field><Field label={t('settings.fields.currency')}><Select options={CURRENCIES.map(value => ({ value, label: value }))} value={wsSettings.defaultCurrency} onChange={v => setWsSettings(current => ({ ...current, defaultCurrency: v }))} /></Field><Field label={t('settings.fields.weekStartsOn')}><Select options={WEEK_DAYS.map(([value, labelKey]) => ({ value: String(value), label: t(labelKey) }))} value={String(wsSettings.weekStartsOn)} onChange={v => setWsSettings(current => ({ ...current, weekStartsOn: Number(v) }))} /></Field></div><Footer message={<Message msg={wsMsg} />}><Button type="submit" disabled={wsSaving}>{wsSaving ? t('buttons.saving') : t('buttons.save')}</Button></Footer></form>}
          </SettingsSection>

          {profile && <SettingsSection id="isletme-profili" icon={<BriefcaseBusiness />} title={t('settings.businessProfile.title')} description={t('settings.businessProfile.description')}><form onSubmit={saveProfile}><div className={styles.twoFields}><Field label={t('settings.fields.sector')}><input value={profile.sector || ''} onChange={event => setProfile(current => ({ ...current, sector: event.target.value }))} /></Field><Field label={t('settings.fields.city')}><input value={profile.city || ''} onChange={event => setProfile(current => ({ ...current, city: event.target.value }))} /></Field><Field label={t('settings.fields.businessStage')}><Select placeholder={t('settings.values.notSelected')} options={STAGES.map(([value, labelKey]) => ({ value, label: t(labelKey) }))} value={profile.businessStage || ''} onChange={v => setProfile(current => ({ ...current, businessStage: v }))} /></Field><Field label={t('settings.fields.employeeCount')}><input type="number" min="0" value={profile.employeeCount ?? ''} onChange={event => setProfile(current => ({ ...current, employeeCount: event.target.value }))} /></Field></div><Field label={t('settings.fields.primaryGoal')}><input value={profile.primaryGoal || ''} onChange={event => setProfile(current => ({ ...current, primaryGoal: event.target.value }))} /></Field><Footer message={<Message msg={profileMsg} />}><Button type="submit" disabled={profileSaving}>{profileSaving ? t('buttons.saving') : t('settings.actions.saveProfile')}</Button></Footer></form></SettingsSection>}

          {/* Pazaryeri entegrasyonlari: baglanti yalnizca etkin isletmeye
              yapilir; credential'lar sifrelidir ve geri gosterilmez. */}
          <section id="entegrasyonlar" className={styles.card}>
            <header className={styles.cardHeader}>
              <span><Store /></span>
              <div>
                <h2>{t('settings.integrations')}</h2>
                <p>{t('settings.integrationDescription')}</p>
              </div>
            </header>
            <div className={styles.cardBody}>
              <IntegrationsPanel />
            </div>
          </section>

          <SettingsSection id="yasal" icon={<Scale />} title={t('settings.legal.title')} description={t('settings.legal.description')}>
            <div className={styles.legalLinks}><button type="button" onClick={() => navigate('/hakkinda')}>{t('settings.legal.about')}</button><button type="button" onClick={() => navigate('/privacy')}>{t('settings.legal.privacy')}</button><button type="button" onClick={() => navigate('/terms')}>{t('settings.legal.terms')}</button><button type="button" onClick={() => navigate('/cookies')}>{t('settings.legal.cookies')}</button><button type="button" onClick={() => navigate('/on-bilgilendirme')}>{t('publicFooter.links.preInfo')}</button><button type="button" onClick={() => navigate('/mesafeli-satis')}>{t('publicFooter.links.distanceSale')}</button><button type="button" onClick={() => navigate('/teslimat-iade')}>{t('publicFooter.links.deliveryRefund')}</button><button type="button" onClick={() => navigate('/abonelik')}>{t('publicFooter.links.subscription')}</button></div>
          </SettingsSection>

          <SettingsSection id="onay-bilgileri" icon={<Scale />} title={t('settings.consents.title')} description={t('settings.consents.description')}>
            <div className={styles.consentInfo}>
              {consentsLoading ? (
                <div className={styles.consentLoading}>{t('states.loading')}</div>
              ) : consentsError ? (
                <div className={styles.consentError}>{t('settings.consents.loadError')}: {consentsError}</div>
              ) : (
                <>
                  {legalDocuments.filter(d => d.requiredAtSignup).map(doc => {
                    const accepted = consents.find(k => k.documentType === doc.type)
                    return (
                      <div className={styles.consentDocument} key={doc.type}>
                        <strong className={styles.consentDocumentTitle}>{doc.title}</strong>
                        {/* Metin penceresi kayıt formundakiyle AYNI bileşen
                            (LegalModal); ikinci bir gösterim yazılmadı. */}
                        <button type="button" className={styles.consentReadButton} onClick={() => setOkunanBelge(doc.type)}>
                          {t('settings.consents.readText')}
                        </button>
                        <div className={styles.consentRow}>
                          <span>{t('settings.consents.currentVersion')}</span>
                          <strong>{doc.version || '—'}</strong>
                        </div>
                        <div className={styles.consentRow}>
                          <span>{t('settings.consents.acceptedVersion')}</span>
                          <strong>{accepted?.version || t('settings.consents.notAccepted')}</strong>
                        </div>
                        {accepted?.acceptedAt && (
                          <div className={styles.consentRow}>
                            <span>{t('settings.consents.lastAccepted')}</span>
                            <strong>{new Date(accepted.acceptedAt).toLocaleString(formatLocale, { dateStyle: 'short', timeStyle: 'short' })}</strong>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div className={styles.consentStatus}>
                    {(() => {
                      if (missingConsents.length === 0) {
                        return <span className={styles.consentOk}>{t('settings.consents.upToDate')}</span>
                      }
                      if (missingConsents.some(m => m.type === 'privacy')) {
                        return <span className={styles.consentWarn}>{t('settings.consents.reviewRequired')}</span>
                      }
                      return <span className={styles.consentWarn}>{t('settings.consents.pending')}</span>
                    })()}
                  </div>
                  {missingConsents.length > 0 && (
                    <div className={styles.consentActions}>
                      <Button type="button" onClick={acceptCurrentConsents} disabled={consentsSaving}>
                        {consentsSaving ? t('consentBanner.accepting') : t('settings.consents.acceptCurrent')}
                      </Button>
                    </div>
                  )}
                  <Message msg={consentsMsg} />
                </>
              )}
            </div>
          </SettingsSection>

          {/* Onay bölümündeki "Metni oku" bağlantısının penceresi. */}
          <LegalModal type={okunanBelge} open={Boolean(okunanBelge)} onClose={() => setOkunanBelge(null)} />

          <section id="hesap-sil" className={`${styles.card} ${styles.dangerCard}`}><header className={styles.cardHeader}><span><Trash2 /></span><div><h2>{t('settings.deleteAccount.title')}</h2><p>{t('settings.deleteAccount.description')}</p></div></header><div className={styles.cardBody}><form onSubmit={deleteAccount}><div className={styles.dangerNotice}>{t('settings.deleteAccount.warning')}</div><Field label={t('settings.fields.currentPassword')}><PasswordInput overlay wrapClassName={styles.pwWrap} autoComplete="current-password" value={deleteForm.password} onChange={event => setDeleteForm(current => ({ ...current, password: event.target.value }))} required /></Field><Field label={t('settings.deleteAccount.confirmationLabel')}><input value={deleteForm.confirmation} onChange={event => setDeleteForm(current => ({ ...current, confirmation: event.target.value }))} placeholder="HESABIMI SİL" required /></Field><Footer message={<Message msg={deleteMsg} />}><button type="submit" className={styles.deleteButton} disabled={deleteSaving}>{deleteSaving ? t('settings.deleteAccount.deleting') : t('settings.deleteAccount.action')}</button></Footer></form></div></section>

          <SettingsSection id="uygulama" icon={<Info />} title={t('settings.appInfo.title')} description={t('settings.appInfo.description')}><Readonly label={t('settings.appInfo.version')} value={systemInfo?.version || t('states.loading')} /><Readonly label={t('settings.appInfo.server')} value="Node.js + Fastify" /><Readonly label={t('settings.appInfo.database')} value={systemInfo?.database?.label || t('states.loading')} /><Readonly label={t('settings.appInfo.connection')} value={systemInfo?.database?.connected ? t('states.connected') : t('settings.appInfo.checking')} /></SettingsSection>
        </div>
      </div>
    </main>
  )
}

function SettingsSection({ id, icon, title, description, children }) { return <section id={id} className={styles.card}><header className={styles.cardHeader}><span>{icon}</span><div><h2>{title}</h2><p>{description}</p></div></header><div className={styles.cardBody}>{children}</div></section> }
function Field({ label, hint, children }) { return <label className={styles.field}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label> }
function Readonly({ label, value }) { return <div className={styles.readonlyRow}><span>{label}</span><strong>{value || '—'}</strong></div> }
function Footer({ message, children }) { return <div className={styles.sectionFoot}>{message}<div>{children}</div></div> }
function ThemeChoice({ active, icon, title, text, onClick }) { return <button type="button" className={`${styles.themeChoice} ${active ? styles.themeActive : ''}`} onClick={onClick}>{icon}<span><strong>{title}</strong><small>{text}</small></span>{active && <Check size={17} />}</button> }
