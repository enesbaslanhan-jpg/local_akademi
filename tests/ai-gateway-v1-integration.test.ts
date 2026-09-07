import { describe, it, expect, vi, afterEach } from 'vitest'
import Fastify from 'fastify'
import { generateCompletion, generateStream } from '../src/services/ai-gateway'
import { adminRoutes } from '../src/services/admin'
import { UNAVAILABLE } from '../src/services/provider-router'

function env() {
  vi.stubEnv('AI_GATEWAY_ENABLED','true'); vi.stubEnv('AI_ALLOW_EXTERNAL_PROVIDERS','true')
  vi.stubEnv('AI_REVIEWER_ENABLED','false'); vi.stubEnv('AI_REVIEW_GATE_ENABLED','false')
  vi.stubEnv('NVIDIA_API_KEY','test-only'); vi.stubEnv('OPENAI_API_KEY','test-only')
  vi.stubEnv('AI_MENTOR_PROFILE','MENTOR_STANDARD')
  vi.stubEnv('AI_PROVIDER_CANDIDATES_JSON', JSON.stringify({ MENTOR_STANDARD: ['nvidia','openai'].map((providerId,priority) => ({providerId,model:`integration-${++sequence}`,priority,timeoutMs:100,maxRetries:0})) }))
}
let sequence = 0
const response = () => new Response(JSON.stringify({choices:[{message:{content:'Explanation of the existing result: 1234.56.'}}],usage:{prompt_tokens:1,completion_tokens:2,total_tokens:3}}))
const req = { messages: [{role:'user' as const,content:'Customer name: Ada Example; Revenue: 1234.56'}], knowledgeObjects:[{id:1,title:'Source',code:'SRC',category:null}],skipOutputReview:true }
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })
describe('gateway v1 preserves endpoint contracts', () => {
  it('completion fails over before review, retains usage and citations, forces masking', async () => {
    env(); const fetch = vi.fn().mockResolvedValueOnce(new Response('secret echo',{status:500})).mockResolvedValueOnce(response()); vi.stubGlobal('fetch',fetch)
    const result = await generateCompletion({...req,skipMasking:true})
    expect(result.provider).toBe('openai'); expect(result.citations).toEqual(req.knowledgeObjects); expect(result.usage.total_tokens).toBe(3)
    expect(fetch.mock.calls[1][1].body).not.toContain('Ada Example'); expect(fetch.mock.calls[1][1].body).toContain('1234.56')
  })
  it('buffered streaming emits only the successful fallback, then done', async () => {
    env(); vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response('partial body',{status:500})).mockResolvedValueOnce(response()))
    const events = []; for await (const e of generateStream(req)) events.push(e)
    expect(events.map(e=>e.type)).toEqual(['provider','delta','done']); expect(events[0]).toMatchObject({provider:'openai'})
    expect(JSON.stringify(events)).not.toContain('partial body')
  })
  it('truncated primary response is never mixed with fallback', async () => {
    env(); vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response('{"choices":[{"message":{"content":"partial')).mockResolvedValueOnce(response()))
    const events = []; for await (const e of generateStream(req)) events.push(e)
    expect(events.filter(e=>e.type==='delta')).toHaveLength(1); expect(JSON.stringify(events)).not.toContain('partial')
  })
  it('all failures emit only the safe localized error', async () => {
    env(); vi.stubGlobal('fetch',vi.fn().mockImplementation(() => Promise.resolve(new Response('private key echo',{status:401}))))
    const events = []; for await (const e of generateStream(req)) events.push(e)
    expect(events).toEqual([{type:'error',code:UNAVAILABLE,message:'AI Mentor şu anda yanıt veremiyor. Birkaç dakika sonra tekrar deneyebilirsin.'}])
  })
  it('timeout remains active while reading a stalled response body', async () => {
    env(); vi.useFakeTimers()
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(new ReadableStream({ start() {} }))).mockResolvedValueOnce(response()))
    const pending = generateCompletion(req); await vi.advanceTimersByTimeAsync(101)
    expect((await pending).provider).toBe('openai')
  })
  it('abort produces cancelled stream with no fallback', async () => {
    env(); const fetch = vi.fn(); vi.stubGlobal('fetch',fetch); const controller = new AbortController(); controller.abort()
    const events = []; for await (const e of generateStream({...req,abortSignal:controller.signal})) events.push(e)
    expect(events[0]).toMatchObject({code:'STREAM_ABORTED'}); expect(fetch).not.toHaveBeenCalled()
  })
  it('admin health requires authentication and admin role; excludes model/key/URL', async () => {
    env(); const app = Fastify()
    app.decorate('authenticate',async (request: any, reply: any) => {
      if (!request.headers.authorization) return reply.status(401).send({error:'Unauthorized'})
      request.user = {role: request.headers.authorization}
    })
    await app.register(adminRoutes,{prefix:'/admin'})
    try {
      expect((await app.inject('/admin/ai-gateway/health')).statusCode).toBe(401)
      expect((await app.inject({url:'/admin/ai-gateway/health',headers:{authorization:'user'}})).statusCode).toBe(403)
      const r = await app.inject({url:'/admin/ai-gateway/health',headers:{authorization:'admin'}})
      expect(r.statusCode).toBe(200); expect(r.json().providers).toHaveLength(2)
      for (const value of ['test-only','apiKey','model','https:']) expect(r.body).not.toContain(value)
    } finally { await app.close() }
  })
})
