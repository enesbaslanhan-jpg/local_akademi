import { NEWS_SOURCES } from '../src/config/news-sources.js'
import { createNewsAdapter } from '../src/services/news/adapters.js'

async function main(): Promise<void> {
  const startedAt = Date.now()
  const report: Array<Record<string, unknown>> = []

  for (const source of NEWS_SOURCES) {
    const row: Record<string, unknown> = { source: source.id, name: source.name }
    try {
      const adapter = createNewsAdapter(source)
      const candidates = await adapter.fetchCandidates(source)
      row.fetched = candidates.length
      row.latest = candidates.slice(0, 3).map(candidate => ({
        date: candidate.sourcePublishedAt.toISOString(),
        title: candidate.title.slice(0, 90),
        url: candidate.url,
      }))
    } catch (error) {
      row.error = error instanceof Error ? error.message : String(error)
    }
    report.push(row)
    console.log(JSON.stringify({ event: 'NEWS_SOURCE_SMOKE', ...row }))
  }

  console.log(JSON.stringify({
    event: 'NEWS_SOURCE_SMOKE_SUMMARY',
    elapsedMs: Date.now() - startedAt,
    sources: report.length,
    ok: report.filter(row => !row.error).length,
    failed: report.filter(row => row.error).length,
    errors: report.filter(row => row.error).map(row => ({ source: row.source, error: row.error })),
  }))
}

void main()