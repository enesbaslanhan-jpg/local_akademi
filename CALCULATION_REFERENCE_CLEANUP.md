# Calculation Integration Cleanup

**Tarih:** 15 Ağustos 2026 · Phase B, canonical re-import, legacy mutation ve commit **yapılmadı.**

---

## Kök neden

Entegrasyon bölümü 38 derste **üç farklı adla** geçiyor. Ayrıştırıcım yalnız birini tanıyordu, 28 ders sızıyordu.

| Markdown başlığı | Ders | Önceki durum |
|---|---:|---|
| Hesaplamalar Entegrasyonu | 18 | gövdede kalıyordu |
| Karar Araçları Entegrasyonu | 10 | çıkarılıyordu |
| **Finans Merkez Entegrasyonu** | 10 | gövdede kalıyordu |

`Model Lab` ve `Finans Merkezi` hiçbir derste geçmiyor — kaynakta yok.

## Yapılan düzeltmeler

**Başlık ayrıştırma.** Dördü de (`Hesaplamalar` · `Karar Araçları` · `Finans Merkez*` · `Model Lab`) tek desende yakalanıyor ve gövdeden çıkarılıyor.

**Başlık artık içerikten üretiliyor**, markdown'dan kopyalanmıyor:

| İçerik | Gösterilen başlık |
|---|---|
| Yalnız hesaplama | `Hesaplamalar Entegrasyonu` |
| Karar aracı + hesaplama | `Hesaplamalar ve Karar Araçları Entegrasyonu` |
| Yalnız karar aracı | `Karar Araçları Entegrasyonu` |

Eski terminoloji kullanıcıya hiçbir yolla ulaşmıyor.

**Boş CTA bloğu kaldırıldı.** Önceden eşleşmeyen referans için etiket + rozet satırı basılıyordu; koyu modda rozet zemini `--surface-sunken` (`#0C1013`) olduğu için boş siyah blok gibi okunuyordu. Artık yalnız **açılabilir** hesaplamalar satır üretiyor. MISSING ve AMBIGUOUS hiçbir görsel blok basmıyor.

**Etiket yolu temizlendi.** `Nakit Yönetimi > Döviz Pozisyonu ve Kur Riski Analizi` → `Döviz Pozisyonu ve Kur Riski Analizi`.

**Derin bağlantı düzeltildi.** `?tool=` parametresi ham formül id'si (`birim_maliyet`) bekliyordu, Course Player ise katalog id'si (`unit-cost`) gönderiyordu — CTA doğru adrese gidip hesaplamayı açmıyordu. `ToolsPage` artık iki biçimi de kabul ediyor.

## 7 MISSING referansın audit'i

| # | İstenen referans | En yakın mevcut | Aynı kavram | Kod | Başlık | Aksiyon |
|---|---|---|---|---|---|---|
| 1 | Başabaş Noktası | Başa Baş Satış Adedi | **YES** | `break-even-quantity` | Başa Baş Satış Adedi | `MAP_EXISTING` ✅ uygulandı |
| 2 | Şirket Değerleme | Basitleştirilmiş WACC ve FCFF DCF | **YES** | `wacc-fcff-dcf` | WACC ve FCFF DCF | `MAP_EXISTING` ✅ uygulandı |
| 3 | Şirket Türü / Vergi Optimizasyon | DC-TAX-013 karar aracı | NO (hesaplama değil) | `DC-TAX-013` | Hangi şirket türü bana uygun? | `MOVE_TO_DECISION_TOOL` ✅ zaten karar CTA'sı var |
| 4 | Döviz / Kur Riski | — | NO | — | — | `ADD_CALCULATION` ⏸ backend gerekli |
| 5 | Finansal Projeksiyon ve Senaryo Analizi | — | NO | — | — | `MANUAL_REVIEW` |
| 6 | Tedarikçi Seçim Matrisi | — | NO | — | — | `REMOVE_INVALID_REFERENCE` |
| 7 | Finansal Sağlık Dashboard | — | NO | — | — | `REMOVE_INVALID_REFERENCE` |

### Döviz Pozisyonu ve Kur Riski (madde 4)

Hesaplamalar mimarisi bir `Formula` (basit mod) veya `FinancialModel` (detaylı mod) desteği ister. **İkisinde de karşılığı yok** — 19 formül ve 24 modelin hiçbiri kur/döviz riski hesaplamıyor. En yakın aday `Nakit Pozisyonu`, farklı bir kavram.

Karşılığı olmayan bir `calculationDefinition` eklemek tıklandığında hiçbir şey açmayan bir kart üretirdi. **Sahte route üretilmedi.** Gerçek çözüm: önce bir kur riski formülü/modeli tanımlanmalı (backend işi), sonra katalog girişi eklenir. Şu an bu ders için hesaplama kartı hiç gösterilmiyor; karar aracı CTA'sı çalışıyor.

Maddeler 6 ve 7 hesaplama değil: biri niteliksel bir seçim matrisi, diğeri bir gösterge paneli. Referansın içerikten çıkarılması gerekiyor — canonical içerik değişikliği olduğu için bu turda **yapılmadı**.

---

## Final

```
Old Finance Center headings remaining: 0
Old Model Lab headings remaining: 0

Empty CTA placeholders: 0
Calculation CTA FOUND: 31
Calculation CTA MISSING: 5
Calculation CTA AMBIGUOUS: 0

7 missing references:
MAP_EXISTING: 2
ADD_CALCULATION: 1
MOVE_TO_DECISION_TOOL: 1
REMOVE_INVALID_REFERENCE: 2
MANUAL_REVIEW: 1

CANON-032:
heading fixed: YES ("Karar Araçları Entegrasyonu")
empty block removed: YES
calculation CTA: NO (karşılığı yok — sahte kart basılmadı)
route: n/a

Frontend tests: 28 dosya / 170 test PASS
Build: SUCCESS
```

FOUND 29 → **31** (Başabaş Noktası + Şirket Değerleme eşlendi). MISSING 7 → **5**.

### Canlı doğrulama

**CANON-032** — `Finans Merkez` 0 · `Model Lab` 0 · boş blok 0 · düz metin CTA 0 · başlık `Karar Araçları Entegrasyonu` · karar CTA'sı çalışıyor.

**CANON-001** — başlık `Hesaplamalar ve Karar Araçları Entegrasyonu` · hesaplama satırı `Gerçek Birim Maliyet · Basit mod · Hesaplamayı Aç →` · tıklama `/app/tools?view=calculator&tool=unit-cost` adresine gidip hesaplamayı 6 girdiyle açıyor.

## Açık kalanlar

- **Kur riski hesaplaması** — formül/model tanımı gerekiyor (backend).
- **İki geçersiz referans** (Tedarikçi Seçim Matrisi, Finansal Sağlık Dashboard) canonical içerikten çıkarılmalı.
- **Finansal Projeksiyon** — Model Lab senaryo akışına mı bağlanacak, ürün kararı.
- Kaynak deep-link audit'i ayrı tur.
