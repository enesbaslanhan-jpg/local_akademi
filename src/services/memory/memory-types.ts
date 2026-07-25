export type MemoryType = 'profile' | 'goal' | 'preference' | 'fact' | 'problem' | 'decision' | 'conversation_summary'

export type MemoryStatus = 'active' | 'superseded' | 'disputed' | 'expired' | 'deleted'

export type ValidationStatus = 'inferred' | 'user_confirmed' | 'user_entered' | 'system_imported'

export type SourceType = 'ai_extraction' | 'user_manual' | 'system_import' | 'business_profile'

export const VALID_MEMORY_TYPES: readonly MemoryType[] = [
  'profile', 'goal', 'preference', 'fact', 'problem', 'decision', 'conversation_summary'
]

export const VALID_MEMORY_STATUSES: readonly MemoryStatus[] = [
  'active', 'superseded', 'disputed', 'expired', 'deleted'
]

export const VALID_VALIDATION_STATUSES: readonly ValidationStatus[] = [
  'inferred', 'user_confirmed', 'user_entered', 'system_imported'
]

export const VALID_SOURCE_TYPES: readonly SourceType[] = [
  'ai_extraction', 'user_manual', 'system_import', 'business_profile'
]

export function isValidMemoryType(type: string): type is MemoryType {
  return VALID_MEMORY_TYPES.includes(type as MemoryType)
}

export function isValidMemoryStatus(status: string): status is MemoryStatus {
  return VALID_MEMORY_STATUSES.includes(status as MemoryStatus)
}

export interface MemoryInput {
  userId: number
  type: MemoryType
  key?: string | null
  value: string
  normalizedValue?: string | null
  summary?: string | null
  sourceType: SourceType
  sourceMessageId?: number | null
  conversationId?: number | null
  importance?: number
  confidence?: number
  status?: MemoryStatus
  validationStatus?: ValidationStatus
}

export interface MemoryRecord {
  id: number
  userId: number
  type: string
  key: string | null
  value: string
  normalizedValue: string | null
  summary: string | null
  sourceType: string
  sourceMessageId: number | null
  conversationId: number | null
  importance: number
  confidence: number
  status: string
  validationStatus: string
  validFrom: Date
  validUntil: Date | null
  lastUsedAt: Date | null
  usageCount: number
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export const PROFILE_KEYS = [
  'business_name', 'sector', 'city', 'employee_count', 'sales_channels',
  'business_age', 'target_customer', 'products_services'
] as const

export const FACT_KEYS = [
  'monthly_revenue', 'monthly_expenses', 'average_order_value',
  'commission_rate', 'shipping_cost', 'product_count', 'stock_status',
  'ad_budget', 'employee_cost', 'debt_info', 'platforms_used'
] as const

export function normalizeKey(type: MemoryType, value: string): string {
  const lower = value.toLowerCase().trim()
  const keyMap: Record<string, string> = {
    'aylık ciro': 'monthly_revenue',
    'ciro': 'monthly_revenue',
    'gelir': 'monthly_revenue',
    'aylık gelir': 'monthly_revenue',
    'aylık gider': 'monthly_expenses',
    'gider': 'monthly_expenses',
    'masraf': 'monthly_expenses',
    'ortalama sepet': 'average_order_value',
    'sepet tutarı': 'average_order_value',
    'komisyon': 'commission_rate',
    'kargo': 'shipping_cost',
    'ürün sayısı': 'product_count',
    'stok': 'stock_status',
    'reklam bütçesi': 'ad_budget',
    'reklam': 'ad_budget',
    'çalışan sayısı': 'employee_count',
    'çalışan': 'employee_count',
    'sektör': 'sector',
    'işletme adı': 'business_name',
    'şehir': 'city',
    'satış kanalı': 'sales_channels',
    'hedef müşteri': 'target_customer',
  }
  return keyMap[lower] || value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export function normalizeValue(value: string): string {
  return value.toLowerCase().trim()
    .replace(/(\d+)\.?(\d*)\s*(tl|try|₺)/gi, '$1.$2 TRY')
    .replace(/(\d+)\.?(\d*)\s*(usd|\$)/gi, '$1.$2 USD')
    .replace(/\s+/g, ' ')
    .trim()
}
