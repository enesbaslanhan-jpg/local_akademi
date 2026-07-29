import type { PrismaClient } from '@prisma/client'
import { runFinancialModel } from './engine.js'
import { FINANCIAL_MODEL_REGISTRY, getFinancialModel } from './registry.js'
import { recommendFinancialModels } from './suitability.js'
import type { ModelAssumptionInput } from './types.js'

export const FINANCIAL_MENTOR_TOOLS = [
  'list_financial_models',
  'recommend_financial_model',
  'get_model_requirements',
  'validate_model_inputs',
  'run_financial_model',
  'explain_model_result',
  'show_calculation_trace',
  'compare_model_runs',
  'run_scenario',
  'create_task_from_result',
  'recommend_course',
  'record_decision',
  'review_decision_outcome',
] as const

export function listFinancialModels() {
  return FINANCIAL_MODEL_REGISTRY.map(({ code, name, category, purpose, level }) => ({
    code, name, category, purpose, level,
  }))
}

export function recommendFinancialModel(input: Parameters<typeof recommendFinancialModels>[0]) {
  return recommendFinancialModels(input)
}

export function getModelRequirements(code: string) {
  const model = getFinancialModel(code)
  if (!model) throw new Error('Finansal model bulunamadı.')
  return {
    code: model.code,
    name: model.name,
    inputs: model.inputs,
    assumptionGuidance: model.inputs.map(input => ({
      key: input.key,
      label: input.label,
      requiresSource: true,
      requiresUserVerificationForOcr: true,
    })),
    limitations: model.limitations,
    sources: model.sources,
  }
}

export function validateModelInputs(
  code: string,
  inputs: Record<string, unknown>,
  assumptions: ModelAssumptionInput[] = [],
) {
  return runFinancialModel(code, inputs, assumptions)
}

export function explainModelResult(run: {
  model: { code: string; name: string }
  scenarioName: string
  outputs: unknown
  warnings: string[]
  confidence: unknown
}) {
  return {
    model: `${run.model.name} (${run.model.code})`,
    scenario: run.scenarioName,
    calculatedOutputs: run.outputs,
    warnings: run.warnings,
    confidence: run.confidence,
    instruction: 'Yalnızca kayıtlı çıktıları yorumla; yeni sayı hesaplama, girdileri değiştirme veya kesin sonuç iddiasında bulunma.',
  }
}

export async function getMentorRunContext(
  prisma: PrismaClient,
  userId: number,
  workspaceId: string,
  message: string,
): Promise<string> {
  const isFinancialQuestion = /(model|oran|rasyo|likidite|nakit|marj|kâr|kar|başa baş|cac|ltv|burn|runway|npv|irr|wacc|dcf|dupont|ccc|dso|dio|dpo)/iu.test(message)
  if (!isFinancialQuestion) return ''

  const runId = message.match(/\b[0-9a-f]{8}-[0-9a-f-]{27,36}\b/i)?.[0]
  const run = await prisma.financialModelRun.findFirst({
    where: {
      businessId: workspaceId,
      ...(runId ? { id: runId } : {}),
      business: { members: { some: { userId, status: 'active' } } },
    },
    include: {
      model: { select: { code: true, name: true, purpose: true } },
      modelVersion: { select: { version: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!run) {
    const recommendations = recommendFinancialModels({
      question: message,
      availableFields: [],
    }).slice(0, 3)
    return [
      '<financial_model_guidance>',
      'Henüz kayıtlı model çalışması yok. Mentor hesaplama yapmamalı; kullanıcıyı Model Laboratuvarına yönlendirmelidir.',
      ...recommendations.map(item => `- ${item.name} (${item.code}): ${item.explanation}`),
      '</financial_model_guidance>',
    ].join('\n')
  }

  return [
    '<verified_financial_model_run>',
    'Bu blok deterministik motorun değiştirilemez kayıtlı sonucudur. Mentor yalnızca açıklar; yeniden hesaplamaz ve yeni sayı üretmez.',
    `Çalışma ID: ${run.id}`,
    `Model: ${run.model.name} (${run.model.code})`,
    `Sürüm: ${run.modelVersion.version}; Politika: ${getFinancialModel(run.model.code)?.policyVersion ?? 'bilinmiyor'}`,
    `Senaryo: ${run.scenarioName}`,
    `Girdiler: ${JSON.stringify(run.normalizedInputs)}`,
    `Çıktılar: ${JSON.stringify(run.outputs)}`,
    `Kontroller: ${JSON.stringify(run.checks)}`,
    `Uyarılar: ${JSON.stringify(run.warnings)}`,
    `Güven bileşenleri: ${JSON.stringify(run.confidence)}`,
    `Hesap izi: ${JSON.stringify(run.calculationTrace)}`,
    '</verified_financial_model_run>',
  ].join('\n').slice(0, 5000)
}
