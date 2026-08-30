import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FORMAT_LOCALE_KEY, supportedLanguages } from '@/i18n'

const supportedFormatLocales = ['tr-TR', 'en-US', 'en-GB', 'de-DE']
const FALLBACK_LOCALIZATION = {
  uiLanguage: 'tr',
  formatLocale: 'tr-TR',
  setUiLanguage: async language => language === 'en' ? 'en' : 'tr',
  setFormatLocale: locale => supportedFormatLocales.includes(locale) ? locale : 'tr-TR',
  supportedFormatLocales
}
const LocalizationContext = createContext(FALLBACK_LOCALIZATION)

function initialFormatLocale() {
  const stored = localStorage.getItem(FORMAT_LOCALE_KEY)
  return supportedFormatLocales.includes(stored) ? stored : 'tr-TR'
}

export function LocalizationProvider({ children }) {
  const { i18n } = useTranslation()
  const [formatLocale, setFormatLocaleState] = useState(initialFormatLocale)

  const setUiLanguage = useCallback(async language => {
    const normalized = supportedLanguages.includes(language) ? language : 'tr'
    await i18n.changeLanguage(normalized)
    return normalized
  }, [i18n])

  const setFormatLocale = useCallback(locale => {
    const normalized = supportedFormatLocales.includes(locale) ? locale : 'tr-TR'
    localStorage.setItem(FORMAT_LOCALE_KEY, normalized)
    setFormatLocaleState(normalized)
    return normalized
  }, [])

  const value = useMemo(() => ({
    uiLanguage: supportedLanguages.includes(i18n.resolvedLanguage) ? i18n.resolvedLanguage : 'tr',
    formatLocale,
    setUiLanguage,
    setFormatLocale,
    supportedFormatLocales
  }), [i18n.resolvedLanguage, formatLocale, setUiLanguage, setFormatLocale])

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>
}

export function useLocalization() {
  return useContext(LocalizationContext)
}
