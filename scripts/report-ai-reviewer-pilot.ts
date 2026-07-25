import {
  evaluateReviewerPilotAcceptance,
  getPersistentReviewerMetricsSnapshot,
  getReviewerOllamaHealth,
} from '../src/services/ai-reviewer'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const [metrics, ollama] = await Promise.all([
    getPersistentReviewerMetricsSnapshot(),
    getReviewerOllamaHealth(),
  ])

  if (!metrics.enabled || !('totals' in metrics)) {
    console.error(
      JSON.stringify({
        ok: false,
        errorCode: 'REVIEWER_PERSISTENT_METRICS_DISABLED',
      }),
    )
    process.exitCode = 1
    return
  }

  const [humanAuditTotal, criticalMisses] = await Promise.all([
    prisma.aiReviewerHumanAudit.count(),
    prisma.aiReviewerHumanAudit.count({
      where: { criticalMiss: true },
    }),
  ])
  const acceptance = evaluateReviewerPilotAcceptance(
    metrics,
    undefined,
    { total: humanAuditTotal, criticalMisses },
  )
  console.log(
    JSON.stringify(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        ollama,
        acceptance,
        humanAudit: {
          total: humanAuditTotal,
          criticalMisses,
          contentStored: false,
        },
        metrics,
      },
      null,
      2,
    ),
  )
}

main().catch(() => {
  console.error(
    JSON.stringify({
      ok: false,
      errorCode: 'REVIEWER_PILOT_REPORT_FAILED',
    }),
  )
  process.exitCode = 1
}).finally(async () => {
  await prisma.$disconnect()
})
