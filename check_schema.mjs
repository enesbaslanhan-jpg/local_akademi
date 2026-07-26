import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const result = await p.$queryRawUnsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ConversationMessage' AND table_schema = 'public' ORDER BY ordinal_position")
console.log(JSON.stringify(result, null, 2))
await p.$disconnect()
