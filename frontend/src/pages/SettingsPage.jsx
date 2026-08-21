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
  Sun,
  Trash2,
  User,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useTheme } from '@/context/ThemeContext'
import { api } from '@/services/api'
import { Badge, Button, Select } from '@/components/ui'
import PasswordInput from '@/components/ui/PasswordInput'
import ImageViewer from '@/components/ui/ImageViewer'
import styles from './SettingsPage.module.css'

const TIMEZONES = ['Europe/Istanbul', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'Asia/Dubai', 'UTC']
const LOCALES = [['tr-TR', 'Türkçe (Türkiye)'], ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['de-DE', 'Deutsch']]
const CURRENCIES = ['TRY', 'USD', 'EUR']
const WEEK_DAYS = [[0, 'Pazar'], [1, 'Pazartesi'], [2, 'Salı'], [3, 'Çarşamba'], [4, 'Perşembe'], [5, 'Cuma'], [6, 'Cumartesi']]
const ROLE_LABELS = { admin: 'Yönetici', content_editor: 'Editör', learner: 'Üye', student: 'Üye' }
const STAGES = [['idea', 'Fikir aşaması'], ['startup', 'Yeni işletme'], ['growth', 'Büyüme'], ['established', 'Yerleşik işletme']]

function initials(name = 'LK') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

export default function SettingsPage() {
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
  const [activeSection, setActiveSection] = useState('profile')
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState(null)
  const [avatarBuyuk, setAvatarBuyuk] = useState(false)

  const [consents, setConsents] = useState([])
  const [missingConsents, setMissingConsents] = useState([])
  const [legalDocuments, setLegalDocuments] = useState([])
  const [consentsLoading, setConsentsLoading] = useState(true)
  const [consentsError, setConsentsError] = useState(null)

  const location = useLocation()
  const isPrivacySection = activeSection === 'privacy' || location.pathname === '/app/settings#yasal'

  useEffect(() => {
    api.onboarding.getProfile().then(setProfile).catch(() => setProfile(null))
    api.system.health().then(setSystemInfo).catch(() => setSystemInfo({ status: 'unavailable', version: '—', database: { label: 'Bağlantı bilgisi alınamadı', connected: false } }))
  }, [])

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
    api.workspace.settings.get(activeWorkspaceId).then(setWsSettings).catch(() => setWsSettings(null))
  }, [activeWorkspaceId])

  const [tourMsg, setTourMsg] = useState(null)
  const [tourSaving, setTourSaving] = useState(false)

  const flash = useCallback((setter, type, text) => {
    setter({ type, text })
    window.setTimeout(() => setter(null), 4000)
  }, [])

  async function saveAccount(event) {
    event.preventDefault(); setAccountSaving(true); setAccountMsg(null)
    try { await api.onboarding.updateProfile({ name }); flash(setAccountMsg, 'ok', 'Hesap bilgileri kaydedildi.') }
    catch (error) { flash(setAccountMsg, 'err', error.message || 'Kaydedilemedi.') }
    finally { setAccountSaving(false) }
  }

  async function uploadAvatar(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type)) return flash(setAvatarMsg, 'err', 'Yalnız PNG veya JPEG fotoğraf yükleyin.')
    if (file.size > 5 * 1024 * 1024) return flash(setAvatarMsg, 'err', 'Profil fotoğrafı en fazla 5 MB olabilir.')
    setAvatarSaving(true)
    try {
      const result = await api.auth.uploadAvatar(file)
      updateUser({ avatarUrl: `${result.avatarUrl}?v=${Date.now()}` })
      flash(setAvatarMsg, 'ok', 'Profil fotoğrafınız güncellendi.')
    } catch (error) { flash(setAvatarMsg, 'err', error.message || 'Fotoğraf yüklenemedi.') }
    finally { setAvatarSaving(false) }
  }

  async function removeAvatar() {
    setAvatarSaving(true)
    try {
      await api.auth.removeAvatar()
      updateUser({ avatarUrl: null })
      flash(setAvatarMsg, 'ok', 'Profil fotoğrafı kaldırıldı.')
    } catch (error) { flash(setAvatarMsg, 'err', error.message || 'Fotoğraf kaldırılamadı.') }
    finally { setAvatarSaving(false) }
  }

  async function savePassword(event) {
    event.preventDefault(); setPwMsg(null)
    if (pw.next.length < 10) return flash(setPwMsg, 'err', 'Yeni şifre en az 10 karakter olmalı.')
    if (pw.next !== pw.repeat) return flash(setPwMsg, 'err', 'Yeni şifreler eşleşmiyor.')
    setPwSaving(true)
    try {
      /* Sunucu sifre degisiminde tum oturumlari iptal edip taze token doner.
         Saklamazsak kullanici kendi cihazindan da atilir. */
      const session = await api.auth.changePassword(pw.current, pw.next)
      if (session?.token) replaceSession(session)
      setPw({ current: '', next: '', repeat: '' })
      flash(setPwMsg, 'ok', 'Şifreniz güncellendi. Diğer cihazlardaki oturumlar kapatıldı.')
    }
    catch (error) { flash(setPwMsg, 'err', error.message || 'Şifre değiştirilemedi.') }
    finally { setPwSaving(false) }
  }

  /* Şifre değiştirmeden tüm oturumları kapatmak isteyenler için: cihaz
     kaybı ya da bir yerde açık kalmış oturum şüphesi. */
  async function endAllSessions() {
    setSessionsMsg(null); setSessionsSaving(true)
    try {
      const session = await api.auth.logoutAll()
      if (session?.token) replaceSession(session)
      flash(setSessionsMsg, 'ok', 'Diğer tüm cihazlardaki oturumlar kapatıldı.')
    }
    catch (error) { flash(setSessionsMsg, 'err', error.message || 'Oturumlar kapatılamadı.') }
    finally { setSessionsSaving(false) }
  }

  async function saveEmail(event) {
    event.preventDefault(); setEmailSaving(true); setEmailMsg(null)
    try {
      const session = await api.auth.changeEmail(emailForm.email, emailForm.password)
      replaceSession(session)
      setEmailForm(current => ({ ...current, email: session.user.email, password: '' }))
      flash(setEmailMsg, 'ok', 'E-posta adresiniz güncellendi.')
    } catch (error) { flash(setEmailMsg, 'err', error.message || 'E-posta değiştirilemedi.') }
    finally { setEmailSaving(false) }
  }

  async function deleteAccount(event) {
    event.preventDefault(); setDeleteMsg(null)
    if (deleteForm.confirmation !== 'HESABIMI SİL') return flash(setDeleteMsg, 'err', 'Onay alanına HESABIMI SİL yazın.')
    setDeleteSaving(true)
    try {
      await api.auth.deleteAccount(deleteForm.password, deleteForm.confirmation)
      logout()
      navigate('/login', { replace: true })
    } catch (error) { flash(setDeleteMsg, 'err', error.message || 'Hesap silinemedi.') }
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
      setWsSettings(saved); flash(setWsMsg, 'ok', 'İşletme tercihleri kaydedildi.')
    } catch (error) { flash(setWsMsg, 'err', error.message || 'Kaydedilemedi.') }
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
      flash(setProfileMsg, 'ok', 'İşletme profili kaydedildi.')
    } catch (error) { flash(setProfileMsg, 'err', error.message || 'Kaydedilemedi.') }
    finally { setProfileSaving(false) }
  }

  function Message({ msg }) {
    if (!msg) return null
    return <p className={`${styles.message} ${msg.type === 'ok' ? styles.msgOk : styles.msgErr}`} role="status">{msg.type === 'ok' && <Check size={15} />}{msg.text}</p>
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeading}><span>HESAP MERKEZİ</span><h1>Ayarlar ve Profil</h1><p>Profil, işletme, güvenlik ve erişilebilirlik tercihlerinizi yönetin.</p></header>
      {activeSection === 'profile' && <section className={styles.profileHeader}>
        {/* Fotoğraf varsa tıklanabilir: büyütür ve oradan değiştirme/kaldırma
            sunar. Fotoğraf yoksa baş harfler duruyor, tıklanacak bir şey yok. */}
        {user?.avatarUrl ? (
          <button type="button" className={styles.avatarButton} onClick={() => setAvatarBuyuk(true)} aria-label="Profil fotoğrafını büyüt">
            <span className={styles.avatar}><img src={user.avatarUrl} alt={`${name || user?.name || 'Kullanıcı'} profil fotoğrafı`} /></span>
          </button>
        ) : (
          <div className={styles.avatar}>{initials(name || user?.name)}</div>
        )}
        <div className={styles.profileIdentity}><h2>{name || user?.name}</h2><p>{user?.email}</p><div><Badge variant="info">{ROLE_LABELS[user?.role] || user?.role || 'Üye'}</Badge>{activeWorkspace?.name && <Badge>{activeWorkspace.name}</Badge>}</div>
          <div className={styles.avatarActions}>
            <label className={styles.avatarUpload}><ImageUp size={15} />{avatarSaving ? 'İşleniyor…' : user?.avatarUrl ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}<input type="file" accept="image/png,image/jpeg" onChange={uploadAvatar} disabled={avatarSaving} /></label>
            {user?.avatarUrl && <button type="button" onClick={removeAvatar} disabled={avatarSaving}>Kaldır</button>}
          </div>
          <Message msg={avatarMsg} />
        </div>

        {avatarBuyuk && user?.avatarUrl && (
          <ImageViewer
            url={user.avatarUrl}
            alt={`${name || user?.name || 'Kullanıcı'} profil fotoğrafı`}
            onClose={() => setAvatarBuyuk(false)}
            actions={
              <>
                {/* Aynı yükleme akışı; dosya seçilince görüntüleyici kapanır
                    ki kullanıcı yeni fotoğrafı listede görsün. */}
                <label className={styles.viewerAction}>
                  <ImageUp size={15} />
                  {avatarSaving ? 'İşleniyor…' : 'Fotoğrafı değiştir'}
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
                  <Trash2 size={15} /> Kaldır
                </button>
              </>
            }
          />
        )}
      </section>}

      <div className={styles.settingsShell}>
        <nav className={styles.settingsNav} aria-label="Ayar bölümleri">
          <button className={activeSection === 'profile' ? styles.activeNav : ''} onClick={() => setActiveSection('profile')}><User size={17} /> Profil ve işletme</button>
          <button className={activeSection === 'notifications' ? styles.activeNav : ''} onClick={() => setActiveSection('notifications')}><Bell size={17} /> Bildirimler</button>
          <button className={activeSection === 'appearance' ? styles.activeNav : ''} onClick={() => setActiveSection('appearance')}><Laptop size={17} /> Erişilebilirlik</button>
          <button className={activeSection === 'security' ? styles.activeNav : ''} onClick={() => setActiveSection('security')}><ShieldCheck size={17} /> Güvenlik</button>
          <button className={activeSection === 'privacy' ? styles.activeNav : ''} onClick={() => setActiveSection('privacy')}><Scale size={17} /> Veri ve gizlilik</button>
        </nav>
        <div className={`${styles.flow} ${styles[`show_${activeSection}`]}`}>
          <SettingsSection id="hesap" icon={<User />} title="Hesap bilgileri" description="Hesabınızda görünen temel kimlik bilgileri.">
            <form onSubmit={saveAccount}><Field label="Görünen ad"><input value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={100} required /></Field><Readonly label="E-posta" value={user?.email} /><Readonly label="Hesap rolü" value={ROLE_LABELS[user?.role] || user?.role || 'Üye'} /><Footer message={<Message msg={accountMsg} />}><Button type="submit" disabled={accountSaving}>{accountSaving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</Button></Footer></form>
          </SettingsSection>

          <SettingsSection id="eposta" icon={<Mail />} title="E-posta adresi" description="Giriş yaptığınız e-posta adresini mevcut şifrenizle güvenli biçimde değiştirin.">
            <form onSubmit={saveEmail}><Field label="Yeni e-posta"><input type="email" autoComplete="email" value={emailForm.email} onChange={event => setEmailForm(current => ({ ...current, email: event.target.value }))} required /></Field><Field label="Mevcut şifre" hint="Değişikliği doğrulamak için gereklidir."><PasswordInput overlay wrapClassName={styles.pwWrap} autoComplete="current-password" value={emailForm.password} onChange={event => setEmailForm(current => ({ ...current, password: event.target.value }))} required /></Field><Footer message={<Message msg={emailMsg} />}><Button type="submit" disabled={emailSaving}>{emailSaving ? 'Güncelleniyor…' : 'E-postayı değiştir'}</Button></Footer></form>
          </SettingsSection>

          <SettingsSection id="guvenlik" icon={<ShieldCheck />} title="Güvenlik" description="Parolanızı düzenli aralıklarla yenileyin; yeni parola eskisiyle aynı olamaz.">
            <form onSubmit={savePassword}><Field label="Mevcut şifre"><PasswordInput overlay wrapClassName={styles.pwWrap} autoComplete="current-password" value={pw.current} onChange={event => setPw(current => ({ ...current, current: event.target.value }))} required /></Field><div className={styles.twoFields}><Field label="Yeni şifre" hint="En az 10 karakter"><PasswordInput overlay wrapClassName={styles.pwWrap} autoComplete="new-password" minLength={10} value={pw.next} onChange={event => setPw(current => ({ ...current, next: event.target.value }))} required /></Field><Field label="Yeni şifre tekrar"><PasswordInput overlay wrapClassName={styles.pwWrap} autoComplete="new-password" value={pw.repeat} onChange={event => setPw(current => ({ ...current, repeat: event.target.value }))} required /></Field></div><Footer message={<Message msg={pwMsg} />}><Button type="submit" disabled={pwSaving}>{pwSaving ? 'Güncelleniyor…' : 'Şifreyi değiştir'}</Button></Footer></form>
            <div className={styles.switchRow}>
              <span><strong>Açık oturumlar</strong><small>Cihazınızı kaybettiyseniz veya bir yerde oturumunuzu açık bıraktıysanız, şifrenizi değiştirmeden diğer tüm oturumları kapatabilirsiniz. Bu cihazda oturumunuz açık kalır.</small></span>
              <Button type="button" onClick={endAllSessions} disabled={sessionsSaving}>{sessionsSaving ? 'Kapatılıyor…' : 'Diğer cihazlardan çık'}</Button>
            </div>
            <Message msg={sessionsMsg} />
          </SettingsSection>

          <SettingsSection id="gorunum" icon={<Laptop />} title="Görünüm" description="Tema tercihiniz bu cihazda saklanır ve tüm LocalKarar ekranlarına uygulanır.">
            <div className={styles.themeGrid}><ThemeChoice active={theme === 'light'} icon={<Sun />} title="Persian Mosaic" text="Açık, serin ve yüksek okunabilirlik." onClick={() => setTheme('light')} /><ThemeChoice active={theme === 'dark'} icon={<Moon />} title="Midnight Premium" text="Koyu yüzeyler ve canlı cyan vurgu." onClick={() => setTheme('dark')} /></div>
          </SettingsSection>

          {/* Tur, profil ANKETINDEN ayri sifirlanir: ikisi ayri bayrak
              tasiyor, bu yuzden "turu tekrar goster" anketi geri
              getirmez. */}
          <SettingsSection id="karsilama-turu" icon={<Compass />} title="Karşılama turu" description="Uygulamanın bölümlerini tanıtan kısa turu yeniden izleyebilirsiniz.">
            <Footer message={<Message msg={tourMsg} />}>
              <Button
                variant="secondary"
                disabled={tourSaving}
                onClick={async () => {
                  setTourSaving(true)
                  try {
                    await api.onboarding.resetTour()
                    flash(setTourMsg, 'ok', "Tur sıfırlandı. Ana Sayfa’ya gidince yeniden başlayacak.")
                  } catch (err) {
                    flash(setTourMsg, 'error', err.message || 'Tur sıfırlanamadı.')
                  } finally {
                    setTourSaving(false)
                  }
                }}
              >
                {tourSaving ? 'Sıfırlanıyor…' : 'Turu yeniden göster'}
              </Button>
            </Footer>
          </SettingsSection>

          <SettingsSection id="bildirimler" icon={<Bell />} title="Bildirimler" description="İşletme kayıtlarının yaklaşan tarihleri için uygulama içi uyarıları yönetin.">
            {!activeWorkspaceId || !wsSettings ? <p className={styles.muted}>Bildirim tercihi için etkin bir işletme seçin.</p> : <label className={styles.switchRow}><span><strong>Yaklaşan kayıt hatırlatmaları</strong><small>Ödeme, tahsilat ve diğer tarihli kayıtlar yaklaşınca bildirim oluşturur.</small></span><input type="checkbox" checked={wsSettings.notificationPrefs?.dueReminders !== false} onChange={event => setWsSettings(current => ({ ...current, notificationPrefs: { ...(current.notificationPrefs || {}), dueReminders: event.target.checked } }))} /></label>}
          </SettingsSection>

          <SettingsSection id="isletme-ayarlari" icon={<Building2 />} title="İşletme tercihleri" description="Tarih, dil ve para gösterimini etkin işletmeniz için belirleyin.">
            {!activeWorkspaceId ? <div className={styles.emptyBlock}><p>Tercihleri düzenlemek için bir işletme profili oluşturun.</p><Button onClick={() => navigate('/app/workspaces')}>İşletme Takibi’ne git</Button></div> : !wsSettings ? <p className={styles.muted}>Ayarlar yükleniyor…</p> : <form onSubmit={saveWorkspaceSettings}><div className={styles.twoFields}><Field label="Saat dilimi"><Select options={TIMEZONES.map(value => ({ value, label: value }))} value={wsSettings.timezone} onChange={v => setWsSettings(current => ({ ...current, timezone: v }))} /></Field><Field label="Dil / bölge"><Select options={LOCALES.map(([value, label]) => ({ value, label }))} value={wsSettings.locale} onChange={v => setWsSettings(current => ({ ...current, locale: v }))} /></Field><Field label="Para birimi"><Select options={CURRENCIES.map(value => ({ value, label: value }))} value={wsSettings.defaultCurrency} onChange={v => setWsSettings(current => ({ ...current, defaultCurrency: v }))} /></Field><Field label="Hafta başlangıcı"><Select options={WEEK_DAYS.map(([value, label]) => ({ value: String(value), label }))} value={String(wsSettings.weekStartsOn)} onChange={v => setWsSettings(current => ({ ...current, weekStartsOn: Number(v) }))} /></Field></div><Footer message={<Message msg={wsMsg} />}><Button type="submit" disabled={wsSaving}>{wsSaving ? 'Kaydediliyor…' : 'Tercihleri kaydet'}</Button></Footer></form>}
          </SettingsSection>

          {profile && <SettingsSection id="isletme-profili" icon={<BriefcaseBusiness />} title="İşletme profili" description="Mentor ve karar araçlarının kullandığı işletme bağlamını güncel tutun."><form onSubmit={saveProfile}><div className={styles.twoFields}><Field label="Sektör"><input value={profile.sector || ''} onChange={event => setProfile(current => ({ ...current, sector: event.target.value }))} /></Field><Field label="Şehir"><input value={profile.city || ''} onChange={event => setProfile(current => ({ ...current, city: event.target.value }))} /></Field><Field label="İşletme aşaması"><Select placeholder="Seçilmedi" options={STAGES.map(([value, label]) => ({ value, label }))} value={profile.businessStage || ''} onChange={v => setProfile(current => ({ ...current, businessStage: v }))} /></Field><Field label="Çalışan sayısı"><input type="number" min="0" value={profile.employeeCount ?? ''} onChange={event => setProfile(current => ({ ...current, employeeCount: event.target.value }))} /></Field></div><Field label="Öncelikli hedef"><input value={profile.primaryGoal || ''} onChange={event => setProfile(current => ({ ...current, primaryGoal: event.target.value }))} /></Field><Footer message={<Message msg={profileMsg} />}><Button type="submit" disabled={profileSaving}>{profileSaving ? 'Kaydediliyor…' : 'Profili kaydet'}</Button></Footer></form></SettingsSection>}

          <SettingsSection id="yasal" icon={<Scale />} title="Gizlilik ve yasal bilgiler" description="Verilerinizin nasıl işlendiğini ve LocalKarar kullanım koşullarını inceleyin.">
            <div className={styles.legalLinks}><button type="button" onClick={() => navigate('/hakkinda')}>LocalKarar hakkında</button><button type="button" onClick={() => navigate('/privacy')}>Gizlilik ve KVKK aydınlatma metni</button><button type="button" onClick={() => navigate('/terms')}>Kullanım koşulları</button><button type="button" onClick={() => navigate('/cookies')}>Çerez ve yerel depolama politikası</button></div>
          </SettingsSection>

          <SettingsSection id="onay-bilgileri" icon={<Scale />} title="Onay bilgileri" description="Yasal metinlerin güncel sürümleri ve sizin kabul ettiğiniz sürümler.">
            <div className={styles.consentInfo}>
              {consentsLoading ? (
                <div className={styles.consentLoading}>Yükleniyor…</div>
              ) : consentsError ? (
                <div className={styles.consentError}>Bilgiler yüklenemedi: {consentsError}</div>
              ) : (
                <>
                  <div className={styles.consentRow}>
                    <span>Güncel sürüm</span>
                    <strong>{legalDocuments.find(d => d.type === 'privacy')?.version || '—'}</strong>
                  </div>
                  <div className={styles.consentRow}>
                    <span>Kabul edilen sürüm</span>
                    <strong>
                      {(() => {
                        const c = consents.find(k => k.documentType === 'privacy')
                        return c?.version || 'Henüz kabul edilmemiş'
                      })()}
                    </strong>
                  </div>
                  {(() => {
                    const c = consents.find(k => k.documentType === 'privacy')
                    return c?.acceptedAt ? (
                      <div className={styles.consentRow}>
                        <span>Son onay</span>
                        <strong>{new Date(c.acceptedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</strong>
                      </div>
                    ) : null
                  })()}
                  <div className={styles.consentStatus}>
                    {(() => {
                      if (missingConsents.length === 0) {
                        return <span className={styles.consentOk}>Güncel metinleri kabul ettiniz.</span>
                      }
                      if (missingConsents.some(m => m.type === 'privacy')) {
                        return <span className={styles.consentWarn}>Yeni yasal metinleri inceleyip onaylamanız gerekiyor.</span>
                      }
                      return <span className={styles.consentWarn}>Bazı yasal metinler güncellendi, onayınız bekleniyor.</span>
                    })()}
                  </div>
                </>
              )}
            </div>
          </SettingsSection>

          <section id="hesap-sil" className={`${styles.card} ${styles.dangerCard}`}><header className={styles.cardHeader}><span><Trash2 /></span><div><h2>Hesabı sil</h2><p>Bu işlem hesabınızı devre dışı bırakır, kişisel kimlik bilgilerinizi anonimleştirir ve oturumunuzu kapatır.</p></div></header><div className={styles.cardBody}><form onSubmit={deleteAccount}><div className={styles.dangerNotice}>Tek sahibi olduğunuz bir işletme varsa önce başka bir üyeyi sahip yapmanız gerekir. Bu işlem geri alınamaz.</div><Field label="Mevcut şifre"><PasswordInput overlay wrapClassName={styles.pwWrap} autoComplete="current-password" value={deleteForm.password} onChange={event => setDeleteForm(current => ({ ...current, password: event.target.value }))} required /></Field><Field label="Onay"><input value={deleteForm.confirmation} onChange={event => setDeleteForm(current => ({ ...current, confirmation: event.target.value }))} placeholder="HESABIMI SİL" required /></Field><Footer message={<Message msg={deleteMsg} />}><button type="submit" className={styles.deleteButton} disabled={deleteSaving}>{deleteSaving ? 'Hesap siliniyor…' : 'Hesabımı kalıcı olarak sil'}</button></Footer></form></div></section>

          <SettingsSection id="uygulama" icon={<Info />} title="Uygulama bilgisi" description="Bağlı LocalKarar servislerinin güncel durumu."><Readonly label="Sürüm" value={systemInfo?.version || 'Yükleniyor…'} /><Readonly label="Sunucu" value="Node.js + Fastify" /><Readonly label="Veritabanı" value={systemInfo?.database?.label || 'Yükleniyor…'} /><Readonly label="Bağlantı" value={systemInfo?.database?.connected ? 'Bağlı' : 'Kontrol ediliyor…'} /></SettingsSection>
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
