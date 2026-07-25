export type RiskLevel = 'low' | 'medium' | 'high'
export type ReviewDecision = 'allow' | 'allow_with_disclaimer' | 'block'

export interface ReviewResult {
  decision: ReviewDecision
  riskLevel: RiskLevel
  categories: string[]
  requiresDisclaimer: boolean
  requiresHumanReview: boolean
  blocked: boolean
  reasons: string[]
  safeDisclaimer: string | null
}

export function computeDecision(blocked: boolean, requiresDisclaimer: boolean): ReviewDecision {
  if (blocked) return 'block'
  if (requiresDisclaimer) return 'allow_with_disclaimer'
  return 'allow'
}

const DISCLAIMERS: Record<string, string> = {
  hukuk: 'Bu bilgi genel bilgilendirme amaçlıdır ve hukuki danışmanlık niteliği taşımaz. Kesin hukuki görüş için bir avukata danışmanız önerilir.',
  vergi: 'Bu bilgi genel bilgilendirme amaçlıdır ve vergi danışmanlığı niteliği taşımaz. Kesin vergisel değerlendirme için bir mali müşavire danışmanız önerilir.',
  finans: 'Bu bilgi yatırım tavsiyesi niteliği taşımaz. Finansal kararlarınızı bir uzmana danışarak almanız önerilir.',
  saglik: 'Bu bilgi tıbbi tavsiye niteliği taşımaz. Sağlık sorunlarınız için bir sağlık kuruluşuna başvurmanız önerilir.',
  kisisel_veri: 'Kişisel verilerin korunması hakkında genel bilgiler içerir. Özel durumunuz için bir uzmana danışmanız önerilir.',
  yuksek_risk: 'Bu karar işletmeniz için önemli sonuçlar doğurabilir. Bir uzmana danışarak karar almanız önerilir.',
  kaynaksiz_iddia: 'Bu yanıt belirtilen kaynaklara dayanmaktadır. Kesin bilgi için resmi kaynakları kontrol etmeniz önerilir.',
}

const LEGAL_TERMS = /(?:avukat|hukuk|hukuki|mahkeme|dava|icra|tapu|miras|boşanma|velayet|sözleşme|ceza|tazminat|şikayet|dilekçe|vekâlet|noter)/i
const TAX_TERMS = /(?:vergi|stopaj|KDV|gelir vergisi|kurumlar vergisi|muhtasar|beyanname|mali müşavir|vergi dairesi|matrah|istisna|indirim)/i
const FINANCE_TERMS = /(?:yatırım|getiri|faiz|hisse senedi|borsa|kripto|forex|vadeli işlem|garan(?:tili|tör|te) getiri|enflasyon|portföy|tahvil)/i
const HEALTH_TERMS = /(?:doktor|hastalık|tedavi|ilaç|rapor|ameliyat|teşhis|reçete|sağlık kurulu|kanser|diyabet|tansiyon)/i
const PERSONAL_DATA_TERMS = /(?:KVKK|kişisel veri|açık rıza|veri sorumlusu|veri işleyen|aydınlatma|veri sızıntı(?:sı|sı?)|özel nitelikli)/i
const HIGH_RISK_TERMS = /(?:işten çıkar|asker(?:e?)|işletme(?:yi|ni?) kapat|iflas|borç yapılandırma|kapatma kararı|toplu işten)/i
const DEFINITIVE_CLAIM = /(?:kesinlikle|asla|her zaman|mutlaka|garanti|garanti ederim|eminim|tabii ki|elbette şöyle)/i
const CREDENTIAL_REQUEST = /(?:şifre(?:m|n)?i? (?:gir|ver|söyle|yaz)|parola(?:m|n)?ı? (?:gir|ver)|kullanıcı adı(?:m|n)?ı? (?:gir|ver)|(?:TC|TCKN|kimlik) (?:numaran|no(?:n)?u) (?:gir|ver)|(?:hesap|banka) (?:bilgi(?:si|lerini)|şifre)|kart(?:ımın|ın) (?:şifre|numara)sı? (?:gir|ver))/i
const BYPASS_ATTEMPT = /(?:uyarı(?:yı|ları?) (?:kaldır|gösterme|yok say)|disclaimer(?:i?|i) (?:kaldır|gizle)|ikaz(?:ı|ları?) (?:kaldır|gizle|yok say))/i

const BYPASS_RESPONSE = 'Güvenlik uyarıları kullanıcı tarafından kaldırılamaz.'

function detectCategories(text: string): string[] {
  const cats: string[] = []
  if (LEGAL_TERMS.test(text)) cats.push('hukuk')
  if (TAX_TERMS.test(text)) cats.push('vergi')
  if (FINANCE_TERMS.test(text)) cats.push('finans')
  if (HEALTH_TERMS.test(text)) cats.push('saglik')
  if (PERSONAL_DATA_TERMS.test(text)) cats.push('kisisel_veri')
  if (HIGH_RISK_TERMS.test(text)) cats.push('yuksek_risk')
  return cats
}

function getMaxRisk(categories: string[]): RiskLevel {
  const hasHigh = categories.some(c => ['yuksek_risk', 'saglik'].includes(c))
  if (hasHigh) return 'high'
  const hasMedium = categories.some(c => ['hukuk', 'vergi', 'finans', 'kisisel_veri'].includes(c))
  if (hasMedium) return 'medium'
  return 'low'
}

function getDisclaimer(categories: string[]): string | null {
  const priority = ['hukuk', 'vergi', 'finans', 'saglik', 'kisisel_veri', 'yuksek_risk', 'kaynaksiz_iddia']
  for (const cat of priority) {
    if (categories.includes(cat)) return DISCLAIMERS[cat]
  }
  return null
}

export function reviewInput(userMessage: string, systemPrompt?: string): ReviewResult {
  const bypassCheck = BYPASS_ATTEMPT.test(userMessage) || (systemPrompt ? BYPASS_ATTEMPT.test(systemPrompt) : false)
  if (bypassCheck) {
    return {
      decision: 'block',
      riskLevel: 'high',
      categories: ['guvenlik_atlatma'],
      requiresDisclaimer: true,
      requiresHumanReview: false,
      blocked: true,
      reasons: ['Kullanıcı güvenlik uyarılarını kaldırmaya çalışıyor'],
      safeDisclaimer: BYPASS_RESPONSE
    }
  }

  const credentialCheck = CREDENTIAL_REQUEST.test(userMessage) || (systemPrompt ? CREDENTIAL_REQUEST.test(systemPrompt) : false)
  if (credentialCheck) {
    return {
      decision: 'block',
      riskLevel: 'high',
      categories: ['kisisel_veri'],
      requiresDisclaimer: true,
      requiresHumanReview: false,
      blocked: true,
      reasons: ['Kullanıcıdan hassas kimlik bilgisi talep ediliyor'],
      safeDisclaimer: 'Kimlik bilgilerinizi veya özel verilerinizi paylaşmak güvenli değildir.'
    }
  }

  const categories = detectCategories(userMessage)
  if (systemPrompt) categories.push(...detectCategories(systemPrompt))
  const riskLevel = getMaxRisk(categories)
  const reasons: string[] = categories.map(c => {
    const map: Record<string, string> = {
      hukuk: 'Hukuki konu içeriyor',
      vergi: 'Vergisel konu içeriyor',
      finans: 'Finansal/yatırım konusu içeriyor',
      saglik: 'Sağlık konusu içeriyor',
      kisisel_veri: 'Kişisel veri konusu içeriyor',
      yuksek_risk: 'Yüksek riskli işletme kararı içeriyor'
    }
    return map[c] || c
  })
  const requiresDisclaimer = riskLevel !== 'low'

  return {
    decision: computeDecision(false, requiresDisclaimer),
    riskLevel,
    categories: [...new Set(categories)],
    requiresDisclaimer,
    requiresHumanReview: riskLevel === 'high',
    blocked: false,
    reasons,
    safeDisclaimer: riskLevel !== 'low' ? getDisclaimer(categories) : null
  }
}

export function reviewOutput(content: string, categories: string[], knowledgeObjectCount: number): ReviewResult {
  const trimmed = content.trim()
  if (!trimmed) {
    return {
      decision: 'block',
      riskLevel: 'high',
      categories: ['bos_yanit'],
      requiresDisclaimer: false,
      requiresHumanReview: false,
      blocked: true,
      reasons: ['AI boş yanıt döndü'],
      safeDisclaimer: null
    }
  }

  if (CREDENTIAL_REQUEST.test(content)) {
    return {
      decision: 'block',
      riskLevel: 'high',
      categories: ['kisisel_veri'],
      requiresDisclaimer: false,
      requiresHumanReview: false,
      blocked: true,
      reasons: ['Yanıt kullanıcıdan hassas kimlik bilgisi talep ediyor'],
      safeDisclaimer: 'Kimlik bilgilerinizi veya özel verilerinizi paylaşmak güvenli değildir.'
    }
  }

  if (BYPASS_ATTEMPT.test(content)) {
    return {
      decision: 'block',
      riskLevel: 'high',
      categories: ['guvenlik_atlatma'],
      requiresDisclaimer: false,
      requiresHumanReview: false,
      blocked: true,
      reasons: ['Yanıt güvenlik uyarılarını kaldırmayı teşvik ediyor'],
      safeDisclaimer: BYPASS_RESPONSE
    }
  }

  const outputCategories = [...categories]

  if (DEFINITIVE_CLAIM.test(content) && knowledgeObjectCount === 0) {
    outputCategories.push('kaynaksiz_iddia')
  }

  const riskLevel = getMaxRisk(outputCategories)

  const reasons: string[] = outputCategories.map(c => {
    const map: Record<string, string> = {
      hukuk: 'Yanıt hukuki konu içeriyor',
      vergi: 'Yanıt vergisel konu içeriyor',
      finans: 'Yanıt finansal/yatırım konusu içeriyor',
      saglik: 'Yanıt sağlık konusu içeriyor',
      kisisel_veri: 'Yanıt kişisel veri konusu içeriyor',
      yuksek_risk: 'Yanıt yüksek riskli işletme kararı içeriyor',
      kaynaksiz_iddia: 'Yanıt kaynaksız kesin iddia içeriyor'
    }
    return map[c] || c
  })
  const requiresDisclaimer = riskLevel !== 'low'

  return {
    decision: computeDecision(false, requiresDisclaimer),
    riskLevel,
    categories: [...new Set(outputCategories)],
    requiresDisclaimer,
    requiresHumanReview: riskLevel === 'high' && outputCategories.includes('yuksek_risk'),
    blocked: false,
    reasons,
    safeDisclaimer: riskLevel !== 'low' ? getDisclaimer(outputCategories) : null
  }
}
