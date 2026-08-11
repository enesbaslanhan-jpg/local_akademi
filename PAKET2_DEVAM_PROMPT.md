# LOCAL KARAR — PAKET 2 DEVAMI (görünürlük düzeltmeleri)

Paket 2'de arka plan görevine bağlanan iki iş, kapsam dışı değil — Paket 1-2'nin
doğal devamı. İkisi de kozmetik değil, fiilen bozuk render'a yol açıyor.
Yeni paket açma, bunları Paket 2'nin devamı olarak bitir.

Backend, route, veri modeli, API bağlantıları ve iş mantığı DEĞİŞTİRİLMEYECEK.
Commit/push YAPILMAYACAK.

---

## İş 1 — Workspaces alt sayfalarındaki tanımsız tokenlar (task_2d768219)

Dosyalar:
`pages/Workspaces/` altında Activity, Contacts, Documents, Notifications,
Settings, Team, WorkspaceLayout, WorkspaceList (`.module.css` dosyaları).

Sorun: bu dosyalar `var(--card-bg)`, `var(--accent)`, `var(--accent-bg)` gibi
HİÇ TANIMLANMAMIŞ tokenlar kullanıyor. Fallback da olmadığı için kart arka
planları ve vurgu renkleri render edilmiyor.

Yapılacak:
- Tanımsız her token'ı `tokens.css`'te GERÇEKTEN tanımlı olan karşılığıyla
  değiştir. Yeni token uydurma, `tokens.css`'e yeni değişken ekleme.
  Eşleme rehberi:
  - `--card-bg` → `--white`
  - `--accent` → `--brand-ink` (link/vurgu) veya bağlama göre `--brand-olive`
  - `--accent-bg` → `--primary-light`
  - `--border-color` benzeri varyasyonlar → `--border`
  - metin varyasyonları → `--text` / `--text-light`
- Bu 8 dosyada kalan sabit hex renkleri de `var(--token)`'a çevir.
- Bitince tüm `pages/Workspaces/` altında tanımsız token kalmadığını doğrula:
  kullanılan her `var(--x)` için `x`'in `tokens.css` veya
  `motion-glass-tokens.css` içinde tanımlı olduğunu kontrol et.

## İş 2 — Mentor alt bileşenlerindeki çalışmayan Tailwind class'ları (task_ee8d79e5)

Dosyalar:
`components/mentor/MentorComposer.jsx`, `MentorEmptyState.jsx`,
`MentorErrorAlert.jsx`, `MentorMessageBubble.jsx`

Sorun: projede Tailwind kurulu değil; bu dosyalardaki `flex`, `p-3`, `rounded-xl`,
`bg-white` gibi class'lar hiçbir CSS üretmiyor. Bileşenler fiilen stilsiz.
(MentorPanel ve MentorPage bu şekilde zaten düzeltildi — aynı yaklaşımı uygula.)

Yapılacak:
- Her bileşen için bir `.module.css` oluştur (MentorMessageBubble'ın zaten bir
  motion module'ü var, ona ekle veya ayrı dosya aç — tutarlı ol).
- Konumlandırma, boşluk, yüzey ve tipografiyi LocalKarar tokenlarıyla yaz.
- Mevcut Tailwind class string'lerini SİLME, module class'ını yanına ekle
  (MentorPanel'de izlenen yöntem).
- Mesaj balonları: kullanıcı balonu `--brand-teal` zemin + beyaz metin,
  asistan balonu `--white` zemin + `--border` kenarlık.
- Hata durumu `--danger` / `--danger-bg` (bordo ailesi).
- Mevcut `fadeSlideIn` giriş animasyonu korunacak, yeni keyframe yazma.

---

## Renk kuralları (değişmedi)

- Turuncu `#C1592B` → sayfa başına yalnızca bir ana CTA. Emin değilsen KULLANMA,
  teal (`variant="primary"`) kullan.
- Bordo `#7A2E2E` → yalnızca risk / uyarı / yıkıcı işlem.
- Zeytin `#3E5D50` → aktif durum, pozitif değer, başarı.
- Sabit hex yazma, hep `var(--token)`.

## Diğer kurallar

- Tailwind EKLEME.
- Kartlara glass YOK.
- Sahte veri hardcode etme; veri yoksa mevcut boş durum korunsun.
- İçerik veya route silme, admin görünümünü bozma.
- Mobil ve masaüstü responsive, yatay scroll oluşmayacak.

## Her iş sonrası

```
npm run build
npm test
```

İkisi de temiz olmalı (referans: 23 test dosyası, 126 test geçiyor).

## Bitince raporla

- Değiştirilen dosyalar
- Tanımsız token → gerçek token eşleme listesi
- Yeni oluşturulan `.module.css` dosyaları
- Temizlenen sabit hex sayısı
- Build ve test sonucu
- Hâlâ tanımsız token veya çalışmayan Tailwind class'ı kalıp kalmadığı
  (kaldıysa nerede)
