# İddia–gerçek denetimi (Faz 0.3)

**Tarih:** 10.09.2026
**Neden:** Karar günlüğü aylarca yazılıp okunamadı. Aynı sınıftan başka arıza
var mı diye tek tek bakmak yerine desen mekanik olarak arandı: *yazılan ama
hiç okunmayan veri.*

Yöntem: Prisma şemasındaki her model için kodda yazma (`create/update/upsert`)
ve okuma (`findMany/findUnique/...`) çağrıları tarandı; ayrıca **şemadan
okunan gerçek ilişki adlarıyla** `include`/`select` üzerinden okunma kontrol
edildi.

> ⚠️ İlk tarama ilişki adını modelden TAHMİN ediyordu (`modelAssumption`) ama
> şemadaki alan çoğuldu (`modelAssumptions`) ve **yedi model yanlışlıkla**
> "okunmuyor" göründü. Tahmini şemayla değiştirince liste üçe indi. Bu not,
> aynı hatanın tekrarlanmaması için duruyor.

---

## 1. Yazılıyor ama hiç okunmuyor

| Model | Üretimde satır | Kullanıcıya yansıması |
|---|---|---|
| `DocumentConversation` | 0 | Belgeye sorulan soru ve cevabı kaydediliyor, **geri okunamıyor**. Cevap o an ekranda görünüyor; geçmiş kayboluyor. AI Mentor'da sohbet geçmişi VAR — belge sohbetinde yok. Tutarsız. |
| `GeneratedReport` | **4** | Dışa aktarma kaydı yazılıyor, hiçbir yerde listelenmiyor. "Aldığım raporlar" diye bir ekran yok. `storedName` tutuluyor; dosyaların akıbeti ayrıca bakılmalı. |
| `PracticalCardFeedback` | — | Alıştırma kartı geri bildirimi. Özellik zaten bayrakla kapalı; **öncelik yok.** |

**Karar önerisi:** üçü için de asıl soru "okuma tarafını yaz" değil, *"bu veri
gerçekten lazım mı"*. Lazım değilse yazmayı durdurmak, okuma ekranı yazmaktan
ucuz ve dürüst. Bu karar Faz 0.5'e ait.

---

## 2. Üretimde hiç denenmemiş özellikler

Şema ve kod var, gerçek veri **yok**:

| Özellik | Üretimde |
|---|---|
| Belge yükleme ve analizi | **0 belge** |
| Belgeden kayıt önerisi | 0 (belge olmadan çalışamaz) |
| e-Fatura akışı | 0 |
| Belge sohbeti | 0 |
| Toplu içe aktarma | **0 iş** |

🔴 Bunlar ürünün en çok anlatılan yüzeyleri ve **hiçbiri gerçek veriyle
çalıştırılmadı.** Testler geçiyor olabilir; gerçek bir e-Fatura XML'i, gerçek
bir taranmış PDF ya da gerçek bir Excel dosyası hiç girmedi.

⚠️ Faz 0.2'de gerçek kullanıcı gelmeden önce **bu üçü en az bir kez gerçek
dosyayla denenmeli.** Kullanıcının ilk belgesini yüklediği an patlarsa, o
kullanıcı geri gelmez.

---

## 3. Gerçekten kullanılan

| Özellik | Üretimde |
|---|---|
| Karar oturumu | **8** |
| Hatırlatma | 8 |
| Model çalışması | 2 |
| Bildirim | 2 |
| İşletme kaydı | 1 |

En çok kullanılan yüzey **karar araçları**. Kullanıcı sayısı 4 (hepsi ekip)
olduğu için bu istatistiksel bir bulgu değil — ama ekibin kendi ürününde bile
en çok dokunduğu yerin karar araçları olması, Faz 0.5'teki "hangi yüzey
kalsın" tartışmasına girdi olur.

---

## 4. Yanlış alarm çıkanlar (kayda geçsin)

Şu modeller yazma taramasında şüpheli göründü ama `include` üzerinden
okunuyorlar; **arıza değil**: `BusinessRecordHistory`, `DecisionCheckAnswer`,
`ImportJobError`, `KnowledgeObjectSource`, `ModelAssumption`,
`FinancialModelVersion`, `KnowledgeObjectVersion`, `NewsSource`,
`Subscription`.

`ModelAssumption` özel bir not hak ediyor: veri **hem** tabloya **hem**
`FinancialModelRun.assumptions` JSON sütununa yazılıyor. İkisi de okunuyor,
yani kayıp yok — ama aynı gerçeğin iki kopyası var ve biri güncellenip diğeri
unutulabilir.

---

## Sırada

- [ ] Belge, e-Fatura ve içe aktarma akışları **gerçek dosyayla** denensin
- [ ] Pazaryeri entegrasyonunda canlı bağlantı var mı, eşitleme gerçekten
      çalışıyor mu (worker 120 dk'da bir koşuyor)
- [ ] AI Mentor cevap kalitesi ve maliyeti ölçülsün
- [ ] Faz 0.4 pazar taraması
