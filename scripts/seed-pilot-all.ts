import { execSync } from 'child_process'

const steps = [
  { name: 'Pilot Selection', cmd: 'tsx scripts/select-learning-pilot.ts' },
  { name: 'Pilot Enrichment', cmd: 'tsx scripts/enrich-learning-pilot.ts' },
  { name: 'Flashcards', cmd: 'tsx scripts/seed-pilot-flashcards.ts' },
  { name: 'Flashcard Enrichment', cmd: 'tsx scripts/enrich-pilot-flashcards.ts' },
  { name: 'Quizzes',    cmd: 'tsx scripts/seed-pilot-quizzes.ts' },
  { name: 'Quiz Placeholder Repair', cmd: 'tsx scripts/repair-placeholder-quizzes.ts --apply' },
  { name: 'Tasks',      cmd: 'tsx scripts/seed-pilot-tasks.ts' },
  { name: 'Video Packages', cmd: 'tsx scripts/seed-video-production-packages.ts' },
]

console.log('\n=== PILOT SEED (ALL) ===\n')

for (const step of steps) {
  console.log(`\n--- ${step.name} ---`)
  try {
    execSync(`npx ${step.cmd}`, { stdio: 'inherit', cwd: __dirname + '/..' })
    console.log(`  ✓ ${step.name} seeded`)
  } catch (e) {
    console.error(`  ✗ ${step.name} FAILED`)
    process.exit(1)
  }
}

console.log('\n=== ALL SEED COMPLETE ===\n')
