import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const published = await prisma.learningVideo.findMany({
    where: { status: 'published' },
    include: { knowledgeObject: { select: { code: true, title: true } } },
  })

  const withPlaybackUrl = published.filter(v => !!v.playbackUrl)
  const withoutPlaybackUrl = published.filter(v => !v.playbackUrl)

  console.log(`Total published videos: ${published.length}`)
  console.log(`With playback URL: ${withPlaybackUrl.length}`)
  console.log(`Without playback URL: ${withoutPlaybackUrl.length}`)

  if (withPlaybackUrl.length > 0) {
    console.log('\nPASS: Published videos with real playback URLs:')
    for (const v of withPlaybackUrl) {
      console.log(`  ${v.knowledgeObject.code}: ${v.playbackUrl}`)
    }
  }

  if (withoutPlaybackUrl.length > 0) {
    console.log('\nMEDIA_RENDER_PENDING: These videos are published but have no playback URL:')
    for (const v of withoutPlaybackUrl) {
      console.log(`  ${v.knowledgeObject.code} (KO#${v.koId}) — ${v.knowledgeObject.title}`)
    }
    console.log(`\nTotal affected KOs: ${withoutPlaybackUrl.length}`)
    console.log('Status: Media render pending. No real MP4 has been produced yet.')
  }

  if (published.length === 0) {
    console.log('\nMEDIA_RENDER_PENDING: No videos have been published yet.')
    console.log('All 30 video packages are in script_ready status awaiting media production.')
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
