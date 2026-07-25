import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const result = await p.$queryRawUnsafe("SELECT sql FROM sqlite_master WHERE name='ConversationMessage'")
console.log(JSON.stringify(result, null, 2))
await p.$disconnect()
