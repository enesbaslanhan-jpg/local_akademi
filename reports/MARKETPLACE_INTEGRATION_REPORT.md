# LocalKarar — Pazaryeri Entegrasyon Mimarisı Raporu (Trendyol MVP)

Tarih: 24.08.2026 · Git commit/push YAPILMADI (talep üzerine).

---

## 1. Mevcut repo audit sonucu

| Alan | Bulgu |
|---|---|
| Backend | Fastify 5 + Prisma 5 + PostgreSQL; rotalar `src/index.ts` içinde `register()` ile bağlanıyor; servis deseni `xxxRoutes(fastify, { prisma })` |
| Auth | `fastify.authenticate` preHandler; JWT payload `{ id, email, role, tv }` |
| Tenant isolation | `access(prisma, userId, workspaceId, reply, write?)` — `business-tracker.ts:352`; BusinessMember + workspace status + rol kontrolü tek kaynakte |
| Workspace modeli | `BusinessWorkspace.id` uuid String; roller owner/manager/staff/accountant/viewer |
| Audit log | `AuditLog` tablosu + `createAuditLog()` (`src/services/audit.ts`), metadata whitelist'li; ayrıca workspace-scoped `WorkspaceActivity` |
| Encryption | **Yoktu** → bu görevde AES-256-GCM modülü yazıldı (`src/lib/crypto.ts`) |
| Background jobs | `startBusinessReminderWorker` (setInterval) ve `startNewsWorker` (saatlik) desenleri mevcut → aynı desen kopyalandı |
| Para | `BusinessRecord.amount` zaten `Decimal @db.Decimal(18,2)` → yeni modellerde aynı yaklaşım |
| metadata | Business domain'de `String @default("{}")` yaygın; yeni entegrasyon tablolarında Prisma `Json?` kullanıldı (PostgreSQL JSONB) |
| Frontend | React 19 + Vite, CSS Modules + token sistemi (`tokens.css`, `theme-modes.css`), tek API istemcisi `api.js`, SettingsPage bölüm-bölüm state ile, Workspaces sekmeleri `WorkspaceLayout.tabs` dizisinde |
| Hesaplamalar | `pazaryeri_siparis_kari` formülü (`formulas.ts:68` → `calculateMarketplaceProfit`) mevcut; motor DEĞİŞTİRİLMEDİ |

## 2. Oluşturulan mimari

```
Trendyol API  ──►  TrendyolAdapter ──►  SyncService (lock/circuit-breaker)
                    (adapter registry)         │
                                               ▼
                                   Normalization Layer (mapper → NormalizedOrder/Product)
                                               │
                                               ▼
                          Upsert Repository ──► PostgreSQL (workspace-scoped, Decimal)
                                               │
                        ┌──────────────────────┼──────────────────┐
                        ▼                      ▼                  ▼
              GET /marketplace/*       AI Mentor context    Hesaplama hints
              (Dashboard/Siparişler)   (aggregate-only)     (oran verisi)
```

Kurallar: sayfa açılışında dış API çağrısı YOK. Dış trafik yalnızca manual sync + env-gated worker.

**Dosya haritası (backend):**
- `src/lib/crypto.ts` — AES-256-GCM encrypt/decrypt + secret redaction
- `src/lib/money.ts` — Decimal dönüşümleri + deterministik `computeNetContribution`
- `src/services/integrations/types.ts` — `MarketplaceProviderAdapter`, `NormalizedOrder/Product` generic sözleşme
- `src/services/integrations/adapter-registry.ts` — provider kayıt/lookup + katalog
- `src/services/integrations/marketplaces/trendyol/` — `TrendyolTypes / TrendyolClient / TrendyolMapper / TrendyolAdapter / index`
- `src/services/integrations/repository.ts` — order+item ve product upsert'leri
- `src/services/integrations/sync-service.ts` — çekirdek sync, kilitleme, PARTIAL/FAILED semantiği
- `src/services/integrations/marketplace-worker.ts` — zamanlanmış pull (varsayılan KAPALI)
- `src/services/integrations/marketplace-routes.ts` — endpointler
- `src/services/integrations/queries.ts` — özet/topProducts aggregate + hesaplama ipuçları
- `src/services/integrations/credentials.ts` — decrypt + public view + safe error
- `src/services/integrations/ai-context.ts` — mentor bağlamı

## 3. Prisma modelleri (eklenen)

5 enum + 5 tablo (`prisma/schema.prisma` sonu):
- `IntegrationProvider` (TRENDYOL/HEPSIBURADA/SHOPIFY/WOOCOMMERCE), `IntegrationConnectionStatus` (PENDING/ACTIVE/ERROR/DISABLED), `IntegrationSyncType`, `IntegrationSyncRunStatus`, `MarketplaceOrderStatus` (8 normalize durum)
- **IntegrationConnection** — workspace+provider+externalAccountId UNIQUE; şifreli credential kolonları; `consecutiveFailureCount` (circuit breaker); `syncIntervalMinutes`
- **IntegrationSyncRun** — RUNNING satırı DB kilidi olarak da davranır; sayaçlar + safe hata alanı
- **MarketplaceOrder** — `(workspaceId, provider, externalId)` UNIQUE; tüm tutarlar `Decimal @db.Decimal(18,2)`; Float YOK
- **MarketplaceOrderItem** — satır bazlı para alanları; siparişle cascade
- **MarketplaceProduct** — barkod = satılabilir birim kimliği

Mevcut hiçbir model/servis/route adı değiştirilmedi; yalnızca `BusinessWorkspace` ve `User` modellerine ilişki eklendi.

## 4. Migration

`prisma/migrations/20260824150000_marketplace_integrations/migration.sql` — yalnız CREATE TYPE/TABLE/INDEX/CONSTRAINT; mevcut veriye dokunmaz. `npm run validate:migrations` → **PASS**.

## 5–7. Servisler, adapter, endpointler

**Endpointler** (`integrationRoutes`, prefix yok — absolute path):
- `GET /integrations/marketplaces` — katalog (yalnız TRENDYOL enabled; diğerleri comingSoon)
- `GET /integrations?workspaceId=` — sanitize edilmiş bağlantı listesi (credential materyali ASLA dönmez)
- `POST /integrations/trendyol/connect` — ÖNCE validateCredentials; geçersizse 400 + DB'ye YAZMAZ; başarılıysa şifreli kayıt ACTIVE
- `GET /integrations/trendyol/status?workspaceId=` — bağlı mı / syncing mi / counts / son 5 run
- `POST /integrations/trendyol/sync` — arka planda tetikler, anında döner; 409 = zaten çalışıyor
- `DELETE /integrations/trendyol/disconnect?workspaceId=` — satır silinir → credential irreversibly yok olur; **sipariş geçmişi korunur**
- `GET /marketplace/orders[/:id]`, `GET /marketplace/products`, `GET /marketplace/summary`, `GET /marketplace/calculation-hints`

Hepsi `access()` ile tenant-isolated; connect/sync/disconnect'te ek rate limit (10/dk).

**Trendyol adapter — resmi dokümandan doğrulanan gerçek uçlar** (developers.trendyol.com, Ağustos 2026):
- Siparişler: `GET https://apigw.trendyol.com/integration/order/sellers/{sellerId}/orders` (Basic auth; `startDate/endDate` epoch ms; size ≤200; geriye max 3 ay; 1000 istek/dk). `User-Agent: "{sellerId} - SelfIntegration"` ZORUNLU (yoksa 403); `storeFrontCode` header TR için "1".
- Ürünler: `GET .../integration/product/sellers/{sellerId}/products/approved` (**V2**; V1 ürün filtresi 10.08.2026'da kapandı — bu yüzden V2 kullanıldı; size ≤100, nextPageToken).
- Credential üçlüsü: supplierId (merchantId) + apiKey + apiSecret; Basic auth = `base64(apiKey:apiSecret)`. Kaynak yer: Satıcı Paneli → **Hesap Bilgileri → Entegrasyon Bilgileri** (yalnız ana kullanıcı). Bu metin UI rehberinde birebir kullanıldı.

Retry politikası: yalnız 429/5xx/network/timeout, maks 2 retry, exponential backoff + Retry-After; 400/401/403 denenmez. Timeout 15 sn (AbortController). Hata sınıflandırması: AUTH/RATE_LIMITED/BAD_REQUEST/NOT_FOUND/PROVIDER_ERROR/NETWORK/TIMEOUT/MALFORMED_RESPONSE.

## 8. Background sync

- `MARKETPLACE_SYNC_ENABLED !== 'true'` iken worker **hiç başlamaz** (production-safe varsayılan kapalı).
- `MARKETPLACE_SYNC_INTERVAL_MINUTES` (varsayılan 120, min 5); bağlantı bazında override.
- Kilitleme: süreç içi Set (senkron check-and-add, yarışsız) + RUNNING IntegrationSyncRun; 30 dk'yı aşan bayat run'lar FAILED işaretlenir.
- Circuit breaker: art arda 5 hata → zamanlanmış akış o bağlantıyı atlar; manuel sync denemeye devam eder; başarı sayacı sıfırlar.
- İlk sync son 30 gün; sonraki sync'ler `lastSuccessfulSyncAt − 6 sa bindirme`den itibaren, üst sınır 90 gün.

## 9. Frontend ekranları

- **Ayarlar → Entegrasyonlar**: yeni nav bölümü (`SettingsPage.jsx` + `.show_integrations` CSS kuralları; `?bolum=integrations` deep-link). Trendyol kartı (logo, durum badge'i, Merchant ID, son eşitleme, kayıt sayıları, Bağla / Şimdi eşitle / Bağlantıyı kaldır). Hepsiburada/Shopify/WooCommerce kartları "Yakında" + etkileşimsiz. Connect modalı: Mağaza/Merchant ID, API Key, **API Secret PasswordInput (maskeli)**; kısa rehber resmî panel yoluna göre; "Doğrula ve bağla". Disconnect `ConfirmModal` ile.
- **İşletme Takibi → Siparişler**: yeni sekme (`WorkspaceLayout.tabs`, router, Sidebar submenu, ContextPanel listeleri güncellendi). Dinamik tablo: Sipariş / Kaynak (Trendyol etiketi) / Tarih / Müşteri / Brüt / Komisyon / Kargo / İade / Net Katkı / Durum. Üstte "Son eşitleme: …" + "Şimdi eşitle". Satır tıklayınca detay modalı: sipariş no, ürünler/adetler, brüt, indirim, komisyon, kargo, iade, net katkı, durum, provider, son senkron. Boş durum, hata durumu, dark/light (token tabanlı), mobil responsive (yatay kaydırma + tek kolon grid).
- Dashboard'a UI eklenmedi (ürün kararı gereği minimal): yalnızca `/marketplace/summary` aggregate servisi hazır.

## 10. Normalize edilen alanlar (örnekler)

| Trendyol | LocalKarar |
|---|---|
| `shipmentPackageId`/`id` | `externalId` |
| `orderNumber` | `externalOrderNumber` |
| `status`: Created/Awaiting→CREATED; Picking/Invoiced/AtCollectionPoint→PROCESSING; Shipped→SHIPPED; Delivered→DELIVERED (+kısmi iade tespiti→PARTIALLY_RETURNED); Cancelled/UnSupplied→CANCELLED; Returned→RETURNED; UnDelivered/bilinmeyen→UNKNOWN | `status` enum |
| `grossAmount`, `totalDiscount` | Decimal tutarlar |
| satır `commission` (%13 gibi **yüzde**) | item `metadata.commissionPercent` — tutara çevrilmez |
| `customerFirstName+LastName` | `customerDisplayName` = "Ad S." (PII minimize) |
| `currencyCode` | `currency` (TRY fallback) |
| `cargoTrackingNumber`, `cargoProviderName`, `isCod`, `shippingCity` | `metadata` (provider-a özgü) |

## 11. Kasıtlı SAKLANMAYAN PII alanları

Trendyol payload'ında gelen ama **hiçbir kolona/metadata'ya yazılmayan**: müşteri e-postası, telefonu, tam teslimat/fatura adresi (adres satırları, mahalle, posta kodu), TCKN (`identityNumber`), vergi numarası, vergi dairesi, koordinatlar. Müşteri adı bile minimize saklanıyor. KVKK notu: bu alanlar bellekte işlenip atılır; privacy metninde "pazaryeri sipariş verisi işleme" başlığı açılırken "saklanmayanlar" listesi bu raporla birebir verilebilir.

## 12. Güvenlik önlemleri

AES-256-GCM (anahtar env `INTEGRATION_ENCRYPTION_KEY`, üretim uyarılı JWT_SECRET türetme fallback'i; DB/repo'da anahtar yok) · credential plaintext DB'ye yazılmaz, API yanıtına dönmez, `redactSecrets` ile log/hata temizliği (base64(key:secret) kombinasyonu dahil) · Fastify logger redact listesi zaten `body.apiKey/body.secret` maskeliyor · workspace tenant isolation her uçta · AuditLog + WorkspaceActivity · rota bazlı rate limit · timeout + max 2 retry · circuit breaker (5 ardışık hata) · çift seviyeli sync kilidi · upsert duplicate prevention · zod schema validation · raw provider hatası kullanıcıya iletilmez (safe message map).

Disconnect politikası: bağlantı satırı silinir (credential geri alınamaz şekilde yok olur), sync durur; **geçmiş sipariş/ürün kayıtları silinmez** (mevcut ürün kararı: işletme verisi korunur; otomatik silme yok).

## 13. AI Mentor & Hesaplamalar bağlantı noktaları

- Mentor: `resolveWorkspaceTrackerContext` içine opsiyonel `[PAZARYERİ ÖZETİ]` bloğu eklendi (`buildMarketplaceMentorContext`). Yalnız aggregate (sipariş sayısı, brüt, indirim; komisyon/kargo/iade/net için "veri yok"), top-3 ürün adı+adet. Raw payload ve müşteri PII'si asla prompta girmez. Mentor veriyi yorumlar, yeniden hesaplamaz ("tahmin uydurma" talimatı prompt içinde).
- Hesaplamalar: `GET /marketplace/calculation-hints` → `pazaryeri_siparis_kari` formunun girdilerine gerçek provider oranı (`avgCommissionPercent`) ve ortalama birim fiyat önerisi sağlar; hesaplama motoru (`calculateMarketplaceProfit`) hiç değiştirilmedi. Form UI'sine "Trendyol verilerinden doldur" düğmesi ileride bu endpoint ile 1 dosyalık eklemedir.

## 14. Test / build sonuçları

| Paket | Sonuç |
|---|---|
| Backend vitest | **121 dosya / 1819 test ✓** (yeni: `tests/integrations/crypto.test.ts` 10, `trendyol-normalization.test.ts` 17, `trendyol-client.test.ts` 15 — fetch mock ile 401/403/429/5xx/timeout/malformed/pagination, `marketplace-sync.test.ts` 27 — connect reddi, şifreli saklama, ilk/duplicate/concurrent/partial/auth-fail sync, tenant isolation, summary, disconnect, audit) |
| Frontend vitest | **45 dosya / 332 test ✓** (yeni: IntegrationsPanel 6, WorkspaceOrders 6 — sekre maskeleme, Yakında kartları, boşluk/hata durumları, detay çekmecesi) |
| `npm run build` (tsc) | ✓ exit 0 |
| `frontend npm run build` | ✓ built in ~10 s |
| `validate:migrations` | PASS (32 migration + yeni tablolar) |
| `secret:scan` | PASS |

## 15. Gerçek Trendyol bağlantısı için gereken bilgiler

Satıcıdan alınacak: **Merchant/Seller ID**, **API Key**, **API Secret** — Trendyol Satıcı Paneli → Hesap Bilgileri → Entegrasyon Bilgileri (yalnızca ana kullanıcı görüntüleyebilir). Test ortamı (stage) IP beyaz listesi ister; prod için IP gerekmez.

## 16. Production için eksik dış gereksinimler

1. `INTEGRATION_ENCRYPTION_KEY` (32 bayt) üretim env'ine eklenmelidir (fallback uyarı verir).
2. Zamanlanmış eşitleme isteniyorsa `MARKETPLACE_SYNC_ENABLED=true`.
3. Trendyol prod erişimi: entegrasyon onayı/User-Agent formatı Trendyol tarafında tanımlı olmalı; stage testleri için IP bildirimi.
4. **Gerçek komisyon/kargo/iade tutarları** sipariş payload'ında yok → net katkı null kalır. Tamamlanması için Trendyol *Settlement/Current Account Statement* API'sinin (getSettlements/getOtherFinancials) ayrı bir adapter genişletmesi planlanmalı; mevcut mimari bunu `commissionAmount/shippingAmount/refundAmount` kolonlarını doldurarak destekler.
5. Çok node'lu dağıtımda süreç içi lock yeterli değildir → Postgres advisory lock veya Redis'e taşınmalı (tek node MVP'de sorun değil; RUNNING satır kontrolü ikinci savunma).
6. Privacy/terms metinlerine pazaryeri veri işleme bölümü eklenmeli (bkz. §11; metinler bu görevde bilinçli değiştirilmedi).

## 17. TRENDYOL INTEGRATION MVP READY: **YES**

*(Not: gerçek credential olmadan canlı uç doğrulanamaz; tüm HTTP davranışı mock'lanmış testlerle ve resmî OpenAPI şemalarıyla doğrulandı.)*

---

# EK — ÜRÜNLER TARAFI (İkinci Görev, 24.08.2026)

## Navigation (koruma kuralı sağlandı)

- Sekme dizisi TEK KAYNAKA taşındı: `frontend/src/pages/Workspaces/navigation.js` → WorkspaceLayout sekmeleri, Sidebar alt menüsü ve ContextPanel aynı diziyi kullanır (kopya liste kalmadı).
- Beklenen sıra birebir korundu; yalnız **Ürünler** Siparişler ile Belgeler arasına eklendi:
  Genel Bakış · Kayıtlar · Siparişler · **Ürünler** · Belgeler · Bildirimler · Takvim · Ekip · Kişiler · Aktiviteler · Ayarlar
- Regresyon testi: `workspaceNavigation.test.js` (sıra + etiket + yol tutarlılığı + kopya id yok).

## Trendyol'dan DOĞRUDAN gelen ürün alanları

| Alan | Kaynak |
|---|---|
| externalId (= barkod), barcode | approved-products V2 variant |
| sku (stockCode), title (+varyant öznitelikleri), brand.name, category.name | approved-products V2 content/variant |
| salePrice, listPrice | approved-products V2 price; boşsa inventory-and-price'tan tamamlanır |
| stockQuantity | **`filterApprovedProductsInventoryAndPrice`** endpoint'inin `quantity` alanı (V2 base cevap stok adedi vermez — bu görevde eklendi; çağrı başarısızsa stok null kalır, 0 uydurulmaz) |
| isActive | onSale && !archived && !blacklisted |

## LocalKarar'ın SİPARİŞLERDEN hesapladığı alanlar

(`src/services/integrations/product-analytics.ts`; tek sorguda 90 gün çekilir, 7/30/90 pencerelerine ayrı biriktirilir):

- `unitsSold` — iptal edilmeyen siparişlerdeki toplam adet
- `orderCount` — ürünün geçtiği farklı sipariş sayısı
- `grossSales` — satır brüt toplamı (Decimal)
- `averageSellingPrice` = grossSales / unitsSold
- `returnedUnits` — siparis RETURNED ise tüm satırlar; kısmi iadede mapper'ın sakladığı gerçek `orderLineItemStatusName === 'Returned'` bayrağı (`metadata.lineStatus`)
- `returnRate` = returnedUnits / unitsSold
- `commissionTotal` / `shippingTotal` / `refundTotal` — yalnızca GERÇEK tutar taşıyan satırlardan toplam; hiç veri yoksa **null**
- `netContribution` — katkıda bulunan TÜM siparislerde net katki hesaplanabilirse toplam; tek eksik varsa **null**

## Trendyol API'de OLMADIĞI için gösterilmeyen analytics alanları

Resmî dokümantasyon tam indeksi (llms.txt) + arama ile doğrulandı: seller API'de **urun goruntuleme (views/impressions), favori, begeni ve urun analytics endpoint'i YOK**. Bu metrikler:

- Adapter'da capability bayraklarıyla raporlanır: `supportsProductViews=false`, `supportsFavorites=false`, `supportsProductAnalytics=false` (`GET /integrations/marketplaces` ve ürün detay yanıtı)
- UI'da hiçbir yerde gösterilmez, 0 yazılmaz; testlerle garanti edilir ("Sahte analytics yasağı" testi)

## Eklenen uçlar

- `GET /marketplace/products` — q / provider / onSale / stockFilter(low,out) / sort(bestSelling,topRevenue,mostReturned,title) / windowDays(7,30,90) / lowStockThreshold(ops.)
- `GET /marketplace/products/:productId` — ürün bilgileri + üç pencere performansı + capabilities
- `GET /marketplace/products/overview` — dashboard özeti: threshold, lowStockCount, outOfStockCount, bestSeller, topRevenue
- Düşük stok eşiği: env `MARKETPLACE_LOW_STOCK_THRESHOLD` (varsayılan 10) + istek bazında override; provider'a gönderilmez, yalnız LocalKarar uyarı eşiğidir; stok null olan ürün değerlendirmeye girmez
- AI Mentor bağlamı genişletildi: topProducts, lowStockProducts (eşik+sayı), bestSeller/topRevenue, highReturnProducts (≥%10 iade oranı) — aggregate-only, PII yok

## Test/build sonucu (ürün tarafı)

Backend: 122 dosya / **1833 test ✓** (yeni: `product-analytics.test.ts` 14 — pencereler, null-finansallar, iade oranı, düşük stok + esik override, sıralama, isolation, detay, overview, sahte analytics yasağı) · Frontend: 47 dosya / **340 test ✓** (yeni: Products sayfası 5, navigasyon regresyonu 3) · tsc ✓ · vite build ✓ · validate:migrations PASS

## PRODUCT TRACKING READY: **YES**

*(Operasyonel not: çalışan backend dev süreci eski kodu yüklemişse yeni `/marketplace/products*` uçları için bir kez yeniden başlatma gerekir. Order API sürümü günceldir: **V2 production default olarak aktiftir**; V1 yalnızca `TRENDYOL_ORDER_API_VERSION=v1` env ile açılan geçici ve açıkça işaretli bir fallback'tir ve **15 Ekim 2026'dan önce tamamen kaldırılmalıdır**.)*

---

# FINAL PRE-PRODUCTION CHECK (24.08.2026)

## 1) Migration durumu (dev DB `localakademi`)

`prisma migrate status`: "Database schema is up to date!" (32/32). Tablolar `information_schema` üzerinden birebir doğrulandı:

| Tablo | Durum |
|---|---|
| IntegrationConnection | PASS |
| IntegrationSyncRun | PASS |
| MarketplaceOrder | PASS |
| MarketplaceOrderItem | PASS |
| MarketplaceProduct | PASS |

5 enum tipi de mevcut. Satır sayıları smoke sonrası 0'a döndü; kullanıcı verisine dokunulmadı.

## 2) Order API V1 → V2 geçişi

- Resmî kaynak: developers.trendyol.com "Get Order Packages" (güncelleme 21.08.2026): **V2 zorunlu 15 Ekim 2026**, V1 o tarihte kapanıyor.
- **TrendyolClient artık varsayılan olarak V2'yi çağırıyor**: `GET {base}/integration/order/sellers/{sellerId}/v2/orders`. Yanıt şeması V1 ile aynı alan yapısını taşıdığı için **normalization layer ve core sync architecture DEĞİŞMEDİ**.
- V2 kısıtları işlendi: maks 10.000 kayıt + ~1 aylık erişim penceresi → sync-service geriye dönük bakış üst sınırı 90→**30 gün** çekildi (ilk sync zaten 30 gün).
- Geçici V1 fallback: yalnızca `TRENDYOL_ORDER_API_VERSION=v1` açıkça verilirse; süreç başına bir kez "[KULLANIM DISI]" uyarısı basar. Yeni kod V1'e bağımlılık EKLEMEZ; bu geçici fallback bayrağı, Trendyol'un V1'i kapattığı **15 Ekim 2026 tarihinden ÖNCE tamamen kaldırılmalıdır** (kod + env referansı dahil).
- Not: yüksek hacimli satıcılar için resmî öneri cursor tabanlı `/orders/stream` endpoint'idir — MVP senkron aralığı (30 gün, ≤10k kayıt) sayfa sayısal uçla uyumlu olduğundan şu an gerek yoktur; ileride adapter'a opsiyonel capability olarak eklenebilir.

## 3) Mock E2E marketplace smoke (`tmp/mock-marketplace-smoke.ts`)

Mock TRENDYOL adapter → gerçek sync-service → gerçek mapper/upsert pipeline → gerçek rotalar (in-process Fastify). Deterministik veri: **30 sipariş** (7/30/90 güne yayılmış; CANCELLED/RETURNED/PARTIALLY_RETURNED dahil), **15 ürün** (stok 0/3/9/10/25…, stok=null vakası, satışta olmayanlar).

Doğrulanan kalemler (tamamı PASS):

- Siparişler ekranı: total=30, durum filtresi (27 DELIVERED)
- Ürünler ekranı: 15 ürün listelenir
- Duplicate sync: 2. çalıştırmada sipariş=30 sabit, item=31 sabit (yeni kayıt YOK)
- 7/30/90 analytics çengelleri: P01 30g units=2/gross=199.98/avg=99.99; 90g units=4/gross=399.96
- Decimal hesap: 199.98 = 2×99.99 float kayması olmadan
- Null komisyon/kargo: verisi olmayan ürünlerde null; net katkı null
- Gerçek komisyon/kargo/net: P01 30g commissionTotal=29.99, shippingTotal=12.50, netContribution=157.49
- Kısmi net kuralı: P01 90g'de tek eksik bileşen → netContribution NULL (kısmi toplam da yapılmadı)
- İade: tam iade rate=1.0; kısmi iade (satır metadata'sından) returnedUnits=1/rate=0.25
- Düşük stok: eşik 10 → 5 ürün (P13 stok=null hariç tutuldu); stok-yok filtresi yalnız P03
- Sıralama: bestSelling/topRevenue/mostReturned doğru lider
- Detay drawer verisi: 7/30/90 pencereleri + capabilities false
- Overview: threshold=10, lowStockCount=5, outOfStockCount=1, bestSeller dolu

## 4) Raw error leakage denetimi (#5)

- Plugin-scoped `setErrorHandler` tüm entegrasyon rotalarını kapsar: beklenmeyen her istisna (Prisma, eksik tablo vb.) → kontrollü `500 INTEGRATION_UNAVAILABLE`; ham mesaj/stack hiçbir ortamda yanıta geçmez, detay yalnızca sunucu logunda.
- Smoke testinde bozuk Prisma enjeksiyonuyla doğrulandı: yanıt gövdesinde `P2021`/`invocation`/stack izi YOK.
- Tüm smoke yanıtları otomatik leak tarayıcısından geçti (`PrismaClient`, `TrendyolClientError`, `node_modules`, …) → 0 sızıntı.
- Frontend iki ekran da fetch hatalarında kontrollü hata durumu render eder (test edildi).

## 5) Full test / build sonuçları

- Backend vitest: 122 dosya / **1834 test ✓**
- Frontend vitest: 47 dosya / **340 test ✓**
- Backend production build (tsc): ✓ · Frontend production build (vite): ✓
- `validate:migrations`: PASS · Git commit/push: YAPILMADI

## FİNAL SONUÇLAR

- **Migration applied: YES**
- **Order API version: V2** (varsayılan; v1 yalnızca açık env ile, kullanılmasız işaretli geçici fallback)
- **Deprecated dependency remaining: NO** (V1 yoluna yeni bağımlılık eklenmedi; geçici `TRENDYOL_ORDER_API_VERSION=v1` fallback bayrağı 15 Ekim 2026 öncesinde tamamen kaldırılacaktır)
- **Mock E2E marketplace smoke: PASS** (40+ kontrol, hepsi yeşil)
- **Raw error leakage: 0**
- **MARKETPLACE PRE-PRODUCTION READY: YES**

*(Operasyonel not: çalışan backend dev süreci eski kodu yüklemişse yeni `/marketplace/products*` uçları için bir kez yeniden başlatma gerekir. Order API sürümü günceldir: **V2 production default olarak aktiftir**; V1 yalnızca `TRENDYOL_ORDER_API_VERSION=v1` env ile açılan geçici ve açıkça işaretli bir fallback'tir ve **15 Ekim 2026'dan önce tamamen kaldırılmalıdır**.)*

---

# EK — DASHBOARD & OPERATIONS UX (25.08.2026)

Amaç: marketplace verisi yalnız Siparişler/Ürünler ekranlarında kalmasın; günlük operasyon özeti ve aksiyonlar İşletme Takibi > Genel Bakış ile Ana Sayfa/Kontrol Merkezi üzerinde görünsün. **MİMARİ KURAL: iki ekran için ayrı hesaplama mantığı YAZILMADI** — tek provider-bağımsız servis, tek endpoint.

## 1) Ortak aggregate service

- Yeni: `src/services/integrations/operations.ts` → `getMarketplaceOperations(prisma, workspaceId)` = `{ summary, actions, highReturnProducts }`.
- Akış: MarketplaceOrder/MarketplaceProduct/IntegrationConnection → **Operations Aggregate Service** → **Action Engine** → Genel Bakış + Dashboard + AI Mentor.
- Endpoint: `GET /marketplace/operations?workspaceId=` (access() tenant-isolated). Genel Bakış, Ana Sayfa ve AI Mentor TEK bu kaynaktan beslenir. Mevcut summary/product-analytics servisleri silinmedi; ortak servis onları yeniden kullanır.
- Özet şekli: `connected, providers[], today{orderCount,grossSales,pendingShipmentCount,returnCount}, inventory{threshold,lowStockCount,outOfStockCount}, performance{bestSeller,topRevenueProduct}, sync{lastSyncedAt,hasError}`.
- Tutarlar SQL tarafında Decimal toplanır, serileştirme sınırında Number'a geçer (199.98 testi float kaymasız). Eksik finansal veri 0 diye UYDURULMAZ.
- Sayfa açılışında dış pazaryeri çağrısı YOKTUR: yalnız LocalKarar DB'si okunur; testte "EXTERNAL CALL MADE" fırlatan sahte adapter ile kanıtlandı. Az sayıda paralel sorgu, N+1 yok.

## 2) Action Engine

- Stateless, kategori başına TEK aggregate satır → duplicate task yapısal olarak imkânsız; problem çözülünce satır kendiliğinden kaybolur.
- Tipler: PENDING_SHIPMENT, LOW_STOCK, OUT_OF_STOCK, RETURN_PENDING, STALE_ORDER, HIGH_RETURN_RATE, SYNC_ERROR.
- Severity eşikleri `MARKETPLACE_ACTION_THRESHOLDS` sabitinde (magic number UI'a gömülmez): pending 1–2 INFO / 3+ ATTENTION / gecikmişse CRITICAL; stale >3 gün CRITICAL; low stock ATTENTION; stock=0 CRITICAL; iade oranı ≥%10 (≥5 adet) ATTENTION; sync hatası <24s ATTENTION, ötesi/circuit-breaker CRITICAL.
- HIGH_RETURN kuralı product-analytics'in paylaşılan `lineIsReturned` fonksiyonuyla hesaplanır — ikinci bir iade tanımı yazılmadı.

## 3) Genel Bakış değişiklikleri

- Mevcut dört kartlık bant (Açık yükümlülük/Belge/Son değişiklik/Takip durumu), Yaklaşan-Gecikenler, Son hareketler, Yeni kayıt ekle **aynen korundu**.
- Marketplace KPI şeridi (Bugünkü sipariş/brüt satış/Bekleyen kargo/Düşük stok/İade) bağlıyken AYRI ikinci şerit olarak eklenir; mevcut düzen bozulmaz.
- Takip durumu birleşik risk özeti: kritik varsa **Kritik**, aksi dikkat varsa **Dikkat**; alt satır "3 geciken kayıt · 4 sipariş kargoya verilmeyi bekliyor · 2 ürün düşük stokta" (maks 3 segment). Bağlı değilse eski Dikkat/Kontrollü davranışı birebir.
- Yaklaşan/Gecikenler listesine en fazla 3 aggregate aksiyon satırı kaynak etiketiyle ("Trendyol") eklenir; manuel kayıtlar asla bastırılmaz.
- Pazaryeri Özeti kompakt kartı: provider(lar), son eşitleme, bugün sipariş/satış, bekleyen kargo, düşük stok, iade + CTA'lar (Siparişleri gör / Ürünleri gör). Çoklu provider etiketi ("Trendyol +1").
- Son hareketler provider-bağımsız event dili: MARKETPLACE_SYNC_COMPLETED / ORDERS_IMPORTED / PRODUCTS_UPDATED / ORDER_DELIVERED / RETURN_DETECTED / LOW_STOCK_DETECTED. 20 sipariş = TEK satır ("20 yeni pazaryeri siparişi eşitlendi"); kaynak etiketi metadata.provider'dan.

## 4) Ana Sayfa değişiklikleri

- Hero (Bugünkü durum): marketplace riskleri BusinessRecord durumuyla BİRLEŞİR — "İşletmeniz dengeli, N konu dikkat istiyor" (N = geciken kayıt + non-INFO action grupları); alt cümleye ilk iki aksiyon eklenir. Tek başına hero'yu override ETMEZ; bağlantı yoksa davranış aynen.
- Sıradaki işler: manuel tracker kayıtları (ilk 3) + en fazla 2 aggregate aksiyon (toplam ≤4); severity→öncelik rozeti (CRITICAL=Yüksek…) ve kendi derin bağlantısıyla. Duplicate yok, manuel yükümlülük bastırılmaz.
- Pazaryeri Özeti: grid'e tam-genişlik KOMPAKT şerit (mevcut kart yerleşimi değişmez): mini istatistikler + best seller + son eşitleme + Siparişler/Ürünler CTA.
- Bağlı değilse ince tek satırlık CTA: "Henüz pazaryeri bağlantısı yok — Ayarlar → Entegrasyonlar" (ekranı kaplayan empty-state YOK).

## 5) Ürün görsel desteği — SUPPORTED

- Audit: Trendyol V2 approved-products cevabında görseller content seviyesinde `images[]` (+ legacy `imageUrl`). Mapper'a `sanitizeProductImageUrl`: yalnız https, ≤2048 char; `javascript:`/`data:` reddedilir. İlk geçerli URL `imageUrl`, ilk 3'ü `metadata.images`.
- Şema: `MarketplaceProduct.imageUrl String?` + `images Json?` — nullable güvenli migration (`20260825120000_marketplace_product_images_and_settings`), mevcut veriye dokunmaz.
- UI: listede thumbnail, detayda büyük görsel; yüklenemezse notr placeholder ikonu. Provider görsel vermiyorsa null — sahte resim URETILMEZ.

## 6) LocalKarar ürün yönetimi — READY (provider read-only)

- Provider'a WRITE YOK. Yeni yerel alanlar: `internalNote`, `tags Json?`, `lowStockThresholdOverride Int?`, `isFavorite Boolean`.
- Repository upsert update path'i SADECE provider sahipli alanları yazar; yerel alanlar sync tarafından EZİLMEZ (testle kanıtlı).
- Endpoint: `PATCH /marketplace/products/:productId/settings` (write rolü gerekir; viewer 403). Detay çekmecesinde düzenleme formu. Per-product eşik override'ı düşük stok değerlendirmesinde geçerlidir.

## 7) Deep-link davranışı

- Backend üretilir: pending shipment → `/orders?status=CREATED,PROCESSING`; return → `/orders?status=RETURNED,PARTIALLY_RETURNED`; low stock → `/products?stockFilter=low`; out of stock → `/products?stockFilter=out`; high return → `/products?sort=mostReturned`.
- Orders sayfası `?status=` (virgüllü) okuyup istemci filtresi + kaldırılabilir etiket gösterir; Products `?stockFilter/q/sort` parametrelerini açılışta alır (geçersiz değer yok sayılır).

## 8) No-integration davranışı

Bağlantı yoksa Genel Bakış ve Dashboard normal akışını AYNEN sürer; marketplace blokları hiç çizilmez; Dashboard'da yalnız ince CTA görünür. Operations endpoint hata verirse ekranlar çökmez (catch → null).

## 9) Sync error davranışı

`sync.hasError` connection status/lastErrorCode/consecutiveFailureCount'tan türetilir; UI kontrollü mesaj gösterir ("Pazaryeri verileri güncellenemedi." + "Son başarılı eşitleme: X önce"). Raw provider hatası ASLA gösterilmez. Activity feed gürültü kuralları: sipariş başına event YOK (aggregate + metadata.count); SYNC_COMPLETED kalp atışı günde bir; LOW_STOCK_DETECTED yalnız sayı değişince; feed yazım hatası sync'i bozmaz.

## 10) Test/build sonucu

- Backend vitest: **124 dosya / 1858 test ✓** (yeni: `marketplace-operations.test.ts` 16, `trendyol-product-images.test.ts` 8)
- Frontend vitest: **51 dosya / 361 test ✓** (yeni: DashboardMarketplace 6, OverviewMarketplace 7, WorkspaceOrdersDeepLink 3, WorkspaceProductsDeepLink 5)
- tsc ✓ · vite build ✓ · validate:migrations PASS · secret:scan PASS
- Navigation koruma: sekme sırası DEĞİŞMEDİ (`workspaceNavigation.test.js` yeşil)
- Git commit/push: YAPILMADI

## FİNAL SONUÇLAR

- **Marketplace operations aggregate: READY**
- **Smart action engine: READY**
- **Overview integration: READY**
- **Dashboard integration: READY**
- **Product images: SUPPORTED**
- **Local product management: READY**
- **External API call on page load: 0**
- **Raw error leakage: 0**
- **DASHBOARD & OPERATIONS UX READY: YES**

---

# EK — HEPSİBURADA PROVIDER (25.08.2026)

İkinci gerçek provider. Core marketplace mimarisi AYNEN korundu; yalnız yeni adapter + provider yuzeyi eklendi. Bu gorev ayni zamanda **provider-independence regression testidir**: tum Trendyol testleri degisiklikle birlikte de gecer.

## 1) Kullanilan resmi endpointler

Kaynak: developers.hepsiburada.com resmi API portali (OpenAPI turetimi, agustos 2026). Hostlar prod/sit ciftleri halinde yayimlidir:

| Yuzey | Host (prod / SIT) | Endpoint | Portal dokumani |
|---|---|---|---|
| Siparis paketleri | `oms-external[-sit].hepsiburada.com` | `GET /packages/merchantId/{merchantId}?offset&limit&beginDate&endDate` | siparis-olusturma-entegrasyonu |
| Iptal siparisler | `oms-external[-sit]` | `GET /orders/merchantId/{merchantId}/cancelled?offset&limit&beginDate&endDate` | siparis-olusturma-entegrasyonu |
| Odemesi tamamlanan siparisler | `oms-external[-sit]` | `GET /orders/merchantId/{merchantId}` | "Odemesi Tamamlanmis Siparisleri Listeleme" |
| Listing (fiyat/stok/satis) | `listing-external[-sit].hepsiburada.com` | `GET /listings/merchantid/{merchantId}?offset&limit` | listing entegrasyonu |
| Komisyon ORANLARI | `listing-external[-sit]` | `GET /commissions/merchantid/{merchantId}?skuList=` | listing entegrasyonu |
| Katalog (baslik/marka/kategori/gorsel) | `mpop[-sit].hepsiburada.com` | `GET /product/api/products/all-products-of-merchant/{merchantId}?page&size` | katalog-urun-entegrasyonu |

## 2) Authentication

- HTTP **Basic** auth: `username:password` base64. Credential'lar Merchant Portal (**merchant.hepsiburada.com → Ayarlar → Entegrasyonlar**) sayfasindan alinir.
- `merchantId` UUID bicimindedir; path segment olarak gecer.
- **User-Agent ZORUNLU**: portalda tanimli bare entegrator adi (`LocalKarar`) gonderilir; merchant-id-on-ekli UA kalibi bazi servislerde reddedilir.
- Generic `IntegrationConnection` kolonlari YETERLI: `externalAccountId=merchantId`, `encryptedApiKey=username`, `encryptedApiSecret=password`. **Schema degisikligi yapilmadi.** AES-256-GCM saklama, public view'dan geri donmeme, safe error kurallari Trendyol ile ayni.
- Ortam secimi env ile: `HEPSIBURADA_ENV=sit|production` (varsayilan production); base URL'ler hard-code edilmis host tablosundan cozulur, SIT/prod karismasi imkansiz.

## 3) Date / pagination limitleri

- Siparis listeleri: `offset` + `limit` (sunucu ust siniri ~1000; adapter guvenli 100 sayfa boyu kullanir) ve `beginDate`/`endDate` ISO tarih filtreleri.
- Listing: zorunlu `offset`/`limit`; katalog Spring page (`page`/`size`, cevap `{data|content|items}` zarfi — savunmaci acilir).
- Initial sync mevcut mimarinin 30 gun penceresiyle baslar; incremental `lastSuccessfulSyncAt − 6s bindirme` ile ayni ortak mantigi kullanir (provider'a ozgü sync motoru YAZILMADI).

## 4) Order mapping

- Lifecycle PROVIDER ICINDE birlestirilir: `/packages` (tum paketler) + `/orders/cancelled` tek akista taranir; core sadece `fetchOrders` gorur.
- Durum eslemesi (`mapHepsiburadaStatus`): Unpacked/Created/Open→CREATED · Picking/Packaging→PROCESSING · Shipped/Shipping→SHIPPED · Delivered→DELIVERED · Cancelled→CANCELLED · Returned→RETURNED · Undelivered/bilinmeyen→**UNKNOWN** (yanlis tahmin yok).
- externalId=`packageNumber ?? orderNumber`; kalemler `items|lines|orderLines` anahtarlarindan savunmaci okunur. **Kalemsiz satir import edilmez** — uydurulmus kalem yasak.
- Musteri adi minimize ("Ayşe Y."); para TRY; gross paket toplamindan veya kalem toplamlarindan.

## 5) Product mapping

Listing (fiyat/stok/satis) + Catalog (icerik) merchantSku uzerinden ADAPTER ICINDE birlestirilir:
externalId=merchantSku · sku=merchantSku · title/categoryName/brand=katalog fields · salePrice=price · stockQuantity=availableStock (null uydurmaz) · isActive=isSalable ∧ ¬suspended ∧ ¬locked ∧ ¬frozen · providerUpdatedAt=max(catalog.modifiedAt, listing update tarihleri).

## 6) Desteklenen images — SUPPORTED

Katalog `fields.images` (string[] / {url}[] / CSV formlari) gercek https URL'leri verir. **Trendyol'un `sanitizeProductImageUrl` sanitizer'i yeniden KULLANILDI** (yeni sanitizer yazilmadi): javascript:/data:/http: reddedilir. Ilk gec URL `imageUrl`, ilk 3'u `metadata.images`. Gorsel yoksa null.

## 7) Desteklenen finansal alanlar

- Komisyon ORANI: resmi `/commissions` endpoint'i MEVCUT → capability `supportsCommissionData=true` olarak bildirildi; MVP sync'ine KARISTIRILMADI (ayri faz).
- Settlement/muhasebe (`muhasebe-entegrasyonu`): ayri faz → `supportsSettlementData=false`.

## 8) Unavailable alanlar (null tasinir, uydurulmaz)

Siparis payload'inda komisyon/kargo/iade TUTARI ve indirim yok → null. Listing'de liste fiyati yok → null. Barkod garantili alan yok (`uniqueIdentifier` garanti GTIN olmadigindan barcode'a kopyalanmaz, metadata'da tasınır). Provider analytics (views/favorites) YOK → capability false.

## 9–10) Saklanan / discard edilen PII (HEPSIBURADA DATA INVENTORY)

**Gelip SAKLANAN**: siparis no/paket no, tarih, durum, tutar(lar), kalem SKU/adet/fiyat, kargo firmasi+takip no, minimize musteri adi ("Ayşe Y."), urun katalog verisi (baslik/marka/kategori/gorsel).
**Gelirse DISCARD EDILEN**: tam ad soyad, adres, telefon, e-posta, TCKN, fatura bilgileri — hicbir kolona/metadataya yazilmaz.
**Credential tipi**: Basic username+password (AES-256-GCM sifreli; Basic token base64 butunluguyle secret sayilir, redaction testli).
**Settlement verisi**: bu fazda CEKILMIYOR. **Yurt disi aktarim**: Hepsiburada API'sine Turkiye icinden Basic auth ile baglaniliyor; Trendyol'dan farkli bir aktarim rejimi olusturmuyor.

## 11) Mock E2E

`tmp/mock-hepsiburada-smoke.ts` (+ paylasilan fixture modulu): raw payload → GERCEK mapper → DB pipeline. Sonuc: **ALL PASS** — 40 siparis (created 7/processing 6/shipped 8/delivered 12/cancelled 4/returned 3), 20 urun, 20 gorsel, operations aggregate dogru. Production kodu mock'u import etmez.

## 12) Multi-provider E2E (`tests/integrations/hepsiburada-multi-provider.test.ts`, 11 test)

Ayni workspace'te iki provider ayni anda bagli: IntegrationConnection=2 · her iki provider'dan siparis/urun import · cross-provider duplicate externalId (`PKG-SHARED-1`, `SKU-SHARED`) iki AYRI satir (provider-scoped UNIQUE) · tekrar-sync duplicate uretmiyor · operations iki provideri TEK havuzda topluyor · orders `?provider=` filtresi · LocalKarar settings provider satiri bazinda izole · HB sync yerel alanlari ezmiyor · PII sizintisi 0 · workspace izolasyonu · disconnect yalniz hedef provider'i kaldiriyor, gecmis korunuyor.

## 13) Core architecture degisti mi? — **HAYIR**

Core sync service, repository, product-analytics, operations/action engine, mentor context: provider branch'i EKLENMEDEN degismedi. Yapilan tek core-dosya dokunmalari: (a) enum zaten vardi, (b) catalog'da HEPSIBURADA enabled, (c) capability interface'ine opsiyonel finansal bayraklar (default false — Trendyol etkilenmez), (d) orders query'sine opsiyonel `provider` filtresi, (e) mentor'a bagli saglayici satiri. Hepsi additive/provider-bagimsizdir.

## 14) Test/build sonucu

- Backend vitest: **127 dosya / 1896 test ✓** (yeni: hepsiburada-client 8, hepsiburada-mapper 12, multi-provider E2E 11)
- Frontend vitest: **51 dosya / 364 test ✓** (IntegrationsPanel coklu-provider genisletildi: HB kart/modal/connect/durum)
- tsc ✓ · vite build ✓ · validate:migrations PASS · secret:scan PASS
- Legal metinleri BU GOREVDE degistirilmedi (yalnizca yukaridaki data inventory raporlandi)

## FİNAL SONUÇLAR

- **Hepsiburada adapter: READY**
- **Orders: READY**
- **Products: READY**
- **Product images: SUPPORTED**
- **Financial fields: PARTIAL** (komisyon orani endpoint'i mevcut/ayri faz; settlement ayri faz)
- **Multi-provider aggregate: PASS**
- **Core provider-specific branch introduced: NO**
- **External API call on page load: 0**
- **Raw secret/error leakage: 0**
- **HEPSIBURADA INTEGRATION MVP READY: YES**

---

# EK — N11 PROVIDER (25.08.2026)

Üçüncü gerçek provider. Core marketplace mimarisi (MarketplaceProviderAdapter → registry → sync service → normalization → tablolar → product analytics → operations → Dashboard/Genel Bakış/AI Mentor) **AYNEN korundu**; yalnız yeni adapter + provider yuzeyi eklendi. Bu gorev **provider-independence regression testidir**: tum Trendyol + Hepsiburada testleri N11 ile birlikte de gecer.

## 1) Kullanilan resmi endpointler

Kaynak: **developer.n11.com** resmi REST dokumantasyonu (agustos 2026). Host: `https://api.n11.com` (dokumanda tek ortam; resmi sandbox yayinlanmamistir).

| Yuzey | Endpoint | Portal dokumani |
|---|---|---|
| Siparis listeleme | `GET /rest/delivery/v1/shipmentPackages` | n11 Sipariş Entegrasyonu → "Sipariş Listeleme Servisi" |
| Satici urun sorgulama | `GET /ms/product-query` | n11 Ürün Entegrasyonu → "Satıcı Ürün Sorgulama (GetProductQuery)" |
| Statu anlamlari | — | Bilgilendirmeler → "RestAPI Sipariş Servis Bilgilendirmeleri" (statü tablosu + SOAP↔REST parametre esleme) |
| Hata mesajlari | — | Bilgilendirmeler → "API Hata Mesajları ve Açıklamaları" |
| Iade talepleri | `ReturnService` (ayri faz) | İade/İptal Entegrasyonu → "İade Talepleri Servisi" |

Kullanilmayan (kapsam disi): Urun Yukleme/Guncelleme/Silme (WRITE yok), Siparis Kalemlerini Guncelleme, Paket Bolme, Fatura Linki, SettlementService (SOAP).

## 2) Authentication

- Resmi model: her istekte **HTTP header** olarak `appkey` + `appsecret`. Dokuman "Authorization: no auth" der; token/Basic YOK.
- Ayri seller/store identifier **ZORUNLU DEGIL** (sellerId yalnizca yanitlarda bilgi amacli). LocalKarar baglanti kimligi icin kullaniciya "Mağaza Adı" sorulur → `externalAccountId` (unique kimlik; API'ye gonderilmez).
- Anahtarlar: Satici Paneli **so.n11.com → Hesabım → API Hesapları** (UI rehber metni bu resmi yolu gosterir).
- Generic `IntegrationConnection` kolonlari YETERLI: `externalAccountId=storeName`, `encryptedApiKey=appKey`, `encryptedApiSecret=appSecret`. **Schema degisikligi YAPILMADI** (yalnizca enum'a N11 eklendi). AES-256-GCM saklama, public view'dan geri donmeme, connect-once-validate kurallari Trendyol/HB ile ayni.
- Rate limit (resmi): shipmentPackages icin dakikada maks 1000 istek. Client: timeout 15 sn, retry yalniz 429/5xx/network/timeout (maks 2, Retry-After saygili), 401/403/400 denenmez.

## 3) Date / pagination limitleri (resmi)

- `startDate`/`endDate`: epoch ms (GMT+3). Provider araligi **15 gune** sinirlar (tek taraf girilirse diger yone 15 gun; cok genis aralikta endDate oncesi son 15 gun). Adapter (`buildDateWindows`) 30 gunluk initial sync'i resmi sinira uygun ≤15 gunluk pencerelere boler (maks 3 pencere).
- **Kasim 2024 oncesi siparis verisi bu servisten DONMEZ** (resmi sinir; raporlanan kisit).
- `status` parametresi TEK deger alir → adapter resmi durum kovalarini (Created/Picking/Shipped/Delivered/Cancelled/UnSupplied) ayri isteklerle tarar. `Unpacked` bilinçli TARANMAZ: resmi dokumanda paket bolme ANA kaydinin statüsüdür; child paketler (Picking/…) otoriter durumu tasir — ikisi birden alinirsa kalem/satis mukerrer uretilir.
- Sayfalama: `page` (0-based) + `size` (maks 100), `totalPages`; bos content son sayfa. Urunler: `page`/`size` (maks 250), Spring pageable zarfi (`last`/`totalPages`).
- `orderByField=true` → tarih filtresi `lastModifiedDate` uzerinden (incremental sync icin dogru mod); `orderByDirection=ASC`.

## 4) Order mapping

- Durum eslemesi (`mapN11Status`, resmi statü tablosundan): Created/Unpacked→CREATED · Picking→PROCESSING · Shipped→SHIPPED · Delivered→DELIVERED · Cancelled + **UnSupplied→CANCELLED** (resmi tablo 8 "Reddedilmiş"; Trendyol konvansiyonuyla ayni) · bilinmeyen→**UNKNOWN** (tahmin yok).
- Iade statuleri (9/11/12/16/52/53) resmi tabloda paket statusu olarak **Delivered** donecegi icin orders endpoint'inden RETURNED CIKARILMAZ; iade akisi ayri ReturnService fazidir (uydurma yok).
- externalId = `id` (paket numarasi). Konuma ozel teslimatta id null doner (resmi) → deterministik kimlik `orderNumber-orderLineId`; o da yoksa satir import edilmez.
- `grossAmount` = `totalAmount` (resmi) → fallback satir `sellerInvoiceAmount` toplami; `discountAmount` = `totalDiscountAmount`. Siparis tarihi = `packageHistories[status=Created].createdDate` (resmi esleme tablosu) → fallback `lastModifiedDate`; `providerUpdatedAt` = `lastModifiedDate` (epoch ms).
- Kalemler: `orderLineId`→externalId, `productId`→externalProductId, `stockCode`→sku, `productName`→title, `barcode`, `quantity`, `price`→unitPrice, **`sellerInvoiceAmount`→grossAmount** (resmi: "Fatura edilecek toplam tutar icin lines blokundaki sellerInvoiceAmount alanini baz alabilirsiniz"), satici indirimleri (`totalSellerDiscountPrice` / sellerDiscount+sellerCouponDiscount)→discountAmount. `commissionRate`/`vatRate`/`lineStatus`/`mallDiscount` metadata'da.

## 5) Product mapping

`ms/product-query` tek endpoint'ten: `n11ProductId`→externalId · `stockCode`→sku · `barcode` (null olabilir) · `title` · brand=attributes["Marka"] · **category ADI resmi alanda YOK** (yalniz `categoryId`) → category null, id metadata'da · `salePrice`/`listPrice`/`quantity`→stock · `currencyType` "TL"→TRY · `isActive` = status "Active" · `providerUpdatedAt` resmi alanda yok → null. Catalog+listing ayri endpoint GEREKMIYOR (tek sorgu hepsini tasiyor).

## 6) Images — SUPPORTED

Resmi `imageUrls[]` gercek https URL'ler verir (ornek: `n11scdn3.akamaized.net/...`). **Trendyol'un `sanitizeProductImageUrl` sanitizer'i yeniden KULLANILDI** (yeni sanitizer yazilmadi): yalniz https, ≤2048 char; `javascript:`/`data:` reddedilir. Ilk gecerli URL `imageUrl`, ilk 3'u `metadata.images`. Gorsel yoksa null — sahte gorsel URETILMEZ.

## 7) Finansal alanlar — PARTIAL

- **Komisyon ORANI** resmi olarak mevcut (`lines.commissionRate`, urun `commissionRate`; kampanya indirimi `sellerCampaignCommissionRate`) → `supportsCommissionData=true`; TUTAR provider'dan donmedigi icin commissionAmount null, oran metadata'da (Trendyol konvansiyonu).
- **Kargo maliyeti**: payload'da YOK (yalnizca `deliveryFeeType` kim odedigini soyler) → `supportsShippingCost=false`, shippingAmount null.
- **Iade tutari**: orders payload'inda YOK → null. **Settlement**: REST dokumaninda kapsam disi (SOAP SettlementService ayri faz) → `supportsSettlementData=false`.
- Satici fatura tutari `sellerInvoiceAmount` resmi formulle dogrulanir: `(price*qty) − (sellerDiscount + sellerCouponDiscount) = sellerInvoiceAmount`.

## 8) N11 DATA INVENTORY (Legal ek)

**Gelip SAKLANAN**: paket no/siparis no, tarih(ler), durum, tutarlar (totalAmount/totalDiscountAmount/sellerInvoiceAmount), kalem SKU/adet/birim fiyat/barkod/urun adi, kargo firmasi+takip no, minimize musteri adi ("Ayşe Y."), opak alici ID, urun katalog verisi (baslik/marka/kategori id/fiyat/stok/gorsel), komisyon/KDV ORANLARI.
**Gelirse DISCARD EDILEN (PII)**: `customerEmail`, `customerfullName` (yalniz minimize turetilir), `tcIdentityNumber`, `taxId`, `taxOffice`, `billingAddress.*`, `shippingAddress.*` (adres/GSM/TCKN) — hicbir kolona/metadataya yazilmaz (testle kanitli).
**Credential tipi**: appKey + appSecret (header auth) — AES-256-GCM sifreli; ikisi de secret sayilir, redaction testli.
**Finance/settlement verisi**: bu fazda CEKILMIYOR. **Yurt disi aktarim**: api.n11.com Turkiye'de barinir; Trendyol/Hepsiburada'dan farkli bir aktarim rejimi olusturmaz.

## 9) Mock N11 provider

`tests/integrations/fixtures/n11-fixtures.ts`: raw payload'lar resmi shape'te (shipmentPackages content[] + Spring pageable product-query; PII alanlari GERCEK payload gibi dolu). 20 urun + 40 siparis (Created 6/Picking 7/Shipped 6/Delivered 13/Cancelled 5/UnSupplied 3) + cross-provider shared kayitlar. Akis: **raw → GERCEK N11Mapper → ortak DB pipeline**; normalize edilmis sahte nesne yok. Production kodu mock'u import etmez.

## 10) Multi-provider E2E (`tests/integrations/n11-multi-provider.test.ts`, 13 test)

Ayni workspace'te **Trendyol + Hepsiburada + N11** ayni anda bagli: 3 ACTIVE IntegrationConnection · her üç provider'dan import (TY 2 + HB 41 + N11 41 siparis; N11 status dagilimi gercek mapper'dan) · ayni fiziksel urun (barcode SKU-SHARED) uc provider'da uc AYRI satir · tekrar-sync duplicate 0 · orders/products `?provider=N11` filtresi · LocalKarar settings provider satiri bazinda izole · N11 sync yerel alanlari (note/tags/threshold) ezmiyor · operations aggregate uc provideri TEK havuzda (today/pending/lowStock DB ile birebir) · AI mentor context aggregate-only + PII 0 · workspace izolasyonu (403) · N11 status endpoint'i credential sizdirmiyor · **disconnect yalniz N11'i kaldiriyor, gecmis (41 siparis) korunuyor**.

## 11) Connection / Orders / Products UI

- Ayarlar → Entegrasyonlar: **N11 karti "Yakında"dan AKTIF'e** alindi (ortak kart iskeleti + ortak modal shell; Shopify/WooCommerce hâlâ "Yakında"). Modal alanlari resmi modele gore: Mağaza Adı + App Key + App Secret (maskeli); rehber metni resmi yolu gosterir (so.n11.com → Hesabım → API Hesapları).
- Siparisler/Ürünler ekranlarinda Kaynak filtresi: Tümü / Trendyol / Hepsiburada / **N11**. Provider'a ozgü ekran YOK; ayni normalize kolonlar, gorsel, stok/fiyat, LocalKarar not/tags/favorite/threshold mantigi N11'de de calisir.
- Canli dogrulama (Playwright, 17 kontrol PASS): N11 karti + Bagla + modal + filtreler + dark mode + mobil (yatay tasma yok). Ekran goruntuleri `tmp/qa-shots/N0-N3`.

## 12) Core architecture degisti mi? — **HAYIR**

sync-service, repository, product-analytics, operations/action engine, queries, crypto: **hiçbiri değişmedi** (provider branch'i 0). Dokunulan core-dosyalar additive: (a) `ProviderCode` + Prisma enum'a N11, (b) PROVIDER_CATALOG'a N11 enabled, (c) orders/products query `provider` enum'una N11, (d) marketplace-routes'a `registerAdapter(n11Adapter)` + N11 baglanti yuzeyi (HB deseni), (e) mentor provider etiket haritasina N11. Action engine tanimlari DEGISKENDI degil; N11 aksiyonlari ayni derin baglanti semantiyla uretilir (`?provider=` filtresi zaten destekli).

## 13) Test/build sonucu

- Backend vitest: **130 dosya / 1945 test ✓** (yeni: n11-client 13, n11-mapper 23, uc-provider E2E 13; marketplace-sync katalog testi N11 ile guncellendi)
- Frontend vitest: **51 dosya / 369 test ✓** (IntegrationsPanel N11 karti/modal/connect/uc-provider durum; Orders/Products N11 filtre testleri)
- tsc ✓ · vite build ✓ · validate:migrations PASS (34 migration; `20260825140000_n11_provider` temiz apply) · secret:scan PASS
- Canli smoke: `/integrations/marketplaces` N11 enabled+capabilities donuyor; yanlis credential ile connect → 400 + DB'ye YAZMAZ (validate-once)
- Legal metinleri BU GOREVDE degistirilmedi (yalnizca yukaridaki N11 DATA INVENTORY raporlandi)
- Git commit/push: YAPILMADI

## FİNAL SONUÇLAR

- **N11 adapter: READY**
- **Orders: READY**
- **Products: READY**
- **Product images: SUPPORTED**
- **Financial fields: PARTIAL** (komisyon ORANI mevcut; komisyon tutari/kargo/iade/settlement provider tarafindan saglanmiyor → null, ayri faz)
- **Three-provider aggregate: PASS**
- **Core provider-specific branch introduced: NO**
- **External API call on page load: 0**
- **Raw secret/error leakage: 0**
- **N11 INTEGRATION MVP READY: YES**

---

# EK — SHOPIFY PROVIDER (25.08.2026)

Dördüncü gerçek provider ve ilk storefront platformu. `MarketplaceProviderAdapter → registry → ortak sync → normalization → MarketplaceOrder/Item/Product → product analytics → operations/action engine → Dashboard/Genel Bakış/AI Mentor` hattı korunmuştur. Shopify için ayrı sync engine, ayrı sipariş/ürün ekranı veya core provider branch'i yazılmamıştır.

## 1) Resmî Shopify audit'i ve API kararı

Tek source-of-truth Shopify Developer Docs'tur:

- [App authentication yaklaşımı](https://shopify.dev/docs/apps/build/authentication-authorization): LocalKarar Shopify Admin dışında çalışan standalone/API-only uygulamadır; başka merchant mağazaları için authorization-code grant kullanmalıdır. Client credentials yalnız aynı Shopify organization içindeki mağazalar içindir.
- [Access tokens](https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens): Admin GraphQL çağrısı `X-Shopify-Access-Token` ile yapılır; background sync için offline token uygundur. Shopify Admin içinde yeni “pre-generated custom app token” uygulaması artık oluşturulamaz.
- [GraphQL Admin orders](https://shopify.dev/docs/api/admin-graphql/2026-07/queries/orders), [products](https://shopify.dev/docs/api/admin-graphql/2026-07/queries/products), [ProductVariant](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/ProductVariant), [InventoryLevel](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/InventoryLevel), [Order](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Order), [Refund](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Refund), [Return](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Return), [Fulfillment](https://shopify.dev/docs/api/admin-graphql/2026-07/objects/Fulfillment).
- [Rate limits](https://shopify.dev/docs/api/usage/limits): GraphQL cost/leaky-bucket modeli; `extensions.cost.throttleStatus` (`currentlyAvailable`, `restoreRate`) izlenir.
- [Versioning](https://shopify.dev/docs/api/usage/versioning): production sürümü açıkça `2026-07`; her çeyrek audit edilmelidir (2026-07 erişim sonu 16.07.2027).
- [Access scopes](https://shopify.dev/docs/api/usage/access-scopes): minimum read-only scope'lar `read_orders`, `read_products`, `read_inventory`, `read_returns`. `read_all_orders` istenmemiştir; MVP ortak sync penceresi 30 gün olduğu ve `read_orders` son 60 güne eriştiği için yeterlidir.
- [Development stores](https://shopify.dev/docs/apps/build/dev-dashboard/stores/development-stores): gerçek mağazayı etkilemeden app/order/product testi; Bogus gateway/test mode. Local testlerde ayrıca resmî GraphQL shape'e yakın fixture kullanılır.

**REST Admin API kullanılmamıştır.** Tüm yeni provider çağrıları `POST https://{shop}.myshopify.com/admin/api/2026-07/graphql.json` üzerindedir.

## 2) Auth modeli — OAUTH

Seçim: **authorization-code OAuth + offline Admin API access token**.

Neden custom token formu seçilmedi: Shopify'ın güncel dokümanı, Shopify Admin içinde pre-generated token üreten yeni app'lerin artık oluşturulamadığını; standalone uygulamaların authorization-code grant kullanması gerektiğini belirtir. LocalKarar çok merchant'lı SaaS olduğundan “aynı organization” ile sınırlı client-credentials grant de uygun değildir.

- UI yalnız `magazaniz.myshopify.com` ister; kullanıcı Shopify'ın resmî izin ekranına yönlenir.
- Callback Shopify HMAC'i + 10 dakikalık HMAC imzalı state'i doğrular; state workspace/user/shop bağını taşır ve callback'te tenant write yetkisi yeniden kontrol edilir.
- `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_OAUTH_REDIRECT_URI` yalnız backend env'dedir. Client secret DB'ye/JS bundle'a girmez.
- Mağazaya özel offline token `encryptedAccessToken` içinde AES-256-GCM saklanır. `externalAccountId=normalized *.myshopify.com`; `displayName=shop.name`.
- Token/plain credential hiçbir public connection response'unda dönmez. `X-Shopify-Access-Token`, açık token ve `shpat_*` redaction testlidir.
- Bu MVP custom distribution/non-expiring offline token varsayımıyla çalışır. Public App Store dağıtımına geçilirse Shopify'ın Ocak 2027 zorunluluğu öncesinde `expiring=1`, encrypted refresh token ve token-expiry alanı/refresh worker'ı ayrı migration ile eklenmelidir.

## 3) Adapter / client

Yeni klasör: `src/services/integrations/marketplaces/shopify/`

- `ShopifyClient.ts`: versioned GraphQL endpoint, timeout 15 sn, maksimum 2 transient retry; 401/403 retry edilmez; 429/5xx `Retry-After`/exponential backoff; GraphQL `THROTTLED` + cost throttle budget; malformed JSON/envelope ve cursor döngüsü kontrollü hata.
- `ShopifyAdapter.ts`: `validateCredentials`, `fetchOrders`, `fetchProducts`, `normalizeOrder`, `normalizeProduct`, `healthCheck`, capabilities.
- `ShopifyMapper.ts`: PII'siz order/variant/inventory/image normalization.
- `ShopifyAuth.ts`: OAuth URL/state/HMAC/token exchange.
- `ShopifyTypes.ts`, `ShopifyErrors.ts`: raw GraphQL shape + güvenli error taxonomy.

Cursor pagination adapter içinde sonuna kadar çözülür; core sayfa numarası/cursor bilmez. Orders `updated_at:>=... updated_at:<=...` filtresi ile ortak `lastSuccessfulSyncAt − 6 saat overlap` penceresini kullanır. Products/variants tam cursor taramasıdır. Güvenlik üst sınırı 200 cursor page'dir; cursor eksik/tekrarlıysa sessiz veri kaybı yerine kontrollü hata oluşur.

## 4) Orders / lifecycle / financial mapping

Kimlik: `Order.id` GID → `externalId`; `name` → order number; `createdAt`, `updatedAt`, currency, original/current totals ve line items gerçek alanlardan alınır.

Durum tek bir Shopify alanından tahmin edilmez:

- `cancelledAt` → CANCELLED (cancellation refund'ı return sayılmaz)
- gerçek refund toplamı >0 ve original totalin tamamı → RETURNED
- gerçek refund toplamı >0 fakat toplamdan küçük → PARTIALLY_RETURNED
- fulfillment `displayStatus=DELIVERED`/`deliveredAt` + order FULFILLED → DELIVERED
- FULFILLED/PARTIALLY_FULFILLED → SHIPPED
- IN_PROGRESS/PENDING_FULFILLMENT/SCHEDULED/ON_HOLD → PROCESSING
- UNFULFILLED/OPEN + pending/authorized → CREATED
- bilinmeyen kombinasyon → UNKNOWN

Gerçek finansal alanlar:

- brüt: `totalPriceSet` (return öncesi original total)
- indirim: `currentTotalDiscountsSet`
- vergi: `currentTotalTaxSet`
- müşteriden alınan kargo: `currentShippingPriceSet` (fallback `totalShippingPriceSet`)
- refund: `Refund.totalRefundedSet` toplamı
- payment/platform commission veya Shopify Payments fee: order payload'ından uydurulmaz → null
- payout/settlement: `read_shopify_payments_payouts` ve ayrı Payments/Payout akışı gerekir; bu MVP'de scope istenmez/veri çekilmez

Capabilities: `supportsShippingCost=true`, `supportsRefundData=true`, `supportsCommissionData=false`, `supportsSettlementData=false`; product views/favorites/provider analytics false.

## 5) Products / variants / inventory / images

Shopify'da satılabilir, fiyatlanan, SKU/barcode ve stok taşıyan birim **ProductVariant** olduğundan:

- `MarketplaceProduct.externalId = ProductVariant.id` (GID)
- parent `Product.id/title` metadata'da; otomatik cross-provider merge yok
- title = parent title + anlamlı variant title; SKU/barcode, vendor→brand, productType→category, price→salePrice, compareAtPrice→listPrice
- active = parent Product ACTIVE ve variant `availableForSale !== false`
- providerUpdatedAt = variant.updatedAt (fallback product.updatedAt)

Inventory: `InventoryItem.inventoryLevels.quantities(names:["available"])` lokasyon bazında alınır. Tüm location sayfası geldiyse available deterministik toplanır. Location bağlantısı 100'den büyük/truncated ise eksik toplam yapılmaz; Shopify'ın variant-level `inventoryQuantity` aggregate'i kullanılır ve `inventoryLevelsTruncated=true` metadata'da belirtilir. Provider location modeli core schema'ya taşınmamıştır.

Images: variant image → parent featured media → ilk product media sırasıyla; mevcut `sanitizeProductImageUrl` yeniden kullanılır (yalnız https, ≤2048). İlk gerçek URL `imageUrl`, ilk üç gerçek URL metadata `images`; sahte/fallback ürün görseli üretilmez.

## 6) SHOPIFY DATA INVENTORY (teknik veri akışı; hukuki görüş değildir)

**Shopify'dan gelen ve saklanan:** shop domain/shop display name; order GID/name/timestamps/status kombinasyonları; para birimi, brüt/indirim/vergi/kargo/refund tutarları; line item GID, variant/product GID, SKU/barcode, ürün adı, adet/fiyat/indirim; fulfillment sayısı ve sınırlı teknik status; return status listesi; variant/product katalog alanları, fiyat, toplam/çoklu-location available stock, gerçek CDN image URL'leri.

**Sorgulanmayan/discard edilen PII:** customer/customer ID, tam ad, e-posta, telefon, billing/shipping address, company/customer metadata, note/custom attributes, IP/browser bilgileri. GraphQL query bu alanları istemez; mapper raw fixture'a sonradan eklense bile saklamaz. AI Mentor'a raw order/customer/Shopify payload gitmez; yalnız ortak aggregate text gider.

**Credential:** app-level OAuth client secret env'de; shop-level offline Admin access token AES-256-GCM encryptedAccessToken'da. Frontend'e yalnız `hasStoredCredentials` boolean döner.

**Shopify Payments/payout:** bu fazda çekilmiyor. Payment fee/platform komisyonu ve payout/settlement null/capability false.

**Yurt dışı aktarım bakımından teknik değişiklik:** LocalKarar artık merchant onayıyla Shopify Admin API'ye bağlanır ve yukarıdaki minimize ticari veriyi Shopify'dan LocalKarar'a aktarır. Shopify'ın gerçek veri yerleşimi/alt işleyenleri koddan varsayılmamıştır; ülke/bölge ve hukuki aktarım değerlendirmesi final toplu legal audit'te sözleşme/DPA/mağaza konfigürasyonu ile yapılmalıdır. Privacy/KVKK/Terms bu görevde değiştirilmemiştir.

## 7) Webhook hazırlığı

Resmî [WebhookSubscriptionTopic](https://shopify.dev/docs/api/admin-graphql/2026-07/enums/WebhookSubscriptionTopic) içinde `ORDERS_CREATE`, `ORDERS_UPDATED`, `ORDERS_CANCELLED`, `ORDERS_FULFILLED`, `PRODUCTS_UPDATE`, `INVENTORY_LEVELS_UPDATE`, `REFUNDS_CREATE` ve return topic'leri mevcuttur. MVP production'da webhook açmaz; ortak worker/pull mimarisi devam eder. Gelecek webhook fazı payload'ı doğrudan DB'ye yazmamalı, yalnız ilgili shop için aynı adapter/sync pipeline'ını tetiklemeli ve Shopify HMAC doğrulamalıdır.

## 8) UI / aggregate / isolation

- Ayarlar → Entegrasyonlar: Shopify aktif kart + OAuth domain modalı + connected/sync/disconnect durumları. Sayfa açılışında Shopify dış çağrısı **0**; catalog/status yalnız LocalKarar backend/DB'dir.
- Ortak Siparişler/Ürünler provider filtresi artık Tümü / Trendyol / Hepsiburada / N11 / Shopify. Yeni Shopify ekranı yok.
- Dashboard/Genel Bakış/operations/action engine provider-bağımsız DB aggregate'i otomatik kullanır. `providers[]` SHOPIFY içerir; aynı 7 action type/deep-link yapısı korunur.
- Provider-scoped unique kimlik `(workspaceId, provider, externalId)` korunur; `SKU-SHARED` dört ayrı MarketplaceProduct satırıdır. `CanonicalBusinessProduct + MarketplaceProductLink` gelecek fazdır.
- Sync yalnız provider-owned alanları günceller; LocalKarar note/tags/favorite/threshold Shopify tekrar-sync'te korunur.
- Disconnect yalnız Shopify connection/token satırını siler; diğer üç connection ve tarihsel Shopify order/product kayıtları korunur.
- Core'da provider branch eklenmedi. Operasyon düşük stok sayımında bulunan genel tutarsızlık provider-bağımsız biçimde düzeltildi: yalnız aktif ürünler sayılır (ürün overview ile aynı semantik).

## 9) Mock / test kapsamı

`tests/integrations/fixtures/shopify-fixtures.ts`: 20 raw ProductVariant (images, iki location inventory, fiyat/compare-at) + 40 raw Order (created/processing/shipped/delivered/cancelled/full refund/partial refund). Akış raw Shopify shape → gerçek ShopifyMapper → ortak sync/repository/analytics/operations/mentor pipeline → DB; production hiçbir test fixture'ı import etmez.

Unit: OAuth state/HMAC/scopes/domain; token header/redaction; 401/403; GraphQL error; malformed JSON/envelope; HTTP 429/5xx retry sınırı; GraphQL THROTTLED/cost budget; timeout; cursor pagination; order lifecycle/financial/PII; variant identity/image/inventory/multi-location mapping.

Four-provider E2E: 4 ACTIVE IntegrationConnection; dört provider import; provider-safe product identity; duplicate sync 0; order/product provider filters; local settings isolation; operations/action aggregate; mentor aggregate + PII 0; workspace isolation; Shopify status secret leakage 0; disconnect only Shopify.

## 10) Nihai doğrulama (25.08.2026)

- Backend full vitest: **133 dosya / 1977 test PASS**
- Frontend full vitest: **51 dosya / 370 test PASS**
- Shopify + ortak sync hedefli set: **5 dosya / 67 test PASS**
- Backend TypeScript (`tsc`): **PASS**
- Frontend production build (`vite build`): **PASS** (mevcut chunk/dynamic-import uyarıları dışında hata yok)
- Migration validation: **PASS** — 34 migration temiz şemaya uygulanıp Prisma schema doğrulandı; Shopify enum'u başlangıç marketplace migration'ında zaten bulunduğu için gereksiz yeni migration yazılmadı
- Secret scan: **PASS** — Shopify token/header/secret için yeni bulgu yok; tarayıcı deponun önceden var olan doküman/fixture false-positive uyarılarını listelemeye devam ediyor
- Git commit/push: **YAPILMADI**

## FİNAL SONUÇLAR

- **Shopify adapter: READY**
- **Auth model: OAUTH**
- **Orders: READY**
- **Products/Variants: READY**
- **Inventory: READY** (tam location sum; truncated durumda Shopify aggregate fallback)
- **Product images: SUPPORTED**
- **Financial fields: PARTIAL** (discount/tax/shipping/refund var; Shopify Payments fee/payout/settlement bu fazda yok)
- **Four-provider aggregate: PASS**
- **Core provider-specific branch introduced: NO**
- **External API call on page load: 0**
- **Raw secret/error leakage: 0**
- **SHOPIFY INTEGRATION MVP READY: YES**
- **Git commit/push: YAPILMADI**
