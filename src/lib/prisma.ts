import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as typeof globalThis & {
  __prisma?: PrismaClient
}

export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? (globalForPrisma.__prisma = new PrismaClient())

let disconnected = false

export async function disconnectPrisma(): Promise<void> {
  if (disconnected) return
  disconnected = true
  await prisma.$disconnect()
}
