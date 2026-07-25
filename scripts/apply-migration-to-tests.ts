import { execSync } from 'node:child_process'

const TEST_DBS = ['test.db', 'bootstrap-test.db', 'reset-password-test.db']

for (const dbFile of TEST_DBS) {
  // The persistent test fixtures predate Prisma migration history. `db push`
  // synchronizes them non-destructively; isolated E2E databases still exercise
  // the real migration chain through tests/e2e/helpers.ts.
  execSync('npx prisma db push --skip-generate --schema prisma/schema.prisma', {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: `file:./${dbFile}`,
      ...(process.platform === 'win32' ? { RUST_LOG: 'info' } : {}),
    },
    stdio: 'inherit',
    timeout: 60_000,
  })
  console.log(`  ${dbFile}: schema synchronized`)
}
