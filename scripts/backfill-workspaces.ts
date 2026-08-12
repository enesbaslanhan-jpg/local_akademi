import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Options {
  dryRun: boolean
  apply: boolean
  verify: boolean
}

function parseArgs(): Options {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const apply = args.includes('--apply')
  const verify = args.includes('--verify')

  const known = new Set(['--dry-run', '--apply', '--verify'])
  const unknown = args.filter(a => !known.has(a))
  if (unknown.length > 0) {
    console.error(`[ERROR] Unknown flags: ${unknown.join(', ')}`)
    console.error('  Usage: npx tsx scripts/backfill-workspaces.ts [--dry-run] [--apply] [--verify]')
    process.exit(1)
  }

  if (dryRun && apply) {
    console.error('[ERROR] Cannot use --dry-run and --apply together.')
    process.exit(1)
  }

  return { dryRun, apply, verify }
}

function isTestDatabase(): boolean {
  const url = process.env.DATABASE_URL || ''
  return url.endsWith('_test') || url.includes('_test?')
}

const WRITE_METHODS = ['create', 'update', 'upsert', 'delete'] as const

function makeReadonlyProxy(db: PrismaClient): PrismaClient {
  return new Proxy(db, {
    get(target, prop) {
      const value = (target as any)[prop]
      if (typeof value !== 'function') return value
      return new Proxy(value, {
        apply(target2, thisArg, args) {
          const callStr = String(prop)
          for (const method of WRITE_METHODS) {
            if (callStr.includes(method)) {
              throw new Error(`[VERIFY] Write blocked: ${callStr} — --verify mode must not modify data`)
            }
          }
          return Reflect.apply(target2, thisArg, args)
        }
      })
    }
  })
}

async function verifyBackfill() {
  const ro = makeReadonlyProxy(prisma)

  console.log('[VERIFY] Checking backfill state...')

  const usersWithProfile = await ro.businessProfile.count()
  const usersWithoutWorkspace = await ro.user.count({
    where: {
      businessProfile: { isNot: null },
      workspaceMemberships: { none: {} }
    }
  })

  const workspaces = await ro.businessWorkspace.count()
  const profiles = await ro.businessProfile.count()
  const settingsCount = await ro.businessSetting.count()

  console.log(`  BusinessProfiles: ${profiles}`)
  console.log(`  Workspaces: ${workspaces}`)
  console.log(`  BusinessSettings: ${settingsCount}`)
  console.log(`  Users with profile but no workspace: ${usersWithoutWorkspace}`)

  const orphanMembers = await ro.businessMember.count({
    where: { workspace: null }
  })
  const orphanActivities = await ro.workspaceActivity.count({
    where: { workspace: null }
  })
  if (orphanMembers > 0) console.log(`  ⚠ Orphan members: ${orphanMembers}`)
  if (orphanActivities > 0) console.log(`  ⚠ Orphan activities: ${orphanActivities}`)

  const missing = usersWithoutWorkspace
  const excess = workspaces - profiles
  const settingsMissing = profiles - settingsCount

  let exitCode = 0
  if (missing > 0) {
    console.log(`[VERIFY] ✓ ${missing} user(s) still need workspace backfill`)
    exitCode = 1
  }
  if (excess > 0) {
    console.log(`[VERIFY] ⚠ ${excess} extra workspace(s) without BusinessProfile`)
  }
  if (settingsMissing > 0) {
    console.log(`[VERIFY] ⚠ ${settingsMissing} workspace(s) missing settings`)
    exitCode = 1
  }
  if (orphanMembers > 0) {
    console.log(`[VERIFY] ⚠ ${orphanMembers} orphan member(s)`)
    exitCode = 1
  }
  if (orphanActivities > 0) {
    console.log(`[VERIFY] ⚠ ${orphanActivities} orphan activity(ies)`)
    exitCode = 1
  }

  if (missing === 0 && settingsMissing === 0 && orphanMembers === 0 && orphanActivities === 0) {
    console.log('[VERIFY] ✓ Backfill is complete and consistent')
  }

  await prisma.$disconnect()
  process.exit(exitCode)
}

async function backfill() {
  const opts = parseArgs()

  if (opts.verify) {
    await verifyBackfill()
    return
  }

  if (!opts.apply) {
    console.log('[DRY-RUN] No --apply flag. Running in dry-run mode — no data will be modified.')
  }

  if (opts.apply && !isTestDatabase()) {
    console.error('[ERROR] --apply is only allowed on test databases (DATABASE_URL ending with _test).')
    console.error('  To run against production, remove this guard or set a different confirmation.')
    process.exit(1)
  }

  const users = await prisma.user.findMany({
    where: {
      businessProfile: { isNot: null },
      workspaceMemberships: { none: {} }
    },
    include: { businessProfile: true, userPreference: true },
    orderBy: { id: 'asc' }
  })

  console.log(`Found ${users.length} user(s) with BusinessProfile but no workspace.`)

  for (const user of users) {
    const bp = user.businessProfile!
    console.log(`  [${user.id}] "${bp.name}"`)

    if (!opts.apply) continue

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.businessMember.findFirst({
        where: { userId: user.id }
      })
      if (existing) {
        console.log(`    ∼ Already has membership — skipped`)
        return { skipped: true, workspaceId: existing.workspaceId }
      }

      const ws = await tx.businessWorkspace.create({
        data: {
          name: bp.name || `${user.name}'s Business`,
          legalName: null,
          sector: bp.sector || '',
          city: bp.city || '',
          currency: bp.currency || 'TRY',
          businessStage: bp.businessStage,
          employeeCount: bp.employeeCount,
          salesChannels: bp.salesChannels || '[]',
          primaryGoal: bp.primaryGoal,
          challenges: bp.challenges || '[]',
          monthlySales: bp.monthlySales,
          monthlyExpenses: bp.monthlyExpenses,
          cashBalance: bp.cashBalance,
          debtBalance: bp.debtBalance,
          createdById: user.id
        }
      })

      await tx.businessMember.create({
        data: { workspaceId: ws.id, userId: user.id, role: 'owner', status: 'active' }
      })

      await tx.businessSetting.create({
        data: { workspaceId: ws.id, defaultCurrency: bp.currency || 'TRY' }
      })

      await tx.workspaceActivity.create({
        data: {
          workspaceId: ws.id,
          actorId: user.id,
          action: 'workspace.created',
          entityType: 'workspace',
          entityId: ws.id,
          metadata: JSON.stringify({ source: 'backfill' })
        }
      })

      await tx.userPreference.upsert({
        where: { userId: user.id },
        update: { activeWorkspaceId: ws.id },
        create: { userId: user.id, activeWorkspaceId: ws.id }
      })

      return { skipped: false, workspaceId: ws.id }
    })

    if (!result.skipped) {
      console.log(`    ✔ Workspace created: ${result.workspaceId}`)
    }
  }

  console.log()
  if (opts.apply) {
    console.log('Backfill complete.')
  } else {
    console.log('Use --apply to persist changes.')
  }
}

backfill().catch((err) => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
