# PrismaClient Refaktör Planı

## 1. Mevcut Durum — Özet

| Metrik | Sayı |
|--------|------|
| `src/services/` altında `new PrismaClient()` oluşturan dosya | **32** |
| Module-level singleton | **25** (20 route-exporting, 5 utility-only) |
| Factory/DI (`opts?.prisma \|\| new PrismaClient()`) | **7** (tümü route-exporting) |
| Doğru enjekte edilmiş PrismaClient alan dosya | **10** (memory, retrieval servisleri) |
| Mevcut ortak prisma modülü | **YOK** |
| Graceful shutdown'ta `prisma.$disconnect()` çağrısı | **YOK** |
| `src/index.ts` içinde factory servislere `prisma` parametresi geçen | **HIÇBIRI** (hepsi fallback çalıştırır) |

## 2. Mimari Öneri

### 2.1. `src/lib/prisma.ts` — Merkezi PrismaClient Modülü

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as typeof globalThis & {
  __prisma?: PrismaClient
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
  })
}

export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? (globalForPrisma.__prisma = createPrismaClient())
```

### 2.2. Production Davranışı

- `globalForPrisma.__prisma` ilk çağrıda oluşturulur, bir daha değişmez.
- Tüm servisler aynı PrismaClient instance'ını kullanır.
- Tek bir bağlantı havuzu — connection overhead azalır.
- `process.on('SIGTERM'/'SIGINT')` içinde tek `prisma.$disconnect()` çağrısı yeterlidir.

### 2.3. Development / Hot-Reload Davranışı

- `tsx` veya `ts-node-dev` hot-reload sırasında modül yeniden yüklenir.
- `globalThis` cache sayesinde her reload'da yeni instance oluşmaz — eski instance kullanılır.
- Bu yaklaşım Next.js/npm Prisma dokümantasyonunda önerilen standart desendir.
- Sadece server tamamen restart edildiğinde yeni instance oluşur.

### 2.4. Test Davranışı

Testlerde `prisma` import'u yerine doğrudan `new PrismaClient()` kullanımı **devam edebilir**. Refaktör test dosyalarını değiştirmez:

- Testler zaten kendi `new PrismaClient()` instance'larını oluşturuyor.
- Factory/DI servisler mevcut `opts?.prisma` parametresiyle test enjeksiyonuna izin vermeye devam eder.
- Shared modülü import eden servisler testlerde mock'lanabilir (örn. `vi.mock('../../lib/prisma.js')`).
- Shared modüle geçişten sonra testlerde isteğe bağlı olarak `vi.mock` kullanılabilir, zorunlu değildir.

## 3. Risk Analizi

| Risk | Olasılık | Etki | Mitigasyon |
|------|----------|------|------------|
| Hot-reload sırasında bağlantı kopyalanması | Düşük | Orta | `globalThis` cache + `$disconnect` kontrolü |
| Test izolasyonunun bozulması | Düşük | Yüksek | Testler shared modülü kullanmaz; kendi instance'larını yaratır |
| Servis factory API'sinin bozulması | Düşük | Yüksek | Mevcut `opts?.prisma` imzası korunur, sadece default değişir |
| Bağımlılık döngüsü (circular import) | Düşük | Orta | `src/lib/prisma.ts` hiçbir servisi import etmez — safe |
| Graceful shutdown sırasında sıra hatası | Düşük | Düşük | `server.close()` → `prisma.$disconnect()` sırası korunur |

## 4. Etkilenecek Dosyalar

### 4.1. Değişecek Servis Dosyaları (32 adet)

#### Grup A — Module-level singleton (route-exporting) — 20 dosya

Bu dosyalarda `const prisma = new PrismaClient()` → `import { prisma } from '../lib/prisma.js'` değişimi.

| # | Dosya | Satır |
|---|-------|-------|
| 1 | `src/services/admin.ts` | 21 |
| 2 | `src/services/auth.ts` | 8 |
| 3 | `src/services/companion-content.ts` | 5 |
| 4 | `src/services/conversation.ts` | 15 |
| 5 | `src/services/courses.ts` | 4 |
| 6 | `src/services/enrollments.ts` | 4 |
| 7 | `src/services/formulas.ts` | 5 |
| 8 | `src/services/import.ts` | 6 |
| 9 | `src/services/knowledge.ts` | 4 |
| 10 | `src/services/knowledge-v2.ts` | 7 |
| 11 | `src/services/learnerDashboard.ts` | 4 |
| 12 | `src/services/learningPath.ts` | 5 |
| 13 | `src/services/lessons.ts` | 4 |
| 14 | `src/services/memory/memory-routes.ts` | 10 |
| 15 | `src/services/mentor.ts` | 13 |
| 16 | `src/services/pilotDashboard.ts` | 4 |
| 17 | `src/services/reports.ts` | 8 |
| 18 | `src/services/sources.ts` | 5 |
| 19 | `src/services/tasks.ts` | 5 |
| 20 | `src/services/videos.ts` | 5 |

#### Grup B — Module-level singleton (utility-only) — 5 dosya

| # | Dosya | Satır |
|---|-------|-------|
| 21 | `src/services/ai-provider.ts` | 7 |
| 22 | `src/services/audit.ts` | 3 |
| 23 | `src/services/flashcards.ts` | 5 |
| 24 | `src/services/quiz-engine.ts` | 4 |
| 25 | `src/services/ai-reviewer/reviewer-telemetry.ts` | 10 |

#### Grup C — Factory/DI servisleri — 7 dosya

Bu dosyalarda `opts?.prisma || new PrismaClient()` → `opts?.prisma || prisma` değişimi. Mevcut factory imzası (parametre + fallback) korunur.

| # | Dosya | Satır |
|---|-------|-------|
| 26 | `src/services/assessment.ts` | 68 |
| 27 | `src/services/business.ts` | 29 |
| 28 | `src/services/community.ts` | 80 |
| 29 | `src/services/documents.ts` | 29 |
| 30 | `src/services/learning.ts` | 16 |
| 31 | `src/services/onboarding.ts` | 31 |
| 32 | `src/services/quizzes.ts` | 34 |

### 4.2. Oluşturulacak Dosya

- `src/lib/prisma.ts` — shared PrismaClient modülü

### 4.3. Değiştirilecek Yeni Dosya

- `src/index.ts` — `server.register()` çağrılarına `prisma` parametresi eklenmesi (sadece Grup C servisleri için)
- `src/index.ts` — shutdown handler'a `prisma.$disconnect()` eklenmesi

### 4.4. Değiştirilmeyecek Dosyalar

| Kategori | Gerekçe |
|----------|---------|
| `tests/` | Testler kendi instance'larını yönetir; shared modüle bağımlı olmamalıdır |
| `scripts/` | Refaktör kapsamı dışında; bağımsız scriptler kendi PrismaClient'larını yönetebilir |
| `prisma/` | Seed/test scriptleri aynı gerekçeyle dışarıda tutulur |
| `src/services/course-progress.ts` | Zaten enjekte edilmiş PrismaClient alır, değişmez |
| `src/services/retrieval/*` | Constructor/parametre enjeksiyonu kullanır, değişmez |
| `src/services/memory/context-builder.ts` vb. | Zaten enjekte edilmiş alır, değişmez |

## 5. Graceful Shutdown Tasarımı

### 5.1. Mevcut Durum

```typescript
// src/index.ts
const handler = createShutdownHandler(server)
// Sadece server.close() çağırır, prisma.$disconnect() YOK
```

### 5.2. Hedef

```typescript
// src/index.ts
import { prisma } from './lib/prisma.js'

export function createShutdownHandler(server: FastifyInstance) {
  return async (signal: string) => {
    // ... mevcut shuttingDown kontrolü ...
    try {
      await server.close()
      await prisma.$disconnect()
      process.exit(0)
    } catch (err) {
      process.exit(1)
    }
  }
}
```

### 5.3. Önemli Not

`prisma.$disconnect()` tek bir merkezi noktada çağrılır. Tüm servisler aynı instance'ı kullandığı için bu yeterlidir. Shared modül `globalThis` cache kullandığından, disconnect sonrası yeni bir istek gelirse yeni instance oluşur (ancak shutdown sonrası istek gelmemelidir).

## 6. Değişiklik Sırası ve Alt Fazlar

### Faz 2A — Shared Prisma Modülü

| | Açıklama |
|---|----------|
| **Değişen dosyalar** | `src/lib/prisma.ts` (yeni) |
| **Risk** | Yeni dosya oluşturma, mevcut kodu etkilemez |
| **Doğrulama** | `npx tsc --noEmit`, `npx prisma validate` |
| **Rollback** | Dosyayı sil |
| **Test** | Shared modül import edilebilir mi kontrolü |

### Faz 2B — Düşük Riskli Singleton Servisler (Grup A + B)

| | Açıklama |
|---|----------|
| **Değişen dosyalar** | 25 servis dosyası (Grup A: 20 route + Grup B: 5 utility) |
| **Her dosyada değişim** | `const prisma = new PrismaClient()` → `import { prisma } from '../lib/prisma.js'` (ve uygun relative path) |
| **Risk** | Düşük — mevcut `prisma` değişken adı korunur, sadece kaynak değişir |
| **Doğrulama** | `npm test`, `npx tsc --noEmit` |
| **Rollback** | Her dosyada import'u geri al, `const prisma = new PrismaClient()` satırını geri ekle |
| **Test** | Mevcut testler factory servislere dokunmadığı sürece aynı kalır |

### Faz 2C — Factory/DI Servisleri (Grup C)

| | Açıklama |
|---|----------|
| **Değişen dosyalar** | 7 servis dosyası (assessment, business, community, documents, learning, onboarding, quizzes) + `src/index.ts` |
| **Her dosyada değişim** | `opts?.prisma || new PrismaClient()` → `opts?.prisma || prisma` (import shared) |
| **src/index.ts değişimi** | `server.register(route, { prefix: '...', prisma })` parametresi eklenir |
| **Risk** | Orta — factory imzası değişmez, test enjeksiyonu bozulmaz |
| **Doğrulama** | `npm test` (özellikle business, documents, quizzes, community, security testleri) |
| **Rollback** | Dosyalarda import'u geri al; `src/index.ts`'den parametreleri kaldır |
| **Test** | Factory/DI testleri opts?.prisma ile enjeksiyona devam eder, kırılmaz |

### Faz 2D — Graceful Shutdown

| | Açıklama |
|---|----------|
| **Değişen dosyalar** | `src/index.ts` |
| **Değişim** | `createShutdownHandler` içine `prisma.$disconnect()` eklenir |
| **Risk** | Düşük — shutdown akışına ek adım, hata durumunda process.exit(1) zaten var |
| **Doğrulama** | `npm test` (graceful-shutdown.test.ts dahil), manuel SIGTERM/SIGINT testi |
| **Rollback** | `prisma.$disconnect()` satırını kaldır |
| **Test** | Mevcut shutdown testleri `parseShutdownTimeout` ve `createShutdownHandler` davranışını kapsar |

### Faz 2E — Tam Test ve Tarama

| | Açıklama |
|---|----------|
| **Yapılacaklar** | Tüm test suite çalıştırma (`npm test`), kalan `new PrismaClient()` kullanım taraması (`scripts/`, `prisma/` dahil), diff review |
| **Doğrulama** | `npm test`, `npx tsc --noEmit`, `npx prisma validate`, `git diff --check` |
| **Hedef** | `src/services/` altında sıfır `new PrismaClient()` kullanımı |
| **Kapsam dışı** | `scripts/`, `prisma/`, `tests/` — kendi PrismaClient yönetimlerini korur |

## 7. Alt Faz Uygulama Tablosu

| Faz | Dosya Sayısı | Tahmini Süre | Risk | Test Güvencesi |
|-----|-------------|-------------|------|----------------|
| 2A | 1 (yeni) | 5 dk | Yok | tsc + prisma validate |
| 2B | 25 | 30 dk | Düşük | npm test (43 dosya geçmeli) |
| 2C | 7 + 1 | 20 dk | Orta | npm test (özellikle security testleri) |
| 2D | 1 | 5 dk | Düşük | graceful-shutdown.test.ts |
| 2E | 0 | 10 dk | Yok | Tam test suite |

## 8. Test Stratejisi

### 8.1. Test Dosyaları Değişmeyecek

Test dosyaları (`tests/`) bu refaktör kapsamında değiştirilmez. Gerekçeler:

1. Testler kendi `new PrismaClient()` instance'larını oluşturur ve yönetir — bu bir test anti-pattern'i değildir, izolasyon için gereklidir.
2. Factory/DI servislerin `opts?.prisma` parametresi korunur; testler mevcut enjeksiyon desenlerini kullanmaya devam edebilir.
3. Singleton servislerin testleri shared modülü `vi.mock('../../lib/prisma.js')` ile mock'layabilir — ancak bu opsiyoneldir.

### 8.2. Doğrulanacak Testler

Her faz sonrası:

- `npm test` — tüm Vitest suite
- `npx tsc --noEmit` — TypeScript derleme
- `npx prisma validate` — Prisma schema geçerliliği

### 8.3. Özel Dikkat Gerektiren Testler

| Test Dosyası | Neden |
|-------------|-------|
| `tests/security.test.ts` | Route register ederken `new PrismaClient()` geçer — factory bozulmamalı |
| `tests/business.test.ts` | `realPrisma` + `createMockPrisma` kullanır — enjeksiyon korunmalı |
| `tests/documents.test.ts` | Aynı desen — enjeksiyon korunmalı |
| `tests/quizzes.test.ts` | Aynı desen — enjeksiyon korunmalı |
| `tests/graceful-shutdown.test.ts` | Shutdown davranışı değişirse etkilenebilir |

### 8.4. Yeni Test Önerileri (opsiyonel)

- Shared modülün `globalThis` cache davranışını doğrulayan basit bir test
- Shutdown + disconnect sırasını doğrulayan test

## 9. Rollback Planı

### 9.1. Tek Dosya Rollback

Her değişiklik atomiktir. Tek dosyada sorun olursa:

- Singleton: import satırını kaldır, `const prisma = new PrismaClient()` satırını geri ekle
- Factory: import satırını kaldır, `opts?.prisma || new PrismaClient()` ifadesini geri döndür
- `src/index.ts`: servis register çağrısından `prisma` parametresini kaldır

### 9.2. Tam Rollback

```bash
git checkout -- src/services/ src/lib/ src/index.ts
```

### 9.3. Kısmi Rollback (tek faz)

Her faz ayrı commit olarak hazırlanır. Gerekirse:

```bash
git revert <commit-hash>
```

## 10. Faz 2A Uygulama Adımları

Bu plan onaylandıktan sonra Faz 2A şu şekilde başlatılacak:

1. `src/lib/prisma.ts` oluşturulacak
2. Mevcut koda dokunulmayacak
3. `npx tsc --noEmit` ile doğrulama
4. Sonuç raporlanacak

---

*Hazırlık: Salt-okunur analiz. Hiçbir kaynak dosya değiştirilmedi. scripts/ ve prisma/ kapsam dışı.*
