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
  { id: 'overview', label: 'Genel Bakış', path: 'overview' },
  { id: 'tracker', label: 'Kayıtlar', path: 'tracker' },
  { id: 'orders', label: 'Siparişler', path: 'orders' },
  { id: 'products', label: 'Ürünler', path: 'products' },
  { id: 'documents', label: 'Belgeler', path: 'documents' },
  { id: 'notifications', label: 'Bildirimler', path: 'notifications' },
  { id: 'calendar', label: 'Takvim', path: 'calendar' },
  { id: 'team', label: 'Ekip', path: 'team' },
  { id: 'contacts', label: 'Kişiler', path: 'contacts' },
  { id: 'activity', label: 'Aktiviteler', path: 'activity' },
  { id: 'settings', label: 'Ayarlar', path: 'settings' }
]
