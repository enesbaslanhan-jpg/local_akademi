# PHASE 7 DEFERRED PROVIDER EVALUATION

## 1. Erteleme Nedeni
Phase 7.5B kapsamında yapılması planlanan Llama3.2:3b ve Qwen3:4b-instruct modelleri ile olan 42 soruluk yerel benchmark koşuları ile diğer bulut sağlayıcı (NVIDIA, OpenAI, DeepSeek vb.) değerlendirmeleri stratejik bir kararla **ertelenmiştir**. Mevcut AI Mentor mimarisi ve UX altyapısının Beta aşamasına geçişi önceliklendirilmiş olup, üretim (production) provider kararı Phase 8 başlangıcında veya öncesinde tamamlanmak üzere planlanmıştır.

## 2. Hazır Evaluation Altyapısı
Phase 7 süresince aşağıdaki ölçüm ve değerlendirme mekanizmaları başarıyla entegre edilmiştir:
- **Telemetry:** Mentor işlemlerinde tam metrik ve hata takibi (`AI_MENTOR_TELEMETRY_ENABLED`).
- **Resilience:** Otomatik `resume`, atomic JSON writes, `timeout` ve `retry` politikaları.
- **Fixture Desteği:** Deterministik, RAG-bound ve model-bound kategorileri ayrıştıran esnek test yapısı.

## 3. Çalıştırılacak Fixture
- **Dosya:** `tests/fixtures/mentor-phase7-5-eval-prompts.json`
- **Kapsam:** 42 Prompt
- **Kategoriler:** 16 benzersiz kategori (finance, platform_help, ecommerce, tax_legal vb.)

## 4. Yerel Modeller
- `llama3.2:3b`
- `qwen3:4b-instruct`
- *Embedding:* `nomic-embed-text:latest`

## 5. Bulut Providerlar
Değerlendirmeye alınması hedeflenen muhtemel bulut sistemleri:
- NVIDIA NIM API (Llama 3.1 70B/8B vb.)
- OpenAI (GPT-4o-mini vb.)
- DeepSeek (DeepSeek Chat vb.)

## 6. Gerekli Environment / Config
Bulut veya yerel ortam sağlayıcıları için CLI tabanlı env parametreleri:
- `AI_PROVIDER` (ollama, nvidia, openai vb.)
- `OLLAMA_MODEL` / `NVIDIA_MODEL` vs.
- Gerekli API Key tanımlamaları (Asla koda yazılmamalı, run-time env olmalı).

## 7. Benchmark Komut Planı
```powershell
$env:AI_PROVIDER="ollama"; $env:OLLAMA_MODEL="llama3.2:3b"; npx tsx scripts/benchmark-mentor.ts --fixture=tests/fixtures/mentor-phase7-5-eval-prompts.json --output=reports/phase7/eval/mentor-phase7-5-llama3.2-3b.json --prompt-timeout-ms=240000 --resume
```

## 8. Resume / Checkpoint Yaklaşımı
Benchmark yarıda kesilirse (`Ctrl+C` veya sistem hatası), JSON sonuçları atomik `tmp` dosyalarından orijinal dosyaya aktarılmış haldedir. `--resume` flag'i ile sadece tamamlanmamış ID'ler çalıştırılır. Mevcut sonuçların silinmemesi kritik önem taşır.

## 9. Human Evaluation Rubric
- **Dosya:** `reports/phase7/eval/human_evaluation_template.csv`
- **Metrikler:** Doğruluk (Correctness), Anlaşılırlık (Clarity), Türkçe Doğallığı, İş Uygulanabilirliği (Business Applicability), Kaynak Uyumu (Source Alignment), Harekete Geçirilebilirlik (Actionability) ve Halüsinasyon Riski. 

## 10. Kabul Kriterleri
- 42 prompt'un eksiksiz, 0 duplicate, 0 unknown ID olarak tamamlanması.
- Summary metriklerinde (Overall ve Provider-Bound) Success + Error + Timeout = 42 eşitliği.
- API anahtarlarının hata loglarına (raw leakage) veya stdout'a sızmaması.

## 11. Çalışma Yeniden Başladığında İlk Adım
1. Mevcut repository `codex/phase7-ai-redesign` dalını kontrol edin.
2. `npx tsx scripts/benchmark-mentor.ts` preflight testlerini doğrulayın.
3. Ollama (yerel test için) başlatın.
4. İlgili `AI_PROVIDER` için komutu çalıştırıp logları kaydedin.

## 12. Nihai Provider Kararı İçin Gereken Kanıtlar
- Yerel (CPU) latency ve Bulut API latency karşılaştırması.
- Token maliyetleri (Cloud provider pricing API'lerden alınacak verilerle).
- Timeout frekansı ve güvenlik (Safe fallback) başarı oranları.
- İnsan değerlendirmesinden (Human Evaluation) alınacak ağırlıklı kalite puanı ortalamaları.
- Citation ve Selected KO mantığının provider tarafından tutarlı olarak HTML citation bloklarına (`[1]`) çevrilebilmesi.
