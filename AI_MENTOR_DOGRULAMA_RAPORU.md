# LocalAkademi AI Mentor — Son Doğrulama Raporu

Tarih: 19.07.2026  
Ortam: Windows, Intel i5-9400F, 16 GB RAM, CPU tabanlı yerel model

## Sonuç

AI Mentor tarayıcıdan backend'e, backend'den yerel Ollama modeline kadar uçtan uca çalışıyor. Birincil sağlayıcı Ollama, yedek sağlayıcı NVIDIA olarak ayarlandı. Sohbetler SQLite veritabanında kalıcı tutuluyor.

## Yapılan değişiklikler

### Yerel AI ve sağlayıcı geçişi

- `src/services/conversation.ts`
  - `ollama` ve `auto` sağlayıcı modları eklendi.
  - `AI_PROVIDER=auto` sırası: Ollama, ardından anahtarı bulunan NVIDIA/DeepSeek/OpenAI.
  - Ollama adresi: `http://127.0.0.1:11434/v1/chat/completions`.
  - Yerel model: `qwen3:4b-instruct`.
  - Ollama erişilemezse bulut sağlayıcısına otomatik geçiş eklendi.
  - Dönen API cevabına `provider` ve `model` alanları eklendi.
  - Yerel timeout 120 saniye, çıktı sınırı 260 token yapıldı.
  - Ollama sıcaklığı 0.35'e düşürüldü.
  - Bağlam 8 mesajdan 6 mesaja indirildi.
  - Bozuk karakter dizileri içeren geçmiş mesajların AI bağlamına girmemesi sağlandı.
  - Sistem promptu KOBİ, esnaf ve girişimci odaklı iş mentoruna dönüştürüldü.
  - Yanıtlar en fazla 140 kelime, uygulanabilir 3 adım ve ölçüt hedefleyecek şekilde sınırlandı.
  - `öneri ver`, `fikir ver`, `yardım et`, `ne yapayım` gibi belirsiz mesajlar için model çağrısından önce açıklama isteyen deterministik koruma eklendi.

### Frontend Mentor ekranı

- `frontend/src/pages/MentorPage.jsx`
  - Senkron `useRef` gönderim kilidi korunarak çift gönderim engellendi.
  - Kullanıcı mesajı AI cevabını beklemeden ekranda gösteriliyor.
  - `Yerel AI düşünüyor…` ve tahmini süre göstergesi eklendi.
  - Gönderim başarısızsa mesaj giriş alanına geri getiriliyor.
  - Gerçek API hata mesajı görünür hale getirildi.
  - Sohbet listesi/mesajlar başarıyla yüklenince eski hata bildirimi temizleniyor.
  - Sohbet değiştirirken ve yeni sohbet açarken hata state'i temizleniyor.

### Tarayıcı proxy düzeltmesi

- `frontend/vite.config.js`
  - Eksik `/conversations` → `http://localhost:3000` proxy kuralı eklendi.
  - Önceki `Mesaj gönderilemedi` hatasının ana bağlantı nedeni buydu.

### Yapılandırma ve kurulum

- `.env` ve `.env.example`
  - `AI_PROVIDER=auto`
  - `OLLAMA_MODEL=qwen3:4b-instruct`
  - `OLLAMA_TIMEOUT=120000`
  - `OLLAMA_MAX_TOKENS=260`
- `yerel-ai-kur.bat`
  - Ollama indirme sayfasını açan ve modeli çeken çift tıklanabilir kurulum yardımcısı eklendi.
- Ollama kuruldu ve `qwen3:4b-instruct` (2.5 GB, Q4_K_M) indirildi.

## Veri onarımları

- Conversation 3 başlığı: `Sistem Tan? Testi` → `Sistem Tanı Testi`.
- Message 3: `Yaln?zca test ba?ar?l? yaz.` → `Yalnızca test başarılı yaz.`.
- Message 5: bozuk Türkçe içerik doğru Türkçe metinle değiştirildi.
- Yanlış bağlamla oluşturulmuş message 8 ve 9 kaldırıldı.
- Başarısız/geçici belirsiz-soru test sohbetleri 6 ve 7 kaldırıldı.
- Son taramada bozuk başlık sayısı: 0.
- Son taramada bozuk mesaj sayısı: 0.

## Test sonuçları

1. Backend TypeScript: `npm.cmd run build` — başarılı.
2. Frontend Vite: `npm.cmd run build` — başarılı, 1867 modül dönüştürüldü.
3. Ollama doğrudan Türkçe test: `Yerel AI hazır.` — başarılı.
4. Tarayıcı proxy testi: `/auth`, `/conversations`, `/conversations/:id/chat` — başarılı.
5. Gerçek iş sorusu testi:
   - Sağlayıcı: `ollama`
   - Model: `qwen3:4b-instruct`
   - Süre: 38.3 saniye
   - Önceki ölçümler: 51–64 saniye
6. Belirsiz mesaj testi (`öneri ver`):
   - Süre: 0.02 saniye
   - Sağlayıcı: `system`
   - Model: `clarification-rule`
   - Sonuç: kullanıcıdan konu açıklaması istendi, konu uydurulmadı.
7. Test için açılan son geçici sohbet testten sonra silindi.

## Bilinen sınır

`qwen3:4b-instruct`, ekran kartı olmayan i5-9400F sistemde tamamen CPU ile çalıştığı için ayrıntılı yanıtlar yaklaşık 30–45 saniye sürebilir. 4B modelin dil ve iş danışmanlığı kalitesi büyük bulut modellerinden düşüktür. NVIDIA otomatik yedeği bağlantı/servis hatalarında devreye girer; kaliteye göre otomatik geçiş yapılmamaktadır.

## DeepSeek için doğrulama maddeleri

1. `getAiConfigs()` içindeki `auto` sırasını ve API anahtarlarının sızdırılmadığını kontrol et.
2. `callAiProviderWithRetry()` fallback davranışını ve son hata aktarımını kontrol et.
3. `needsClarification()` kuralının yalnızca açıkça belirsiz kısa mesajları yakaladığını kontrol et.
4. Bozuk geçmiş filtresinin normal soru işaretli Türkçe cümleleri yanlışlıkla elemediğini kontrol et.
5. `MentorPage.jsx` optimistic mesaj ile `loadMessages()` sonrasındaki kalıcı kayıt senkronizasyonunu kontrol et.
6. `vite.config.js` içindeki `/conversations` proxy kuralını doğrula.
7. 429/5xx retry sayısının en fazla 1 ek çağrı olduğunu doğrula.
