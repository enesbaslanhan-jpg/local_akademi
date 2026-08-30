import { useContext } from 'react'
import { AuthContext } from '@/context/AuthContext'

/*
 * Kullanıcı giriş yapmış mı — HERKESE AÇIK sayfalar için.
 *
 * Neden gerekti: `/fiyatlar` ve `/hakkinda` herkese açık olduğu için
 * oturumu hiç dikkate almıyordu. Giriş yapmış bir kullanıcı
 * Ayarlar → "Fiyatları gör" bağlantısından fiyat sayfasına gidip
 * "Ücretsiz başla"ya bastığında KAYIT FORMUNA düşüyordu — zaten hesabı
 * olduğu hâlde. Ürün sahibi bunu canlıda yaşadı (30.08.2026).
 *
 * ⚠️ `useAuth()` KULLANILMIYOR, bağlam doğrudan okunuyor.
 * `useAuth` sağlayıcı yoksa fırlatıyor; bu doğru bir karar, ama bu
 * kanca sayfa gezinmesini süsleyen bir ayrıntı için. Sağlayıcısız bir
 * testte fırlatıp sayfayı düşürmesi orantısız olurdu — `FounderBadge`
 * bu dersi zaten bir kez verdi (6 test düşürmüştü).
 *
 * `isAuthenticated` token'dan türüyor ve token depolamadan eşzamanlı
 * okunuyor; bu yüzden ilk boyamada "girişsiz" gösterip sonra düzelten
 * bir titreme olmuyor.
 */
export function useGirisli() {
  const auth = useContext(AuthContext)
  return Boolean(auth?.isAuthenticated)
}
