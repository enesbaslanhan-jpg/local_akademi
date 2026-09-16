# Sosyal giriş (Google / Apple) — kurulum notları

Tarih: 16.09.2026. Bu dosyada **gizli değer yok**; client secret / .p8 anahtarları
GitHub Secrets ve sunucu `.env` içinde durur, buraya yazılmaz.

## Google (Cloud projesi: `localkarar`)

OAuth onay ekranı: External, yalnız `openid email profile` (hassas kapsam yok →
Google doğrulaması gerekmez). Logo bilinçli olarak YÜKLENMEDİ: logo yüklenirse
Production'a geçişte marka doğrulaması (haftalar) istenir.

| Platform | Client ID | Not |
|---|---|---|
| Web | `501996851998-hq8st05ps1vomm4uvlfotd02kk9ejh1j.apps.googleusercontent.com` | origins: localkarar.com, www, localhost:5173; redirect `/auth/google/callback`. Secret → `GOOGLE_CLIENT_SECRET` |
| Android | `501996851998-q2dk1c575il2otvd50ehdqs60vjgleck.apps.googleusercontent.com` | SHA-1 `25:9C:10:E0:…` |
| Android | `501996851998-2dlho5cv0p8up6rjs4cpp7k59mf8oamq.apps.googleusercontent.com` | SHA-1 `98:1D:88:DC:…` |
| iOS | `501996851998-mflmcqteo1kq1l5dr63iisvfb2a4mel6.apps.googleusercontent.com` | bundle `com.localkarar.app` |

Sunucu, Google ID token'ını doğrularken `aud` alanını bu dört ID'nin tümüne karşı
kabul eder (`GOOGLE_CLIENT_IDS`, virgülle ayrılmış).

## Apple

Apple Developer hesabı 16.09.2026'da alındı, onay bekliyor (Pending). Onay gelince:
- App ID `com.localkarar.app` → Sign in with Apple + Associated Domains
- Services ID `com.localkarar.web` (web girişi için) → domain `localkarar.com`,
  return URL `https://localkarar.com/auth/apple/callback`
- Key: Sign in with Apple → `.p8` → `APPLE_SIGNIN_KEY_P8` (secret), `APPLE_SIGNIN_KEY_ID`,
  `APPLE_TEAM_ID`, `APPLE_SERVICES_ID`

## Play

Paket `com.localkarar.app`, kapalı test (alpha) sürüm kodu 2 / 1.0.0. Üretim için
12 test kullanıcısı × 14 gün şartı (16.09 itibarıyla 0 kayıtlı).
