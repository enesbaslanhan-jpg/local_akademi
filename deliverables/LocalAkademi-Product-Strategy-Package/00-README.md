# LocalAkademi Ürün Stratejisi Paketi

Bu paket LocalAkademi'nin kontrollü beta ve v1.0 ürünleşme kararları için hazırlanmıştır.

## Dosyalar

- `02-Product-Strategy.md` — düzenlenebilir ana strateji metni.
- `02-Product-Strategy.docx` — profesyonel Word sürümü.
- `03-OpenCode-Integration-Compatibility-Audit-Instructions.md` — OpenCode'a tek parça halinde verilecek entegrasyon ve uyumluluk denetimi talimatı.
- `SHA256SUMS.txt` — paket içindeki ana teslimatların bütünlük özetleri.

## Önemli güvenlik notu

Proje denetiminde `opencode.json` içinde düz metin sağlayıcı anahtarı tespit edilmiştir. Anahtar bu pakete alınmamıştır. İlgili anahtar sağlayıcı tarafında iptal edilip yenilenmeli ve yalnızca ortam değişkeninden okunmalıdır.

## Önerilen kullanım sırası

1. Ürün ekibi `02-Product-Strategy` belgesindeki bağlayıcı kararları onaylar.
2. Açık anahtar iptal edilir ve yenilenir.
3. OpenCode'a denetim talimatı eksiksiz gönderilir.
4. Denetim sonucuna göre P0/P1 düzeltmeleri uygulanır.
5. Kontrollü beta GO/NO-GO kararı verilir.

