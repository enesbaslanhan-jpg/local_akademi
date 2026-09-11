/*
 * ISLETME TAKIBI NAVIGASYONU — TEK KAYNAK.
 *
 * Bu dizi WorkspaceLayout sekmeleri, Sidebar alt menusu ve
 * ContextPanel baglantilari tarafindan PAYLASILIR. Sira urun karari:
 * "Urunler" Siparisler ile Belgeler arasinda. Mevcut bolumler
 * kaldirilmaz, yeniden adlandirilmaz veya birlestirilmez.
 *
 * tests/navigasyon-regresyonu bu sirayi korur.
 */
export const WORKSPACE_NAV_TABS = [
  { id: 'overview', i18nKey: 'workspace:nav.overview', path: 'overview' },
  { id: 'tracker', i18nKey: 'workspace:nav.records', path: 'tracker' },
  { id: 'orders', i18nKey: 'workspace:nav.orders', path: 'orders' },
  { id: 'products', i18nKey: 'workspace:nav.products', path: 'products' },
  { id: 'documents', i18nKey: 'workspace:nav.documents', path: 'documents' },
  { id: 'notifications', i18nKey: 'workspace:nav.notifications', path: 'notifications' },
  { id: 'calendar', i18nKey: 'workspace:nav.calendar', path: 'calendar' },
  /* Karar raporu takvimden sonra: ikisi de "geriye dönüp bak"
     ekranları, ekip/kişiler ise yönetim. */
  { id: 'decisions', i18nKey: 'workspace:nav.decisions', path: 'decisions' },
  { id: 'loans', i18nKey: 'workspace:nav.loans', path: 'loans' },
  { id: 'accounts', i18nKey: 'workspace:nav.accounts', path: 'accounts' },
  { id: 'employees', i18nKey: 'workspace:nav.employees', path: 'employees' },
  { id: 'team', i18nKey: 'workspace:nav.team', path: 'team' },
  { id: 'contacts', i18nKey: 'workspace:nav.contacts', path: 'contacts' },
  { id: 'activity', i18nKey: 'workspace:nav.activity', path: 'activity' },
  { id: 'settings', i18nKey: 'workspace:nav.settings', path: 'settings' }
]
