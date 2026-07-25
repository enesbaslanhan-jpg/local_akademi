import { start } from './index'

start().catch((error) => {
  console.error('[SERVER] Startup failed:', error)
  process.exit(1)
})
