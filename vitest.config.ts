import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    globals: true,
    environment: 'node',
    setupFiles: [],
    env: {
      /*
       * `connection_limit` DÜŞÜK tutuluyor — bir önceki denemede yükseltmek
       * sorunu ÇÖZMEK yerine derinleştirdi.
       *
       * Sebep: 37 test dosyasının her biri kendi `PrismaClient`'ını açıyor
       * ve bu sınır İSTEMCİ BAŞINA uygulanıyor. Postgres tarafında
       * `max_connections = 100`; istemci başına 25 demek, birkaç istemci
       * havuzunu doldurduğunda sunucu sınırının aşılması demek. Sonuç,
       * alakasız testlerin 500/503 almasıydı.
       *
       * 8 bağlantı tek bir test dosyasının işini rahatça görür; eşzamanlı
       * sorgular sıraya girer, `pool_timeout` bekleme payını verir.
       *
       * Test altyapısı ayarıdır; üretim bağlantısını etkilemez.
       */
      DATABASE_URL: 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi_test?schema=public&connection_limit=8&pool_timeout=30',
      JWT_SECRET: 'test-secret-key-min-32-bytes-long!!',
      /* Testler dış sağlayıcı kod yollarını (nvidia/openai/deepseek) bilerek
         çalıştırıyor. Üretimde bu bayrak KAPALIDIR — bkz. ai-gateway.ts
         `assertProviderAllowedByPolicy`. */
      AI_ALLOW_EXTERNAL_PROVIDERS: 'true'
    },
    hookTimeout: 60000,
    testTimeout: 30000
  }
})
