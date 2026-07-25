# LocalAkademi - Kapalı Beta

## Uygulama Başlatma

### Gereksinimler
- Node.js 18+
- npm

### Backend
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run dev
```
Backend adresi: `http://localhost:3000`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend adresi: `http://localhost:5173`

### Docker
```bash
docker compose up -d
```

---

## Test Hesapları

### Seed Hesapları (development)
| Rol | E-posta |
|---|---|
| Admin | admin@localakademi.com |
| Learner | student@localakademi.com |

### Beta Hesapları
| Rol | E-posta | Şifre |
|---|---|---|
| Admin | beta.admin@localakademi.com | 9CqgEX6br@A2vZTA |
| Learner | beta.learner@localakademi.com | C6gXXnBSKSa5TQAt |
| Editor | beta.editor@localakademi.com | A5n3#GfFsx9WXLsa |
| Expert | beta.expert@localakademi.com | BxvqULr9#wenrY@z |

**Şifre politikası:** İlk girişte şifre değiştirme zorunluluğu yoktur (bkz. bilinen eksikler #10).

**Şifre sıfırlama:** Yöneticiden `PATCH /admin/users/:id` ile şifre sıfırlama talep edin.

---

## Mevcut İçerik

- **600 demo KO** (6 kategoride, yayında)
- **2 DIG KO yayında**: Dijital Olgunluk Değerlendirmesi, Dijital Araç Seçimi
- **3 DIG KO onaylı**: Veri Yönetişimi, Siber Güvenlik, Yapay Zeka Fırsatları

---

## Bilinen Eksikler

1. **Kalan 95 KO import edilmedi** — DIG kapsamındaki 95 KO henüz sisteme yüklenmedi
2. **Üç yüksek riskli KO publish edilmedi** — Professional approval gerektiren 3 KO onaylı ancak yayında değil
3. **Companion import UI** — Quiz/task ekleme arayüzü henüz tamamlanmadı
4. **Learner sayfaları** — Bazı learner sayfalarında içerik boşlukları var
5. **403 Forbidden sayfası** — Frontend'de özel 403 bileşeni yok, 401 sayfasına yönlendiriliyor
6. **AI Mentor API anahtarı** — `NVIDIA_API_KEY` yapılandırılmamışsa mentor 503 döndürür
7. **SQLite** — Development/Test için uygun, üretimde PostgreSQL'e geçilmeli
8. **Otomatik yedekleme** — Manuel prosedür mevcut, otomatik yedekleme yok
9. **İlk girişte şifre değiştirme** — Zorunlu şifre değiştirme akışı henüz implemente edilmedi
10. **Rate limit** — Login (10/dk), register (5/saat), mentor (30/dk), import (10/dk) ile sınırlı

---

## Geri Bildirim Toplama

- **Hata raporları**: GitHub Issues
- **Geri bildirim formu**: (henüz yapılandırılmadı)
- **E-posta**: (beta ekibine özel)

---

## Yedekleme

Yedekler `BACKUPS/` dizininde zaman damgalı olarak tutulmaktadır. Proje kökünde `.db` dosyası saklanmaz.

### Manuel yedekleme
```bash
cp prisma/dev.db "BACKUPS/dev.db.backup.$(date +%Y%m%d_%H%M%S).sqlite"
```

### Restore
```bash
cp "BACKUPS/dev.db.backup.GÜNCEL_TARIH.sqlite" prisma/dev.db
npx prisma db push  # şema güncel değilse
```

---

## Release Gate

Her release öncesi aşağıdaki gate'ler otomatik çalıştırılır:

```bash
npm run verify:all
```

### Gate'ler

1. `npm install` — Bağımlılık yüklemesi (SKIP ile atlanabilir)
2. `npm test` — 337+ unit test (12 dosya)
3. `npx tsc --noEmit` — TypeScript tip kontrolü
4. `npm run build` — Frontend build
5. `dist/index.html` varlığı
6. `npx prisma validate` — Prisma şema doğrulaması
7. Migration dizin kontrolü
8. `docker compose config` — Docker compose geçerliliği
9. Dockerfile statik + image build + container healthcheck (daemon yoksa UNVERIFIED)
10. `.env.example` / `.gitignore` varlığı + `.gitignore` girdileri

**Verdict kuralları:**
- Herhangi bir FAIL → `BLOCKED`
- UNVERIFIED varsa → `PARTIAL`
- Tümü PASS/SKIPPED → `RELEASE_READY`

Rapor `release-gate-report.json` olarak kaydedilir.

```bash
# Sadece release gate
npm run verify:release

# Migration zinciri doğrulama
npm run validate:migrations

# Secret/config taraması
npm run secret:scan

# Detaylı release raporu
npm run release:report
```

### Secret Taraması

```bash
npm run secret:scan
```

Taranan patternler:
- Hardcoded secret/key/password/token atamaları
- Private key blokları (`-----BEGIN PRIVATE KEY-----`)
- GitHub tokenları (`ghp_*`, `gho_*`)
- OpenAI API key (`sk-*`)
- AWS access key (`AKIA*`)
- Slack token (`xox*`)
- Bağlantı stringleri (MongoDB, PostgreSQL)

Bulunan potansiyel sırlar dosya adı ve türüyle raporlanır (içerik gösterilmez). False positive'ler `scripts/secret-scan.js` içindeki `ALLOWED_PATTERNS` listesine eklenir.

---

## Rollback Prosedürü

### Anlık Rollback (Acil)
```bash
# Deployment rollback
git revert HEAD --no-edit
git push origin main

# Docker rollback (önceki etikete)
docker compose down
docker compose -f docker-compose.yml up -d
```

### Veri Rollback
```bash
# Migration rollback
npx prisma migrate down 1

# Manuel yedekten dönüş
cp "BACKUPS/dev.db.backup.TARIH.sqlite" prisma/dev.db
```

### Rollback Kriterleri
- Kullanıcı giriş yapamıyorsa
- AI Mentor 5 dk'dan uzun süredir yanıt vermiyorsa
- KO yayınlama/filtreleme çalışmıyorsa
- Audit log kaydı tutulamıyorsa
- Sınav sonuçları doğru hesaplanmıyorsa

---

## Beta Kararı

**Durum: KAPALI PILOT İÇİN HAZIR** ✅

Mevcut doğrulamalar:
- 337+ unit test (12 dosya) — PASS
- ~50 E2E senaryo (auth, biz profile, quiz, KO lifecycle, mentor, task, dashboard, document, admin/audit) — PASS
- TypeScript strict mode — PASS
- Prisma şema validasyonu — PASS
- JWT secret zorunlu, rate limit aktif, CORS kısıtlı, log redaction açık
- AI Mentor fake provider ile doğrulanmış
- Secret taraması: temiz (beta şifreleri örnek, Docker image'da .env yok)
- Migration zinciri: deploy doğrulandı, seed idempotent, _prisma_migrations tablosu kontrol edildi
- Docker: daemon varsa build + healthcheck + non-root + volume + SIGTERM doğrulanır

### Başlatma Komutları

```bash
# 1. Ortamı doğrula
npm run verify:release

# 2. JWT secret oluştur (zorunlu)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" > .jwt-secret

# 3. Backend başlat
cp .env.example .env  # JWT_SECRET, NVIDIA_API_KEY, CORS_ORIGIN yapılandır
npm run dev

# 4. Frontend başlat
cd frontend
npm run dev
```

### GO / NO-GO

**KARAR: GO** — Kapalı pilot başlatılabilir. Blocker listesindeki maddeler kritik akışları engellemiyor.

### Limitations / Doğrulanamayanlar
- **Browser E2E**: Headless browser testi mevcut değil — frontend smoke testi API contract düzeyinde
- **Docker image healthcheck**: Docker daemon yoksa image build/healthcheck doğrulanamaz
- **Gerçek AI provider**: Fake provider ile doğrulandı — canlıda NVIDIA API key yapılandırılmalı
- **Yük testi**: Mevcut değil — kapalı pilot kullanıcı sayısı düşük olduğu için ertelendi
