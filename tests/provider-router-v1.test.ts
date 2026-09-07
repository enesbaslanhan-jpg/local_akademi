import { describe, it, expect, vi, afterEach } from 'vitest'
import { ProviderRegistry, ProviderRouter, ProviderFailure, UNAVAILABLE, type Candidate } from '../src/services/provider-router'
import { GeminiProvider, OpenAICompatibleProvider, resolveCandidates } from '../src/services/ai-provider-registry'
import { maskChatMessages, redactProviderContext } from '../src/services/sensitive-data-masker'

const messages = [{ role: 'user' as const, content: 'Explain the existing result.' }]
const result = { content: 'Existing result explained.', provider: 'a', model: 'test', usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } }
const candidate = (id: string, extra: Partial<Candidate> = {}): Candidate => ({ providerId: id, model: 'test', priority: id.charCodeAt(0), enabled: true, timeoutMs: 100, maxRetries: 1, ...extra })
function setup(a = vi.fn().mockResolvedValue(result), b = vi.fn().mockResolvedValue(result)) {
  let now = 1000
  const deps = { now: () => now, random: () => 0, sleep: vi.fn().mockResolvedValue(undefined), record: vi.fn() }
  const registry = new ProviderRegistry().register({ id: 'a', supportsStreaming: false, generate: a }).register({ id: 'b', supportsStreaming: false, generate: b })
  const router = new ProviderRouter(registry, deps)
  return { router, registry, a, b, deps, advance: (ms: number) => { now += ms }, run: (cs = [candidate('a'), candidate('b')]) => router.generate(messages, cs, 'MENTOR_STANDARD') }
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers() })
describe('ProviderRouter v1 deterministic failover', () => {
  it('primary success does not call secondary', async () => { const s = setup(); await s.run(); expect(s.b).not.toHaveBeenCalled() })
  it.each(['RATE_LIMITED', 'SERVER_ERROR'])('%s retries with backoff then fails over', async code => {
    const s = setup(vi.fn().mockRejectedValue(new ProviderFailure(code, code === 'RATE_LIMITED' ? 429 : 500)))
    await s.run(); expect(s.a).toHaveBeenCalledTimes(2); expect(s.b).toHaveBeenCalledTimes(1); expect(s.deps.sleep).toHaveBeenCalledWith(250, undefined)
  })
  it('deadline covers a hung provider, aborts it, then falls back', async () => {
    vi.useFakeTimers(); let signal: AbortSignal | undefined
    const s = setup(vi.fn().mockImplementation((_m,_c, abort) => { signal = abort; return new Promise(() => {}) }))
    const p = s.run([candidate('a', { maxRetries: 0 }), candidate('b')]); await vi.advanceTimersByTimeAsync(101)
    await p; expect(signal?.aborted).toBe(true); expect(s.b).toHaveBeenCalledTimes(1)
  })
  it('auth/config error opens immediately without retry', async () => {
    const s = setup(vi.fn().mockRejectedValue(new ProviderFailure('CONFIG',401))); await s.run()
    expect(s.a).toHaveBeenCalledTimes(1); expect(s.router.snapshot([candidate('a')])[0]).toMatchObject({ status: 'OPEN', configError: true })
  })
  it('both fail then next fallback succeeds', async () => {
    const s = setup(vi.fn().mockRejectedValue(new ProviderFailure('SERVER_ERROR')), vi.fn().mockRejectedValue(new ProviderFailure('SERVER_ERROR')))
    const third = vi.fn().mockResolvedValue(result); s.registry.register({ id: 'nvidia', supportsStreaming: false, generate: third })
    await s.run([candidate('a'),candidate('b'),candidate('nvidia')]); expect(third).toHaveBeenCalledOnce()
  })
  it('all fail exposes only stable unavailable code', async () => {
    const s = setup(vi.fn().mockRejectedValue(new Error('secret-provider-body')),vi.fn().mockRejectedValue(new ProviderFailure('SERVER_ERROR')))
    await expect(s.run()).rejects.toThrow(UNAVAILABLE)
    expect(JSON.stringify(s.deps.record.mock.calls)).not.toContain('secret-provider-body')
    expect(JSON.stringify(s.deps.record.mock.calls)).not.toContain(messages[0].content)
  })
  it('open circuit skips and cooldown allows one half-open probe with success reset', async () => {
    const s = setup(vi.fn().mockRejectedValue(new ProviderFailure('CONFIG'))); await s.run(); await s.run()
    expect(s.a).toHaveBeenCalledTimes(1); s.advance(30001); s.a.mockResolvedValue(result); await s.run()
    expect(s.a).toHaveBeenCalledTimes(2); expect(s.router.snapshot([candidate('a')])[0]).toMatchObject({ status: 'HEALTHY', circuit: 'CLOSED', consecutiveFailures: 0 })
  })
  it('never retries infinitely even with unbounded caller configuration', async () => {
    const s = setup(vi.fn().mockRejectedValue(new ProviderFailure('NETWORK')))
    await s.run([candidate('a',{maxRetries:100000}),candidate('b')]); expect(s.a.mock.calls.length).toBeLessThanOrEqual(4)
  })
  it.each(['INVALID_REQUEST','SAFETY'])('%s never evades refusal through failover', async code => {
    const s = setup(vi.fn().mockRejectedValue(new ProviderFailure(code))); await expect(s.run()).rejects.toThrow(UNAVAILABLE); expect(s.b).not.toHaveBeenCalled()
    expect(s.router.snapshot([candidate('a')])[0].consecutiveFailures).toBe(0)
  })
  it('long retry-after cools down immediately', async () => {
    const s = setup(vi.fn().mockRejectedValue(new ProviderFailure('RATE_LIMITED',429,60000))); await s.run()
    expect(s.a).toHaveBeenCalledOnce(); expect(s.deps.sleep).not.toHaveBeenCalled(); expect(s.router.snapshot([candidate('a')])[0].cooldownUntil).toBe(61000)
  })
  it('disabled candidate is skipped', async () => { const s = setup(); await s.run([candidate('a',{enabled:false}),candidate('b')]); expect(s.a).not.toHaveBeenCalled() })
  it('cancellation neither fails over nor damages provider health', async () => {
    const s = setup(); const abort = new AbortController(); abort.abort()
    await expect(s.router.generate(messages,[candidate('a')],'MENTOR_STANDARD',{},abort.signal)).rejects.toThrow('ABORTED')
    expect(s.a).not.toHaveBeenCalled(); expect(s.router.snapshot([candidate('a')])[0].consecutiveFailures).toBe(0)
  })
  it('profile mapping and reasoning capability are explicit', async () => {
    const cs = [candidate('a',{supportsReasoning:false}),candidate('b',{supportsReasoning:true})]
    const s = setup(); await s.router.generate(messages,cs,'MENTOR_REASONING'); expect(s.a).not.toHaveBeenCalled()
    vi.stubEnv('AI_PROVIDER_CANDIDATES_JSON',JSON.stringify({MENTOR_FAST:[{...candidate('nvidia'),model:'test-fast'}]}))
    expect(resolveCandidates(() => { throw new Error() }, 'MENTOR_FAST')[0].model).toBe('test-fast')
  })
  it('rejects malformed registry rather than silently routing elsewhere', () => {
    vi.stubEnv('AI_PROVIDER_CANDIDATES_JSON','{"MENTOR_STANDARD":[{"apiKey":"placeholder"}]}')
    expect(() => resolveCandidates(() => { throw new Error() },'MENTOR_STANDARD')).toThrow('CONFIG')
  })
})
describe('privacy and adapters', () => {
  it('removes customer PII and raw orders without changing deterministic values', () => {
    const calculation = { revenue: 1234.56, grossMargin: 18.25, pendingShipmentCount: 7 }
    const redacted = redactProviderContext({customer:{fullName:'Ada Example',email:'ada@example.com',address:'street 42'},rawOrder:{id:42},calculation}) as any
    expect(redacted.calculation).toEqual(calculation); expect(JSON.stringify(redacted)).not.toContain('Ada'); expect(redacted.rawOrder).toBe('***masked***')
    const masked = maskChatMessages([{role:'user',content:'Müşteri: Ada Example; email ada@example.com; telefon 0555 123 45 67; adres: Example Street'}])[0].content
    for (const value of ['Ada Example','ada@example.com','0555','Example Street']) expect(masked).not.toContain(value)
  })
  it('Gemini sends official roles/header/system instruction and normalizes usage', async () => {
    vi.stubEnv('GEMINI_API_KEY','test-only'); vi.stubEnv('AI_ALLOW_EXTERNAL_PROVIDERS','true')
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({candidates:[{content:{parts:[{text:'hidden',thought:true},{text:'answer'}]}}],usageMetadata:{promptTokenCount:2,candidatesTokenCount:3,totalTokenCount:5}})))
    vi.stubGlobal('fetch',fetch)
    const response = await new GeminiProvider().generate([{role:'system',content:'rules'},...messages,{role:'assistant',content:'prior'}],candidate('gemini'),new AbortController().signal,{})
    expect(response.content).toBe('answer'); expect(response.usage.total_tokens).toBe(5)
    expect(fetch.mock.calls[0][0]).not.toContain('test-only')
    const body = JSON.parse(fetch.mock.calls[0][1].body); expect(body.systemInstruction.parts[0].text).toBe('rules'); expect(body.contents[1].role).toBe('model')
  })
  it('OpenAI compatible errors discard provider bodies', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('private payload secret',{status:401})))
    const provider = new OpenAICompatibleProvider('nvidia',()=>({provider:'nvidia',apiUrl:'https://example.com/v1/chat/completions',apiKey:'test-only',model:'test',timeout:10,maxTokens:10}),()=>({messages}))
    await expect(provider.generate(messages,candidate('nvidia'),new AbortController().signal,{})).rejects.toMatchObject({code:'CONFIG',status:401,message:'CONFIG'})
  })
  it('classifies explicit invalid-model metadata as configuration, not a bad prompt', async () => {
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{param:'model',message:'private upstream body'}}),{status:400})))
    const provider = new OpenAICompatibleProvider('nvidia',()=>({provider:'nvidia',apiUrl:'https://example.com/v1/chat/completions',model:'test',timeout:10,maxTokens:10}),()=>({messages}))
    await expect(provider.generate(messages,candidate('nvidia'),new AbortController().signal,{})).rejects.toMatchObject({code:'CONFIG',status:400,message:'CONFIG'})
  })
})
