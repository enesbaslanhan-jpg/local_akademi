import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import styles from './PasswordInput.module.css'
import { useTranslation } from 'react-i18next'

/*
 * Şifre alanı + göster/gizle düğmesi.
 *
 * Depoda İKİ FARKLI alan mimarisi var ve bu bileşen ikisine de oturmak
 * zorunda. Tek bir görünüm dayatmak, birinde düğmeyi çerçevenin dışında
 * bırakırdı:
 *
 *   1. AuthPage · PasswordResetPage — `.inputShell` adlı flex bir kabuk
 *      çerçeveyi çiziyor; input'un kendi çerçevesi ve dolgusu YOK
 *      (`padding: 0 !important`). Burada düğme kabuğun İÇİNDE sıradan bir
 *      flex kardeşi olarak durur, dolguya gerek kalmaz.
 *
 *   2. SettingsPage — çerçeve ve dolgu doğrudan input'ta. Düğme kardeş
 *      olsaydı çerçevenin DIŞINDA kalırdı. `overlay` kipinde mutlak
 *      konumlanıp alanın sağ ucuna biner; o kipte sayfanın kendi CSS'i
 *      input'a sağdan dolgu vermeli, yoksa uzun şifre düğmenin altına
 *      girer.
 *
 * `type="button"` şart: form içinde varsayılan `submit`'tir ve şifreyi
 * göstermek yerine formu gönderirdi.
 *
 * Görünürlük bilerek BİLEŞEN İÇİNDE tutuluyor ve dışarı sızmıyor —
 * sayfanın state'ine bağlansaydı, aynı formdaki iki şifre alanı
 * (yeni şifre / tekrar) birlikte açılıp kapanırdı.
 */
export default function PasswordInput({ overlay = false, wrapClassName, ...inputProps }) {
  const [gorunur, setGorunur] = useState(false)
  const { t } = useTranslation('common')

  const etiket = gorunur ? t('ui.password.hide') : t('ui.password.show')
  const Icon = gorunur ? EyeOff : Eye

  const siniflar = [styles.wrap, overlay ? styles.overlay : '', wrapClassName]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={siniflar}>
      <input {...inputProps} type={gorunur ? 'text' : 'password'} />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setGorunur(onceki => !onceki)}
        aria-pressed={gorunur}
        aria-label={etiket}
        title={etiket}
      >
        <Icon size={16} aria-hidden="true" />
      </button>
    </span>
  )
}
