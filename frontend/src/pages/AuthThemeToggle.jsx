import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import styles from './AuthPage.module.css'

/*
 * Giriş ekranında tema düğmesi.
 *
 * Neden ayrı: uygulamanın tema değiştiricisi `Header` ve `SettingsPage`
 * içinde, ikisi de girişin ARKASINDA. Giriş yapmamış bir ziyaretçinin
 * modu değiştirmesinin başka yolu yoktu; ekran işletim sistemi
 * tercihine mahkûm kalıyordu.
 *
 * `ThemeContext` olduğu gibi kullanılıyor — tercih yine `localStorage`'a
 * yazılıyor, yani giriş yapınca uygulama aynı modda açılıyor.
 */
export default function AuthThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const koyu = theme === 'dark'
  return (
    <button
      type="button"
      className={styles.themeToggle}
      onClick={toggleTheme}
      aria-label={koyu ? 'Açık moda geç' : 'Koyu moda geç'}
      title={koyu ? 'Açık mod' : 'Koyu mod'}
      aria-pressed={koyu}
    >
      {koyu ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  )
}
