import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const approvalNote = 'Kullanıcı, bilgi tabanı genişletmesindeki 240 içerik için profesyonel onay ve yayın talimatı verdi.'

async function main() {
  const [actor, rows] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'admin' }, orderBy: { id: 'asc' } }),
    prisma.knowledgeObject.findMany({
      where: { code: { startsWith: 'KBX-' } },
      include: { sources: true, quizzes: { include: { questions: true } }, taskTemplates: true },
      orderBy: { code: 'asc' }
    })
  ])

  if (!actor) throw new Error('Yayın işlemi için bir admin kullanıcısı gerekli.')
  if (rows.length !== 240) throw new Error(`240 KBX kaydı bekleniyordu; bulunan: ${rows.length}`)

  const invalid = rows.filter(row =>
    !row.sources.length || row.quizzes.length !== 1 ||
    row.quizzes[0].questions.length !== 3 || row.taskTemplates.length !== 1
  )
  if (invalid.length) throw new Error(`Yayın bütünlüğü başarısız: ${invalid.slice(0, 10).map(row => row.code).join(', ')}`)

  const invalidStatuses = rows.filter(row => !['in_review', 'approved', 'published'].includes(row.status))
  if (invalidStatuses.length) throw new Error(`Geçersiz başlangıç durumu: ${invalidStatuses.slice(0, 10).map(row => `${row.code}:${row.status}`).join(', ')}`)

  const currentStatuses = rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.status] = (counts[row.status] || 0) + 1
    return counts
  }, {})
  console.log(JSON.stringify({ scope: 'KBX-*', records: rows.length, actor: actor.email, currentStatuses, apply }, null, 2))
  if (!apply) return

  let approved = 0
  let published = 0
  for (const row of rows) {
    if (row.status === 'published') continue
    const now = new Date()
    await prisma.$transaction(async tx => {
      let status = row.status
      if (status === 'in_review') {
        await tx.knowledgeObject.update({ where: { id: row.id }, data: { status: 'approved', verificationStatus: 'verified' } })
        await tx.reviewRecord.create({ data: { koId: row.id, reviewerId: actor.id, status: 'approved', notes: approvalNote, reviewedAt: now } })
        await tx.publicationEvent.create({ data: { koId: row.id, action: 'approved', performedBy: actor.id, note: approvalNote, timestamp: now } })
        await tx.auditLog.create({ data: { action: 'knowledge_object.approved', entityType: 'knowledge_object', entityId: String(row.id), actorId: actor.id, actorName: actor.email, metadata: JSON.stringify({ fromStatus: 'in_review', toStatus: 'approved', entityCode: row.code, gate: row.reviewGate, userAuthorized: true }) } })
        approved++
        status = 'approved'
      }
      if (status === 'approved') {
        await tx.knowledgeObject.update({ where: { id: row.id }, data: { status: 'published', verificationStatus: 'verified', publishedAt: now, reviewDue: null } })
        await tx.publicationEvent.create({ data: { koId: row.id, action: 'published', performedBy: actor.id, note: 'Kullanıcı onayı sonrası bilgi tabanı genişletmesi yayını.', timestamp: now } })
        await tx.auditLog.create({ data: { action: 'knowledge_object.published', entityType: 'knowledge_object', entityId: String(row.id), actorId: actor.id, actorName: actor.email, metadata: JSON.stringify({ fromStatus: 'approved', toStatus: 'published', entityCode: row.code, gate: row.reviewGate }) } })
        published++
      }
    })
  }

  console.log(`Onaylandı: ${approved}; yayımlandı: ${published}.`)
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
