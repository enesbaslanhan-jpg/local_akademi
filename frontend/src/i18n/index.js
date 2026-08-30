import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import trCommon from './locales/tr/common.json'
import trDashboard from './locales/tr/dashboard.json'
import trWorkspace from './locales/tr/workspace.json'
import trIntegrations from './locales/tr/integrations.json'
import trAuth from './locales/tr/auth.json'
import trMentor from './locales/tr/mentor.json'
import trLearning from './locales/tr/learning.json'
import trTools from './locales/tr/tools.json'
import trCommunity from './locales/tr/community.json'
import trAdmin from './locales/tr/admin.json'
import enCommon from './locales/en/common.json'
import enDashboard from './locales/en/dashboard.json'
import enWorkspace from './locales/en/workspace.json'
import enIntegrations from './locales/en/integrations.json'
import enAuth from './locales/en/auth.json'
import enMentor from './locales/en/mentor.json'
import enLearning from './locales/en/learning.json'
import enTools from './locales/en/tools.json'
import enCommunity from './locales/en/community.json'
import enAdmin from './locales/en/admin.json'

export const UI_LANGUAGE_KEY = 'localkarar.uiLanguage'
export const FORMAT_LOCALE_KEY = 'localkarar.formatLocale'
export const supportedLanguages = ['tr', 'en']

function initialLanguage() {
  const stored = localStorage.getItem(UI_LANGUAGE_KEY)
  return supportedLanguages.includes(stored) ? stored : 'tr'
}

export const resources = {
  tr: { common: trCommon, dashboard: trDashboard, workspace: trWorkspace, integrations: trIntegrations, auth: trAuth, mentor: trMentor, learning: trLearning, tools: trTools, community: trCommunity, admin: trAdmin },
  en: { common: enCommon, dashboard: enDashboard, workspace: enWorkspace, integrations: enIntegrations, auth: enAuth, mentor: enMentor, learning: enLearning, tools: enTools, community: enCommunity, admin: enAdmin }
}

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage(),
  fallbackLng: 'tr',
  defaultNS: 'common',
  ns: ['common', 'dashboard', 'workspace', 'integrations', 'auth', 'mentor', 'learning', 'tools', 'community', 'admin'],
  interpolation: { escapeValue: false },
  returnEmptyString: false,
  debug: import.meta.env.DEV,
  saveMissing: import.meta.env.DEV,
  missingKeyHandler: import.meta.env.DEV
    ? (languages, namespace, key) => console.warn(`[i18n] Missing key: ${namespace}:${key}`, languages)
    : undefined
})

document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'tr'
i18n.on('languageChanged', language => {
  const normalized = supportedLanguages.includes(language) ? language : 'tr'
  localStorage.setItem(UI_LANGUAGE_KEY, normalized)
  document.documentElement.lang = normalized
})

export default i18n
