import { PrismaClient } from '@prisma/client'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import {
  getPersistentReviewerMetricsSnapshot,
  evaluateReviewerPilotAcceptance,
} from '../src/services/ai-reviewer'

const root = resolve(import.meta.dirname, '..')
const outputs = join(root, 'outputs')
const prisma = new PrismaClient()

function readReport(name: string): Record<string, any> | null {
  const path = join(outputs, name)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function main(): Promise<void> {
  const security = readReport('security-acceptance.json')
  const rag = readReport('hybrid-rag-evaluation.json')
  const quiz = readReport('ai-quiz-pilot.json')
  const [
    officialDrafts,
    openCommunityReports,
    humanAuditTotal,
    criticalMisses,
  ] = await Promise.all([
    prisma.communityPost.count({
      where: { postType: 'official', status: 'draft' },
    }),
    prisma.communityReport.count({ where: { status: 'open' } }),
    prisma.aiReviewerHumanAudit.count(),
    prisma.aiReviewerHumanAudit.count({
      where: { criticalMiss: true },
    }),
  ])
  const reviewerMetrics = await getPersistentReviewerMetricsSnapshot()
  const reviewer = 'totals' in reviewerMetrics
    ? evaluateReviewerPilotAcceptance(
        reviewerMetrics,
        undefined,
        { total: humanAuditTotal, criticalMisses },
      )
    : null
  const backupDirectory = join(root, 'BACKUPS')
  const automaticBackups = existsSync(backupDirectory)
    ? (await import('fs')).readdirSync(backupDirectory)
        .filter(name => /^auto_dev_.*\.db$/.test(name)).length
    : 0
  const gates = {
    automatedSecurity: security?.automatedPass === true,
    ragQuality: rag?.pass === true,
    quizPilotDraftOnly:
      quiz?.pass === true &&
      quiz?.allCreatedQuizzesRemainDraft === true,
    officialPilotDrafts: officialDrafts >= 5,
    communityModeration: openCommunityReports >= 0,
    automaticBackup: automaticBackups > 0,
    reviewerRemainsControlled:
      process.env.AI_REVIEWER_MODE !== 'disclaimer_only' ||
      reviewer?.readyForDisclaimerOnly === true,
  }
  const betaReady = Object.values(gates).every(Boolean)
  const report = {
    generatedAt: new Date().toISOString(),
    betaReady,
    productionReady:
      betaReady &&
      security?.productionReady === true &&
      reviewer?.readyForDisclaimerOnly === true,
    gates,
    counts: {
      officialDrafts,
      openCommunityReports,
      humanAuditTotal,
      criticalMisses,
      automaticBackups,
    },
    reviewer,
    externalActions: security?.externalActions || [],
  }
  writeFileSync(
    join(outputs, 'beta-acceptance.json'),
    JSON.stringify(report, null, 2),
  )
  console.log(JSON.stringify(report, null, 2))
  if (!betaReady) process.exitCode = 1
}

main()
  .catch(error => {
    console.error(JSON.stringify({
      betaReady: false,
      errorCode: error instanceof Error
        ? error.message
        : 'BETA_ACCEPTANCE_FAILED',
    }))
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

