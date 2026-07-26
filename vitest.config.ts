import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    globals: true,
    environment: 'node',
    setupFiles: [],
    env: {
      DATABASE_URL: 'postgresql://localakademi:localakademi@127.0.0.1:5432/localakademi_test?schema=public',
      JWT_SECRET: 'test-secret-key-min-32-bytes-long!!'
    },
    hookTimeout: 60000,
    testTimeout: 30000
  }
})
