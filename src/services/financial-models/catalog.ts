import type { PrismaClient } from '@prisma/client'
import { FINANCIAL_MODEL_REGISTRY } from './registry.js'

export async function ensureFinancialModelCatalog(prisma: PrismaClient): Promise<void> {
  for (const definition of FINANCIAL_MODEL_REGISTRY) {
    const stored = await prisma.financialModel.upsert({
      where: { code: definition.code },
      update: {
        name: definition.name,
        category: definition.category,
        purpose: definition.purpose,
        description: definition.description,
        engineType: 'deterministic',
        engineVersion: definition.engineVersion,
        policyVersion: definition.policyVersion,
        status: 'active',
        inputSchema: definition.inputs as any,
        outputSchema: definition.outputs as any,
        formulaDefinition: { formula: definition.formula },
        interpretationRules: definition.interpretationRules,
        warningRules: definition.warningRules,
        limitations: definition.limitations,
      },
      create: {
        code: definition.code,
        name: definition.name,
        category: definition.category,
        purpose: definition.purpose,
        description: definition.description,
        engineType: 'deterministic',
        engineVersion: definition.engineVersion,
        policyVersion: definition.policyVersion,
        status: 'active',
        inputSchema: definition.inputs as any,
        outputSchema: definition.outputs as any,
        formulaDefinition: { formula: definition.formula },
        interpretationRules: definition.interpretationRules,
        warningRules: definition.warningRules,
        limitations: definition.limitations,
      },
    })

    await prisma.financialModelVersion.upsert({
      where: {
        financialModelId_version: {
          financialModelId: stored.id,
          version: definition.engineVersion,
        },
      },
      update: {
        formulaDefinition: { formula: definition.formula },
        inputSchema: definition.inputs as any,
        outputSchema: definition.outputs as any,
        interpretationRules: definition.interpretationRules,
        warningRules: definition.warningRules,
        changeSummary: 'Phase 6 ilk deterministik sürüm.',
      },
      create: {
        financialModelId: stored.id,
        version: definition.engineVersion,
        formulaDefinition: { formula: definition.formula },
        inputSchema: definition.inputs as any,
        outputSchema: definition.outputs as any,
        interpretationRules: definition.interpretationRules,
        warningRules: definition.warningRules,
        changeSummary: 'Phase 6 ilk deterministik sürüm.',
      },
    })
  }
}
