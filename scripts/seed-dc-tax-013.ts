/**
 * DC-TAX-013'ü yayına alır.
 *
 * KAPSAM: yalnız DC-TAX-013. Diğer 12 araca, kurslara, derslere, KO'lara
 * ve kullanıcı geçmişine dokunmaz. Tanım tek kaynaktan —
 * STRUCTURED_TOOL_CONFIGS — okunur, burada ikinci bir tanım tutulmaz.
 *
 * Kullanım:
 *   node --env-file=.env --import tsx scripts/seed-dc-tax-013.ts
 */
import { PrismaClient } from '@prisma/client'
import { STRUCTURED_TOOL_BY_CODE } from '../src/services/decision-tool-catalog'

const prisma = new PrismaClient()
const CODE = 'DC-TAX-013'

async function main() {
  const tool = STRUCTURED_TOOL_BY_CODE.get(CODE)
  if (!tool) throw new Error(`${CODE} katalogda bulunamadi.`)

  const before = await prisma.decisionCheck.count()

  const decisionCheck = await prisma.decisionCheck.upsert({
    where: { code: tool.code },
    update: {
      title: tool.title,
      description: tool.description,
      category: tool.category,
      targetRoles: JSON.stringify(['Esnaf', 'Girişimci', 'Yönetici']),
      published: true,
      currentVersion: tool.version
    },
    create: {
      code: tool.code,
      title: tool.title,
      description: tool.description,
      category: tool.category,
      targetRoles: JSON.stringify(['Esnaf', 'Girişimci', 'Yönetici']),
      published: true,
      currentVersion: tool.version
    }
  })

  const definitionJson = {
    questions: tool.questions,
    rules: [],
    ui: {
      intro: tool.intro,
      submitLabel: tool.submitLabel,
      formulas: tool.formulas,
      decisionChecks: tool.decisionChecks
    }
  }

  const existing = await prisma.decisionCheckVersion.findFirst({
    where: { decisionCheckId: decisionCheck.id, version: tool.version }
  })
  const versionData = {
    status: 'published',
    definitionJson,
    ruleVersion: tool.version,
    publishedAt: new Date()
  }

  if (existing) {
    await prisma.decisionCheckVersion.update({ where: { id: existing.id }, data: versionData })
  } else {
    await prisma.decisionCheckVersion.create({
      data: { decisionCheckId: decisionCheck.id, version: tool.version, ...versionData }
    })
  }

  const after = await prisma.decisionCheck.count()
  console.log(`${CODE} yayinda. DecisionCheck sayisi: ${before} -> ${after}`)
  console.log(`Soru sayisi: ${tool.questions.length}, secenekli soru: ${tool.questions.filter(q => q.type === 'choice').length}`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
