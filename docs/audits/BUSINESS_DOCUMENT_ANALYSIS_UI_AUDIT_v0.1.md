# LocalAkademi İşletme Belgesi Analizi ve UI Denetimi v0.1

**Tarih:** 29 Temmuz 2026
**Kapsam:** Plan 2 — İşletme Belgesi Analizi
**Karar:** **CONDITIONAL GO — güvenli yükleme ve kayıt önerisi hazır; analitik ürün akışı henüz hazır değil**

## Executive Summary

- **Güvenli dosya alımında güçlü bir temel vardır.** Kimlik doğrulama, 10 MB limit, kullanıcı başına kota, MIME/uzantı/içerik kontrolü, DOCX ZIP koruması, PDF/görsel doğrulama, Türkçe OCR, güvenli rastgele depolama adı ve kullanıcı sahipliği testleri mevcuttur.
- **Mevcut özellik “belge analizi” değil, metin çıkarımı ve işletme kaydı önerisidir.** Sistem metni çıkarır, kelime/sayı/anahtar kelime özeti üretir ve tutar/tarih/tür yakalayarak ödeme, senet, alım veya kargo takip kaydı önerir. KPI, tablo normalizasyonu, grafik, taşıyıcı karşılaştırması ve deterministik iş analizi yoktur.
- **Kullanıcı onayı yalnızca önerilen takip kaydı için vardır.** Çıkarılan hücreleri/alanları düzenleyebileceği bir doğrulama tablosu ve “onaylanmış veri seti” bulunmadığından Plan 2'nin nihai analiz öncesi onay şartı karşılanmaz.
- **UI görünür fakat dar kapsamlıdır.** Workspace içindeki “Belgeler” sekmesi yükleme, metin önizleme, arşiv ve öneri kabul/red işlemlerini sunar. Ana işletme panelinde analiz kartı, Mentor dosya eki, geçmiş analizler, sonuç/KPI ekranı ve dışa aktarma yoktur.

## 1. İncelenen kanıtlar

| Alan | Kanıt |
|---|---|
| Dosya upload/extraction | `src/services/documents.ts` |
| Dosya güvenliği | `src/services/documentSecurity.ts` |
| Kayıt önerisi | `src/services/document-suggestions.ts` |
| Workspace belge API'si | `src/services/business-tracker.ts` |
| Veri modeli | `prisma/schema.prisma` — `UploadedDocument`, `DocumentConversation`, `DocumentSuggestion`, `BusinessRecordDocument` |
| Workspace UI | `frontend/src/pages/Workspaces/Documents.jsx` |
| Route/sekme | `frontend/src/router/index.jsx`, `frontend/src/pages/Workspaces/WorkspaceLayout.jsx` |
| API istemcisi | `frontend/src/services/api.js` |
| Mentor | `src/services/mentor.ts`, `frontend/src/pages/MentorPage.jsx` |
| Testler | `tests/documents.test.ts`, `tests/business-tracker.test.ts`, `tests/security.test.ts`, `tests/e2e/e2e.test.ts` |

## 2. Mevcut kullanıcı akışı

Bugün çalışan akış:

`Workspace → Belgeler → kategori seç → dosya yükle → metin/OCR çıkar → metni önizle → varsa takip kaydı önerisini kabul veya reddet → kabul edilirse BusinessRecord oluştur`

Planın hedef akışıyla fark:

`yükle → tür algıla → yapılandırılmış veri önizle/düzelt → kullanıcı onayı → analiz çalıştır → KPI/grafik/risk/öneri → görev → Mentor → geçmiş/dışa aktar`

İkinci akışın yalnız yükleme, metin çıkarımı ve sınırlı kayıt önerisi bölümleri mevcuttur.

## 3. Backend ve güvenlik durumu

### 3.1 Hazır kabiliyetler

- `POST /documents/upload`
  - authentication;
  - saatlik 10 istek rate limit;
  - 10 MB dosya limiti;
  - varsayılan 100 MB kullanıcı kotası;
  - uzantı, MIME ve magic-byte kontrolü;
  - TXT, MD, CSV, JSON, DOCX, PDF, PNG, JPG/JPEG;
  - DOCX ZIP bombası/yapı kontrolü;
  - PDF sayfa ve görsel piksel sınırı;
  - PDF metin çıkarımı, boşsa ilk 5 sayfada Türkçe OCR;
  - görsel OCR;
  - 100.000 karakter extracted-text sınırı;
  - UUID tabanlı stored filename;
  - başarısız DB yazımında dosya temizliği.
- Kullanıcı bazlı liste, detay, silme ve belgeye yerel extractive soru sorma endpoint'leri.
- Workspace belge listeleme, metadata güncelleme, öneri listeleme, kabul/red ve arşiv endpoint'leri.
- Workspace erişim kontrolü ve öneri kabulünde farklı tenant erişimini reddeden test.
- Kabul edilmeden `BusinessRecord` oluşturmayan transaction akışı.

### 3.2 Desteklenmeyen veya eksik alanlar

| Gereksinim | Durum |
|---|---|
| XLSX | Yok |
| Yapılandırılmış CSV/XLSX kolon eşleme | Yok |
| Alan/hücre bazlı doğrulama ekranı | Yok |
| Onaylanmış veri snapshot'ı | Yok |
| Kargo/satış/maliyet analiz motoru | Yok |
| KPI ve grafik veri seti | Yok |
| Yeniden analiz ve analiz sürümü | Yok |
| Rapor dışa aktarma | Yok |
| Mentor'a doğrulanmış analiz bağlamı | Yok |
| Analizden genel görev üretimi | Kısmi; yalnız takip kaydı önerisi |
| Malware/antivirus taraması | Not verified |
| Object storage şifreleme/retention | Yok; yerel `uploads/` kullanılıyor |

`analyzeText()` yalnız özetin ilk 300 karakterini, kelime sayısını, sayı regex eşleşmelerini, anahtar kelimeleri ve dört basit kategoriden birini üretir. Bu sonuç finansal veya operasyonel analiz değildir.

`buildDocumentSuggestion()` belge adı/metnindeki anahtar kelime, ilk uygun tutar ve tarihi kullanır. Güven skoru heuristiktir; çok satırlı rapor, para birimi çeşitliliği veya tablo toplamı için uygun değildir.

### 3.3 Sahiplik ve tenant izolasyonu

- Kişisel `/documents` endpoint'leri `userId` ile filtrelenir.
- Workspace endpoint'leri workspace üyeliğini kontrol eder.
- Belge workspace'e bağlanırken ve öneri kabulünde workspace eşleşmesi doğrulanır.
- Farklı workspace önerisini kabul etme testi `404` bekler.

Risk:

- Upload önce kişisel belge oluşturup sonra ikinci istekle workspace'e bağlanıyor. İki adım arasında “workspace'siz belge” kalabilir.
- `UploadedDocument.workspaceId` nullable'dır; hedef ürün akışında kaynak/sahiplik bağlamı tek transaction veya finalize adımıyla kesinleştirilmelidir.
- Belgenin Mentor bağlamına aktarımı uygulanmadığı için çapraz tenant AI sızıntı kontrolü henüz ürün akışında test edilemez.

## 4. Frontend durumu

### Bulunan ekranlar

- `/app/workspaces/:workspaceId/documents`
- Workspace iç navigasyonunda `Belgeler`
- Belge kategori seçimi ve gizli file input
- Metin/OCR önizleme modalı
- Takip kaydı önerisi, güven oranı, kabul/red
- Arşivleme

### Eksikler

- Workspace overview/dashboard üzerinde görünür “İşletme Belgesi Analizi” kartı.
- Ayrı ve yönlendirmeli upload sihirbazı.
- Desteklenen format, 10 MB, kota, gizlilik/veri kullanımı metninin tam gösterimi.
- Yükleme yüzde ilerlemesi ve extraction adım durumu.
- Yapılandırılmış satır/kolon önizleme ve kullanıcı düzeltmesi.
- Analiz türü seçimi.
- KPI kartları, grafikler, risk/tespit/öneri ekranı.
- Geçmiş analiz ve sürüm karşılaştırması.
- Yeniden analiz, export, Mentor'a sor, göreve çevir.
- Mentor mesaj kutusunda dosya ekleme.

Belge kutusunun ana panelde görünmemesinin nedeni feature flag değil; `WorkspaceOverview` içine böyle bir kart eklenmemiş olmasıdır. Özellik yalnız workspace alt sekmesinde bağlanmıştır.

Kullanılmayan bir kapsamlı analiz component'i bulunamadı. **Feature flag: Not verified / kanıt bulunamadı.**

## 5. Hedef veri modeli

Mevcut `UploadedDocument` korunmalı; aşağıdaki katmanlar eklenmelidir:

1. `DocumentProcessingRun`
   - document, parser version, status, started/completed, error, checksum.
2. `DocumentDataset`
   - document, inferred type, schema version, raw/normalized payload, unit/currency.
3. `DocumentField`
   - field key/label, raw value, normalized value, confidence, source page/cell, validation status.
4. `DocumentVerification`
   - dataset version, verifier user, corrections, verified snapshot hash, time.
5. `DocumentAnalysis`
   - analysis type/version, verified dataset reference, status, summary, KPI JSON, findings, risks, recommendations.
6. `DocumentAnalysisTaskLink`
   - analysis/findings ile `BusinessRecord` veya ayrı eylem görevi ilişkisi.
7. `DocumentAnalysisExport`
   - format, storage key, generated time.

Ham belge, çıkarılan veri, kullanıcı tarafından doğrulanmış veri ve analiz sonucu birbirinden ayrılmalıdır. `UploadedDocument.analysis` içindeki serbest JSON tek başına denetlenebilirlik için yeterli değildir.

## 6. Hedef backend

- Upload'ı workspace bağlamında tek istek/transaction ile başlat.
- Parser registry: CSV, XLSX, PDF/DOCX/OCR; dosya türünden ayrı iş belgesi türü sınıflandırması.
- Kargo pilotu için kanonik kolon eşleme ve kullanıcı düzeltme API'si.
- Doğrulanmamış dataset üzerinde final analiz başlatmayı `409` ile engelle.
- Hesaplamaları sürümlü deterministik fonksiyonlarla üret; LLM yalnız açıklama/öneri katmanında olsun.
- Her KPI için formül, birim, pay/payda, filtre ve kaynak satır/cell provenance sakla.
- Analysis sonuçlarını idempotent job olarak çalıştır; retry ve hata durumu ekle.
- Mentor'a yalnız `verified snapshot + analysis summary + selected KPI + accepted tasks` geçir.
- Retention, hard delete, export ve audit log politikası ekle.
- Malware scanner adapter ve karantina durumu ekle.

## 7. Hedef frontend

1. Workspace overview kartı: “Belge Yükle” ve “Geçmiş Analizler”.
2. Upload sihirbazı: kapsam, format/limit, gizlilik, dosya ve belge türü.
3. İşleme durumu: upload, extraction, mapping, review.
4. Doğrulama tablosu: ham değer, normalize değer, güven, kaynak konumu, düzelt.
5. Analiz seçimi ve açık kullanıcı onayı.
6. Sonuç: KPI kartları, en fazla 3–5 karar grafiği, bulgular, riskler ve öneriler.
7. Her öneride “Görev oluştur”; sonuçta “AI Mentor'a sor”.
8. Geçmiş, yeniden analiz, sürüm, export, arşiv/sil.
9. Mentor composer içinde dosya ekleme; aynı workspace history'ye kaydetme.

## 8. İlk pilot: kargo raporu

P0 pilot yalnız CSV/XLSX kargo raporuyla sınırlandırılmalıdır.

Zorunlu kanonik alanlar:

- gönderi tarihi/id;
- taşıyıcı;
- ücret ve para birimi;
- teslim tarihi/durumu;
- iade/hasar/teslim edilememe;
- şehir/bölge;
- desi/ağırlık.

Deterministik KPI'lar:

- toplam gönderi ve maliyet;
- gönderi başına maliyet;
- ortalama/medyan teslim süresi;
- gecikme, iade, hasar ve teslim edilememe oranı;
- taşıyıcı ve bölge kırılımı.

Kullanıcı kolon eşlemesini ve kritik sayıları onaylamadan final analiz üretilemez.

## 9. Test planı

### Otomatik

- XLSX/CSV parser fixture'ları; TR sayı/tarih/para birimi.
- MIME, extension, magic byte, size, quota, ZIP bomb, PDF page, image pixel ve malware result.
- Workspace upload atomicity ve orphan belge temizliği.
- IDOR/tenant izolasyonu; Mentor context izolasyonu.
- Extraction → mapping → correction → verification → analysis state machine.
- Doğrulanmamış dataset için analysis reddi.
- Her KPI için golden fixture ve toplam mutabakatı.
- Idempotent retry, versioning, delete/retention ve export.
- React upload, mapping grid, validation errors, result ve history testleri.
- E2E: yükle → düzelt → onayla → analiz → görev → Mentor.

### Manuel

- Gerçek dünyadan anonimleştirilmiş en az beş farklı kargo şablonu.
- Büyük dosya/düşük bağlantı.
- Mobil tablo düzenleme.
- Yanlış tarih/para birimi ve eksik kolon kullanılabilirliği.
- Gizlilik metni ve silme beklentisi kullanıcı testi.

### Mevcut test kanıtı

- `documents`, `business-tracker`, `video-progress`: 50/50 PASS.
- Business tracker testi önerinin açık kabulden önce kayıt oluşturmadığını doğruluyor.
- Security testleri kullanıcılar arası belge erişimini reddediyor.
- Workspace Documents için bağımsız frontend component testi **Not verified**.

## 10. Rollout

1. Veri sözleşmesi ve tehdit modelini onayla.
2. Kargo CSV/XLSX parser + doğrulama ekranını feature flag altında kur.
3. İç ekipte sentetik/anonim fixture'larla çalıştır.
4. 5–10 pilot işletmede yalnız okunur analiz; görev otomasyonu kapalı.
5. KPI mutabakatı ve kullanıcı düzeltme oranını ölç.
6. Görev ve Mentor aktarımını aç.
7. Satış, maliyet ve stok analizlerini ayrı parser/metric paketleri olarak ekle.
8. Retention, export ve hard-delete operasyonlarını üretim öncesi doğrula.

## 11. Backlog

### P0

- Belge veri yaşam döngüsü ve doğrulanmış snapshot modeli.
- Workspace-atomic upload.
- XLSX ve yapılandırılmış CSV parser.
- Kargo pilotu mapping/verification UI.
- Deterministik KPI motoru ve sonuç ekranı.
- Tenant isolation/threat model ve malware adapter.

### P1

- Workspace overview kartı ve geçmiş analizler.
- Analizden görev üretimi.
- Mentor'a doğrulanmış bağlam aktarımı.
- Export, re-analysis ve sürüm geçmişi.

### P2

- Satış, maliyet, stok ve pazarlama paketleri.
- Gelişmiş grafik ve karşılaştırmalar.
- Asenkron job/notification ve büyük dosya deneyimi.

### P3

- Şablon öğrenme ve kullanıcıya özel kolon eşleme.
- Çoklu belge birleştirme ve dönem karşılaştırması.
- Organizasyon politikaları ve gelişmiş DLP.

## 12. Riskler, kararlar ve Not verified

- Yerel `uploads/` prototip için uygundur; çok instance/backup/retention için üretim kararı değildir.
- Malware motoru ve karantina süreci **Not verified**.
- Disk-at-rest şifreleme ve anahtar yönetimi **Not verified**.
- KVKK saklama/silme süreleri ve hukuki metin onayı **Not verified**.
- XLSX kütüphanesi mevcut dependency listesinde yoktur.
- Finansal/hukuki öneriler için insan onayı ve açık sınırlama metni gerekir.

## 13. Bağımlılık sırası

`Tehdit modeli → veri/snapshot modeli → workspace-atomic upload → XLSX/CSV parser → mapping/doğrulama UI → deterministik analiz → sonuç ekranı → görev → Mentor → geçmiş/export → yeni analiz paketleri`
