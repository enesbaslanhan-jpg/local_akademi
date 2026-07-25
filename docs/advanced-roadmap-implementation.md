# Gelişmiş Yol Haritası Uygulama Durumu

## Tamamlanan altyapı

0. Yerel AI Mentor
   - Ana gateway doğrudan `AI_PROVIDER=ollama` kabul eder.
   - Normal ve streaming sohbet akışları API anahtarı olmadan çalışır.
   - `auto` modunda yapılandırılmış yerel Ollama bulut sağlayıcılarından önce gelir.
   - Ollama adresi güvenlik amacıyla loopback ile sınırlandırılmıştır.
1. AI Reviewer shadow pilot
   - İçeriksiz kalıcı telemetri.
   - Bounded kuyruk ve Ollama sağlık kontrolü.
   - 25/50/100/200 checkpoint ilerlemesi.
   - Otomatik rollout yapmayan acceptance raporu.
2. Disclaimer-only hazırlığı
   - Ayrı insan-onayı bayrağı.
   - Streaming/non-streaming eş davranış.
   - Reviewer iç nedenlerini kullanıcıya sızdırmayan sabit uyarılar.
   - Varsayılan mod hâlâ shadow.
3. Semantic RAG
   - Loopback-only Ollama embedding provider.
   - Güvenli vektör parse/cosine.
   - Lexical + semantic reciprocal-rank fusion.
   - Embedding hatasında lexical fallback.
   - Published ve `isDemo=false` güvenlik filtresi.
   - Dry-run varsayılanlı indeksleme aracı.
4. AI quiz üretimi
   - Katı JSON/Zod sözleşmesi.
   - Tek doğru seçenek ve benzersiz seçenek doğrulaması.
   - Admin-only, feature-flag ve draft-only üretim.
   - Ayrı admin publish adımı.
   - Öğrenci endpoint'inde draft filtresi.
5. Güncellemeler ve paylaşım
   - Kaynak bağlantılı resmî kısa özet.
   - Moderasyon bekleyen kullanıcı paylaşımı.
   - Admin moderation kuyruğu.
   - Yerel AI ile draft-only resmî özet.
   - Kaynak metnini saklamama.
   - Frontend gezinme ve mobil uyumlu akış.
6. Altı aşamalı kapalı beta kabulü
   - Sır/arşiv taraması ve geçici kopyada SQLite restore tatbikatı.
   - 50 Türkçe sorguda yüzde 90 lexical ve hybrid Hit@3; tam kod Hit@1 yüzde 100.
   - Yayın sonrası otomatik embedding kuyruğu.
   - Üç farklı alanda 9 soruluk, kalite skoru 1.00, draft-only AI quiz pilotu.
   - Beş resmî kaynağa bağlı topluluk taslağı ve kullanıcı raporlama zinciri.
   - İçerik saklamayan reviewer insan denetimi kayıtları ve rollout kapısı.
   - Ortak yerel AI üretim kuyruğu, doğrulanmış otomatik yedek ve log bakımı.

## Bilinçli olarak kapalı kalan rollout'lar

- Reviewer `disclaimer_only`, 200 gerçek shadow sonucu ve insan denetimi
  tamamlanmadan açılmaz.
- AI quiz generator admin tarafından açıkça etkinleştirilmeden çağrı yapmaz.
- Resmî özetleyici admin tarafından açıkça etkinleştirilmeden çağrı yapmaz.
- Topluluk gönderileri hiçbir koşulda moderasyonsuz yayımlanmaz.
- Dış sağlayıcı anahtarı panelde döndürülüp tarih kaydı eklenmeden üretim hazır
  raporu verilmez.

Bu kapalı durumlar eksik uygulama değil, üretim güvenlik kapılarıdır.
