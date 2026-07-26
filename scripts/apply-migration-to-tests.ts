import { execSync } from 'node:child_process'

const TEST_DB_URL = process.env.DATABASE_URL
  || 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi_test?schema=public'

execSync('npx prisma db push --skip-generate --accept-data-loss --schema prisma/schema.prisma', {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DATABASE_URL: TEST_DB_URL,
    ...(process.platform === 'win32' ? { RUST_LOG: 'info' } : {}),
  },
  stdio: 'inherit',
  timeout: 60_000,
})
console.log(`  Schema synchronized on ${TEST_DB_URL}`)
