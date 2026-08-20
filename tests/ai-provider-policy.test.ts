import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { generateCompletion } from '../src/services/ai-gateway'

/**
 * Ürün kararı: kullanıcı verisi yurt dışındaki AI sağlayıcılarına gitmeyecek.
 * Yalnız yerel Ollama ve OmniRoute kullanılıyor.
 *
 * Bu testler kazara sızıntıyı engelliyor. Somut risk: `docker-compose.yml`
 * eskiden `AI_PROVIDER` için `nvidia` varsayılanı taşıyordu — ortam değişkeni
 * unutulduğunda mentor trafiği sessizce ABD'ye gidiyordu.
 *
 * NOT: `vitest.config.ts` bu bayrağı testler için `true` yapıyor (dış
 * sağlayıcı kod yolları test edilebilsin diye). Buradaki testler bayrağı
 * bilerek KAPATIP politikayı doğruluyor.
 */
const messages = [{ role: 'user' as const, content: 'test' }]
const EXTERNAL = ['nvidia', 'openai', 'deepseek'] as const

let onceki: Record<string, string | undefined>

beforeEach(() => {
  onceki = {
    flag: process.env.AI_ALLOW_EXTERNAL_PROVIDERS,
    omniroute: process.env.OMNIROUTE_BASE_URL,
    omniKey: process.env.OMNIROUTE_API_KEY,
    nvidia: process.env.NVIDIA_API_KEY,
    openai: process.env.OPENAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY
  }
  /* Politika kapalı: üretimdeki varsayılan durum. */
  process.env.AI_ALLOW_EXTERNAL_PROVIDERS = 'false'
  /* Anahtarlar DOLU olsa bile reddedilmeli — asıl senaryo bu. */
  process.env.NVIDIA_API_KEY = 'test-key'
  process.env.OPENAI_API_KEY = 'test-key'
  process.env.DEEPSEEK_API_KEY = 'test-key'
  process.env.OMNIROUTE_API_KEY = 'test-key'
})

afterEach(() => {
  for (const [k, v] of Object.entries({
    AI_ALLOW_EXTERNAL_PROVIDERS: onceki.flag,
    OMNIROUTE_BASE_URL: onceki.omniroute,
    OMNIROUTE_API_KEY: onceki.omniKey,
    NVIDIA_API_KEY: onceki.nvidia,
    OPENAI_API_KEY: onceki.openai,
    DEEPSEEK_API_KEY: onceki.deepseek
  })) {
    if (v === undefined) delete process.env[k]
    else process.env[k] = v
  }
})

describe('yurt dışı AI sağlayıcı politikası', () => {
  it.each(EXTERNAL)('%s anahtarı dolu olsa bile reddedilir', async provider => {
    await expect(generateCompletion({ messages, provider }))
      .rejects.toThrow(/EXTERNAL_PROVIDER_DISABLED/)
  })

  it('bayrak açıkça true ise dış sağlayıcıya izin verilir', async () => {
    process.env.AI_ALLOW_EXTERNAL_PROVIDERS = 'true'
    /* Ağ çağrısına kadar gitmeli; politika hatası ALMAMALI. */
    await expect(generateCompletion({ messages, provider: 'nvidia' }))
      .rejects.not.toThrow(/EXTERNAL_PROVIDER_DISABLED/)
  })

  it('auto seçimi kapalıyken dış sağlayıcıya DÜŞMEZ', async () => {
    delete process.env.OMNIROUTE_API_KEY
    delete process.env.OLLAMA_API_URL
    delete process.env.OLLAMA_MODEL
    await expect(generateCompletion({ messages, provider: 'auto' }))
      .rejects.toThrow(/MENTOR_CONFIG_ERROR/)
  })
})

describe('OmniRoute adres doğrulaması', () => {
  it('yerel adres politika engeline takılmaz', async () => {
    process.env.OMNIROUTE_BASE_URL = 'http://localhost:20128/v1'
    await expect(generateCompletion({ messages, provider: 'omniroute' }))
      .rejects.not.toThrow(/NON_LOOPBACK|EXTERNAL_PROVIDER_DISABLED/)
  })

  it('uzak adres bayrak olmadan reddedilir', async () => {
    process.env.OMNIROUTE_BASE_URL = 'https://uzak.example.com/v1'
    await expect(generateCompletion({ messages, provider: 'omniroute' }))
      .rejects.toThrow(/OMNIROUTE_NON_LOOPBACK_URL/)
  })

  it('uzak adres bayrakla kabul edilir', async () => {
    process.env.OMNIROUTE_BASE_URL = 'https://uzak.example.com/v1'
    process.env.AI_ALLOW_EXTERNAL_PROVIDERS = 'true'
    await expect(generateCompletion({ messages, provider: 'omniroute' }))
      .rejects.not.toThrow(/OMNIROUTE_NON_LOOPBACK_URL/)
  })

  it('URL içinde kimlik bilgisi reddedilir', async () => {
    process.env.OMNIROUTE_BASE_URL = 'http://kullanici:parola@localhost:20128/v1'
    await expect(generateCompletion({ messages, provider: 'omniroute' }))
      .rejects.toThrow(/OMNIROUTE_INVALID_URL/)
  })
})
