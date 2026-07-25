import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const approvalNote = 'Kullanıcı 21 Temmuz 2026 tarihinde 600 kayıtlık ana müfredat için profesyonel onay ve yayın talimatı verdi.'

async function main() {
  const [actor, rows] = await Promise.all([
    prisma.user.findFirst({ where: { role: 'admin' }, orderBy: { id: 'asc' } }),
    prisma.knowledgeObject.findMany({
      where: { code: { startsWith: 'CUR-' } },
      include: { sources: true, quizzes: { include: { questions: true } }, taskTemplates: true },
      orderBy: { code: 'asc' }
    })
  ])
  if (!actor) throw new Error('Yayın işlemi için bir admin kullanıcı gerekli.')
  if (rows.length !== 600) throw new Error(`600 ana müfredat kaydı bekleniyordu; bulunan: ${rows.length}`)

  const invalid = rows.filter(row => !row.sources.length || row.quizzes.length !== 1 || row.quizzes[0].questions.length !== 3 || row.taskTemplates.length !== 1)
  if (invalid.length) throw new Error(`Yayın öncesi bütünlük kontrolü başarısız: ${invalid.slice(0, 10).map(row => row.code).join(', ')}`)
  const invalidStatuses = rows.filter(row => !['in_review', 'approved', 'published'].includes(row.status))
  if (invalidStatuses.length) throw new Error(`Geçersiz yayın başlangıç durumu: ${invalidStatuses.slice(0, 10).map(row => `${row.code}:${row.status}`).join(', ')}`)

  const counts = rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {} as Record<string, number>)
  console.log(JSON.stringify({ scope: 'CUR-*', records: rows.length, actor: actor.email, currentStatuses: counts, apply }, null, 2))
  if (!apply) { console.log('DRY RUN — onay veya yayın durumu değiştirilmedi.'); return }

  let approved = 0
  let published = 0
  for (const row of rows) {
    if (row.status === 'published') continue
    const now = new Date()
    await prisma.$transaction(async tx => {
      let fromStatus = row.status
      if (fromStatus === 'in_review') {
        await tx.knowledgeObject.update({ where: { id: row.id }, data: { status: 'approved', verificationStatus: 'verified' } })
        await tx.reviewRecord.create({ data: { koId: row.id, reviewerId: actor.id, status: 'approved', notes: approvalNote, reviewedAt: now } })
        await tx.publicationEvent.create({ data: { koId: row.id, action: 'approved', performedBy: actor.id, note: approvalNote, timestamp: now } })
        await tx.auditLog.create({ data: { action: 'knowledge_object.approved', entityType: 'knowledge_object', entityId: String(row.id),
          actorId: actor.id, actorName: actor.email, metadata: JSON.stringify({ fromStatus: 'in_review', toStatus: 'approved', notes: approvalNote, entityCode: row.code }) } })
        approved++
        fromStatus = 'approved'
      }
      if (fromStatus === 'approved') {
        await tx.knowledgeObject.update({ where: { id: row.id }, data: { status: 'published', verificationStatus: 'verified', publishedAt: now, reviewDue: null } })
        await tx.publicationEvent.create({ data: { koId: row.id, action: 'published', performedBy: actor.id, note: 'Kullanıcı onayı sonrası ana müfredat yayını.', timestamp: now } })
        await tx.auditLog.create({ data: { action: 'knowledge_object.published', entityType: 'knowledge_object', entityId: String(row.id),
          actorId: actor.id, actorName: actor.email, metadata: JSON.stringify({ fromStatus: 'approved', toStatus: 'published', gate: row.reviewGate, entityCode: row.code }) } })
        published++
      }
    })
  }
  console.log(`Onaylandı: ${approved}; yayımlandı: ${published}.`)
}

main().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => prisma.$disconnect())
