import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
;(async () => {
  const ko = await p.knowledgeObject.findUnique({ where: { code: 'DEMO-1' } })
  console.log('DEMO-1 lookup:', ko?.code, ko?.id)

  const ko5 = await p.knowledgeObject.findFirst({ where: { code: { startsWith: 'DEMO-' } } })
  console.log('First DEMO code:', ko5?.code)

  const search = await p.knowledgeObject.findMany({
    where: { OR: [{ title: { contains: 'Demo' } }, { content: { contains: 'Demo' } }] },
    take: 3
  })
  console.log('Search Demo count:', search.length, search.map((k: any) => k.code))

  const demo50 = await p.knowledgeObject.findFirst({ where: { code: 'DEMO-50' } })
  console.log('DEMO-50:', demo50?.code, demo50?.id)

  const id1 = await p.knowledgeObject.findUnique({ where: { id: 1 } })
  console.log('ID=1 code:', id1?.code)

  await p.$disconnect()
})()