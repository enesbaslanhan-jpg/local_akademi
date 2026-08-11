export interface AiRuntimeInfo {
  provider: string
  model: string
  executionType: 'local' | 'cloud' | 'unknown'
}

export function getProviderExecutionType(provider: string): AiRuntimeInfo['executionType'] {
  const p = provider.toLowerCase()
  if (p === 'ollama') return 'local'
  if (['nvidia', 'openai', 'deepseek', 'omniroute'].includes(p)) return 'cloud'
  return 'unknown'
}

function runtimeInfoToString(info: AiRuntimeInfo): string {
  return `Sağlayıcı: ${capitalize(info.provider)}\nModel: ${info.model}\nÇalışma türü: ${info.executionType === 'local' ? 'Yerel' : 'Bulut'}`
}

function capitalize(s: string): string {
  if (!s) return s
  return s[0].toUpperCase() + s.slice(1)
}

function pickGreetingResponse(message: string): string {
  const normalized = message
    .toLocaleLowerCase('tr-TR')
    .replace(/[\.\,!\?:;]+$/g, '')
    .trim()
  if (normalized.includes('günaydın')) return 'Günaydın! Size nasıl yardımcı olabilirim?'
  if (normalized.includes('iyi akşam')) return 'İyi akşamlar! Bugün ne üzerinde çalışalım?'
  if (normalized.includes('iyi gün')) return 'İyi günler! Size nasıl destek olabilirim?'
  if (normalized.includes('nasıl') || normalized.includes('naber')) return 'İyiyim, teşekkür ederim. Size nasıl yardımcı olabilirim?'
  if (normalized.includes('teşekkür') || normalized.includes('sağol') || normalized.includes('eyvallah')) return 'Rica ederim. Başka bir konuda yardımcı olabilir miyim?'
  if (normalized.includes('görüşürüz') || normalized.includes('hoşça kal')) return 'Görüşmek üzere. İyi çalışmalar!'
  return 'Merhaba! Size nasıl yardımcı olabilirim?'
}

function buildClarificationResponse(message: string): string {
  const normalized = message
    .toLocaleLowerCase('tr-TR')
    .replace(/[\.\,!\?:;]+$/g, '')
    .trim()

  if (/\bmodel\b/.test(normalized)) {
    return '“Model” derken hangisini kastettiğinizi netleştirebilir misiniz?\n- Kullandığım AI modeli (örn. llama3.2:3b)\n- İşletme gelir modeli\n- İş Modeli Canvas\n- Model Laboratuvarındaki finansal model'
  }

  if (normalized.length <= 25 && /^\w+$/.test(normalized)) {
    return `"${message.trim()}" hakkında daha fazla detay verebilir misiniz? İşletme, finans, vergi, pazarlama veya platform kullanımı gibi bir alan mı demiştiniz?`
  }

  return 'Sorunuzu biraz daha açabilir misiniz? Hangi konuda yardım istediğinizi anlayıp daha doğru bir yanıt verebilmem için örnek bir cümle kurabilirsiniz.'
}

const PLATFORM_HELP: Record<string, string> = {
  archive: 'Sohbeti arşivlemek için sohbet listesinde ilgili sohbetin yanındaki “Arşivle” seçeneğini kullanabilirsiniz. Arşivlenmiş sohbetlere “Arşivlenmiş sohbetler” sekmesinden ulaşabilirsiniz.',
  sources: 'Kaynaklar bölümüne uygulamanın ana menüsünden “Kaynaklar” veya “Bilgi Merkezi” bağlantısıyla ulaşabilirsiniz.',
  model_lab: 'Model Laboratuvarı, genellikle “Araçlar” veya “Finans” menüsü altındadır. Finansal senaryoları ve hesaplamaları orada çalıştırabilirsiniz.',
  delete_chat: 'Sohbeti silmek için sohbetin yanındaki üç nokta veya “Sil” seçeneğini kullanabilirsiniz. Silinen sohbetler geri alınamaz.',
}

export function buildPlatformHelpResponse(message: string): string | null {
  const normalized = message.toLocaleLowerCase('tr-TR')
  if (/arşiv/.test(normalized)) return PLATFORM_HELP.archive
  if (/kaynaklar?\s+(?:nerede|nasıl|nereden)/.test(normalized) || /bilgi\s+merkezi/.test(normalized)) return PLATFORM_HELP.sources
  if (/model\s+laboratuvar/.test(normalized)) return PLATFORM_HELP.model_lab
  if (/sohbeti\s+(?:nasıl\s+)?sil/.test(normalized)) return PLATFORM_HELP.delete_chat
  return null
}

export function buildDeterministicResponse(
  intent: 'greeting' | 'system_capability' | 'clarification_needed',
  message: string,
  runtime?: AiRuntimeInfo,
): string {
  if (intent === 'greeting') {
    return pickGreetingResponse(message)
  }

  if (intent === 'system_capability') {
    if (!runtime) {
      return 'Şu anki AI çalışma zamanı bilgisi alınamıyor. Lütfen daha sonra tekrar deneyin.'
    }
    return runtimeInfoToString(runtime)
  }

  return buildClarificationResponse(message)
}

export const FINANCIAL_DISCLAIMER = 'Bu bilgi genel finansal bilgilendirme amaçlıdır; yatırım veya kredi tavsiyesi niteliği taşımaz. Önemli kararlarınızı bir mali danışmanla değerlendirin.'
export const TAX_DISCLAIMER = 'Bu bilgi genel bilgilendirme amaçlıdır ve vergi danışmanlığı niteliği taşımaz. Kesin vergisel değerlendirme için bir mali müşavire danışmanız önerilir.'
export const LEGAL_DISCLAIMER = 'Bu bilgi genel bilgilendirme amaçlıdır ve hukuki danışmanlık niteliği taşımaz. Kesin hukuki görüş için bir avukata danışmanız önerilir.'

export function getStaticDisclaimerForIntent(intent: string): string | null {
  if (intent === 'tax_legal') return TAX_DISCLAIMER
  if (intent === 'financial_analysis') return FINANCIAL_DISCLAIMER
  return null
}

export function appendDisclaimer(content: string, disclaimer: string | null): string {
  if (!disclaimer) return content
  const trimmed = content.trim()
  if (!trimmed) return trimmed
  if (trimmed.includes(disclaimer)) return trimmed
  return `${trimmed}\n\n---\n${disclaimer}`
}
