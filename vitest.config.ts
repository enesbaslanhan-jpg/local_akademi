import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    globals: true,
    environment: 'node',
    setupFiles: [],
    env: {
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-secret-key-min-32-bytes-long!!'
    }
  }
})
