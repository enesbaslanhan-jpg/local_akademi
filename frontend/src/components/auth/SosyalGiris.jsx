import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './SosyalGiris.module.css'

/*
 * SOSYAL GİRİŞ DÜĞMELERİ — Google / Apple (16.09.2026).
 *
 * Hangi düğmenin görüneceğini sunucu söyler (`/app-config → socialLogin`):
 * sağlayıcı yapılandırılmadıysa düğme HİÇ çizilmez; "yakında" gibi pasif
 * düğme yok. Her iki sağlayıcı da istemciye bir KİMLİK BELİRTECİ verir,
 * biz onu `onKimlik({ provider, idToken, ... })` ile yukarıya iletiriz;
 * sunucuya gidiş AuthContext.socialLogin'de.
 *
 * Google: Identity Services betiği (accounts.google.com/gsi/client). GIS
 * kendi düğmesini iframe olarak çizer ve biçimi sınırlı; o yüzden GIS
 * düğmesi bizim düğmenin ÜSTÜNE saydam bindirilir — tıklama GIS'e gider,
 * görünen bizim tasarım. Apple JS ise kendi düğmesini zorunlu kılmaz,
 * `AppleID.auth.signIn()` doğrudan çağrılır.
 *
 * CSP: sunucu yalnız ilgili sağlayıcı açıkken accounts.google.com /
 * appleid.cdn-apple.com kaynaklarına izin verir (src/index.ts).
 */

let yapilandirmaSozu = null
export function sosyalYapilandirmayiYukle() {
  if (!yapilandirmaSozu) {
    yapilandirmaSozu = fetch('/app-config', { credentials: 'same-origin' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => d?.socialLogin ?? null)
      .catch(() => null)
  }
  return yapilandirmaSozu
}
/* Testler ve sağlayıcı değişimi için. */
export function sosyalYapilandirmayiSifirla() { yapilandirmaSozu = null }

const betikler = new Map()
function betikYukle(src) {
  if (!betikler.has(src)) {
    betikler.set(src, new Promise((resolve, reject) => {
      const el = document.createElement('script')
      el.src = src; el.async = true; el.defer = true
      el.onload = () => resolve()
      el.onerror = () => { betikler.delete(src); reject(new Error('script')) }
      document.head.appendChild(el)
    }))
  }
  return betikler.get(src)
}

function GoogleSimgesi() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
      <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z" />
    </svg>
  )
}
function AppleSimgesi() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.53c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.18-.02 1.93-1.08 2.65-2.14.83-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.3-3.53z" />
      <path d="M14.86 5.9c.6-.74 1.01-1.75.9-2.77-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.58-1.22z" />
    </svg>
  )
}

function GoogleDugmesi({ clientId, onKimlik, onHata, disabled }) {
  const { t } = useTranslation('auth')
  const kapRef = useRef(null)
  const [hazir, setHazir] = useState(false)

  useEffect(() => {
    let iptal = false
    betikYukle('https://accounts.google.com/gsi/client').then(() => {
      if (iptal || !window.google?.accounts?.id || !kapRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: yanit => {
          if (yanit?.credential) onKimlik({ provider: 'google', idToken: yanit.credential })
          else onHata(t('social.failed'))
        },
        /* Tarayıcı Google oturumunu tek tıkla seçtirir; istenmeden çıkan
           One Tap balonu yok, yalnız düğme. */
        auto_select: false,
        itp_support: true
      })
      kapRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(kapRef.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular',
        locale: 'tr', width: Math.max(200, Math.floor(kapRef.current.parentElement?.clientWidth || 240))
      })
      setHazir(true)
    }).catch(() => onHata(t('social.scriptFailed')))
    return () => { iptal = true }
  }, [clientId, onKimlik, onHata, t])

  return (
    <div className={styles.googleKap} data-hazir={hazir ? '1' : '0'}>
      <button type="button" className={styles.dugme} disabled={disabled || !hazir} tabIndex={hazir ? -1 : 0} aria-hidden={hazir}>
        <GoogleSimgesi /> Google
      </button>
      {/* GIS düğmesi saydam katmanda; tıklamayı o alır. */}
      <div ref={kapRef} className={styles.googleUst} aria-label={t('social.continueGoogle')} />
    </div>
  )
}

function AppleDugmesi({ servicesId, onKimlik, onHata, disabled }) {
  const { t } = useTranslation('auth')
  const [hazir, setHazir] = useState(false)

  useEffect(() => {
    let iptal = false
    betikYukle('https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/tr_TR/appleid.auth.js').then(() => {
      if (iptal || !window.AppleID?.auth) return
      window.AppleID.auth.init({
        clientId: servicesId,
        scope: 'name email',
        redirectURI: `${window.location.origin}/auth/apple/callback`,
        usePopup: true
      })
      setHazir(true)
    }).catch(() => onHata(t('social.scriptFailed')))
    return () => { iptal = true }
  }, [servicesId, onHata, t])

  async function tikla() {
    try {
      const sonuc = await window.AppleID.auth.signIn()
      const idToken = sonuc?.authorization?.id_token
      if (!idToken) { onHata(t('social.failed')); return }
      /* Ad yalnız İLK yetkilendirmede gelir; sonrakilerde `user` yok. */
      const ad = [sonuc.user?.name?.firstName, sonuc.user?.name?.lastName].filter(Boolean).join(' ') || undefined
      onKimlik({ provider: 'apple', idToken, authorizationCode: sonuc.authorization.code, name: ad, appleClientId: servicesId })
    } catch (e) {
      /* Kullanıcı pencereyi kapattı: hata gösterme. */
      if (e?.error === 'popup_closed_by_user' || e?.error === 'user_cancelled_authorize') return
      onHata(t('social.failed'))
    }
  }

  return (
    <button type="button" className={styles.dugme} onClick={tikla} disabled={disabled || !hazir}>
      <AppleSimgesi /> Apple
    </button>
  )
}

/**
 * Yapılandırmayı okur; en az bir sağlayıcı açıksa düğmeleri çizer, hiçbiri
 * açık değilse `null` döner (çağıran ayırıcıyı da gizler — bkz. `onDurum`).
 */
export default function SosyalGiris({ onKimlik, onHata, disabled = false, onDurum }) {
  const [yap, setYap] = useState(undefined)

  useEffect(() => {
    let iptal = false
    sosyalYapilandirmayiYukle().then(d => {
      if (iptal) return
      setYap(d)
      onDurum?.(Boolean(d?.google?.enabled || d?.apple?.enabled))
    })
    return () => { iptal = true }
  }, [onDurum])

  const google = yap?.google?.enabled && yap.google.webClientId
  const apple = yap?.apple?.enabled && yap.apple.webServicesId
  if (!google && !apple) return null

  return (
    <div className={styles.satir} data-tek={google && apple ? '0' : '1'}>
      {google && <GoogleDugmesi clientId={yap.google.webClientId} onKimlik={onKimlik} onHata={onHata} disabled={disabled} />}
      {apple && <AppleDugmesi servicesId={yap.apple.webServicesId} onKimlik={onKimlik} onHata={onHata} disabled={disabled} />}
    </div>
  )
}
