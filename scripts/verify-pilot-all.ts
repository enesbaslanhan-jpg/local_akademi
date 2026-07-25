import { execSync } from 'node:child_process'

const steps = [
  { name: 'Learning Pilot Quality', cmd: 'tsx scripts/verify-learning-pilot-quality.ts' },
  { name: 'Flashcards', cmd: 'tsx scripts/verify-pilot-flashcards.ts' },
  { name: 'Pilot Quiz Compat', cmd: 'tsx scripts/verify-pilot-quizzes.ts' },
  { name: 'Quiz Content Quality', cmd: 'tsx scripts/verify-quiz-quality.ts' },
  { name: 'Pilot Task Compat', cmd: 'tsx scripts/verify-pilot-tasks.ts' },
  { name: 'Video Packages', cmd: 'tsx scripts/verify-video-packages.ts' },
  { name: 'Published Videos', cmd: 'tsx scripts/verify-published-videos.ts', mediaGate: true },
  { name: 'Curriculum Enrich', cmd: 'tsx scripts/verify-curriculum-enrichment.ts' },
  { name: 'Published Content', cmd: 'tsx scripts/verify-published-curriculum.ts' },
  { name: 'Knowledge Expansion', cmd: 'tsx scripts/verify-knowledge-expansion.ts' },
  { name: 'Dig KO v2', cmd: 'tsx scripts/verify-dig-ko-v2.ts' },
  { name: 'Topic Courses', cmd: 'tsx scripts/verify-topic-courses.ts' },
  { name: 'Migration Status', cmd: 'tsx scripts/validate-migrations.ts' },
]

console.log('\n=== PILOT VERIFY (ALL) ===\n')

let failed = 0
let pending = 0
for (const step of steps) {
  process.stdout.write(`${step.name}... `)
  try {
    const output = execSync(`npx ${step.cmd}`, {
      encoding: 'utf8', stdio: 'pipe', cwd: __dirname + '/..',
    })
    if (step.mediaGate && output.includes('MEDIA_RENDER_PENDING')) {
      pending++
      console.log('PENDING (media render)')
    } else {
      console.log('PASS')
    }
  } catch (caught) {
    failed++
    console.log('FAIL')
    const error = caught as { stdout?: Buffer | string; stderr?: Buffer | string }
    const detail = `${error.stdout?.toString() || ''}${error.stderr?.toString() || ''}`.trim()
    if (detail) console.error(detail)
  }
}

console.log(`\n=== DONE: ${steps.length - failed - pending} passed, ${pending} pending, ${failed} failed ===\n`)
if (failed > 0) process.exit(1)
