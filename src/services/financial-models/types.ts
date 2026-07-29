export type FinancialModelCategory =
  | 'liquidity'
  | 'profitability'
  | 'efficiency'
  | 'unit_economics'
  | 'cash_resilience'
  | 'investment'
  | 'valuation'

export type FinancialInputType = 'number' | 'integer' | 'number_array'

export interface FinancialInputDefinition {
  key: string
  label: string
  type: FinancialInputType
  unit: string
  required: boolean
  min?: number
  max?: number
  description: string
  sourceRequired?: boolean
}

export interface FinancialOutputDefinition {
  key: string
  label: string
  unit: string
  description: string
}

export interface FinancialSourceReference {
  title: string
  url: string
  authority: 'official' | 'academic' | 'professional'
  usage: string
}

export interface FinancialModelDefinition {
  code: string
  name: string
  category: FinancialModelCategory
  purpose: string
  description: string
  engineVersion: string
  policyVersion: string
  level: 'basic' | 'intermediate' | 'advanced'
  formula: string
  inputs: FinancialInputDefinition[]
  outputs: FinancialOutputDefinition[]
  interpretationRules: string[]
  warningRules: string[]
  limitations: string[]
  sources: FinancialSourceReference[]
  courseCode: string
}

export interface ModelAssumptionInput {
  key: string
  value: unknown
  unit?: string
  sourceType: 'document' | 'business_record' | 'user' | 'case' | 'approved_dataset' | 'market_data'
  sourceReference?: string
  effectiveDate?: string
  confidence?: number
  userVerified?: boolean
}

export interface CalculationStep {
  key: string
  label: string
  formula: string
  inputs: Record<string, unknown>
  result: unknown
  rounding: string
}

export interface ValidationCheck {
  code: string
  label: string
  passed: boolean
  severity: 'info' | 'warning' | 'error'
  detail: string
}

export interface ConfidenceComponent {
  key: string
  label: string
  score: number
  reason: string
}

export interface ModelConfidence {
  score: number
  label: 'low' | 'medium' | 'high'
  disclaimer: string
  components: ConfidenceComponent[]
}

export interface FinancialModelResult {
  modelCode: string
  engineVersion: string
  policyVersion: string
  normalizedInputs: Record<string, number | number[]>
  outputs: Record<string, unknown>
  checks: ValidationCheck[]
  warnings: string[]
  trace: CalculationStep[]
  confidence: ModelConfidence
  ethics: ValidationCheck[]
}

export interface ModelRunRequest {
  inputs: Record<string, unknown>
  assumptions?: ModelAssumptionInput[]
  scenarioName?: string
  sourceDocumentId?: string
  caseId?: string
}
