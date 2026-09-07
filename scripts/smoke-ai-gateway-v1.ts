// One benign request per configured provider, no router retries or reviewer calls.
import { GeminiProvider, OpenAICompatibleProvider } from '../src/services/ai-provider-registry'
import { getProviderConfig } from '../src/services/ai-gateway'
import { ProviderFailure } from '../src/services/provider-router'

async function main() {
  const configuredTimeout = Number(process.env.AI_SMOKE_TIMEOUT_MS || 10000)
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(60000, Math.max(1000, configuredTimeout))
    : 10000
  const requested = process.argv.slice(2)
  const providers = requested.length ? requested : ['gemini','nvidia','omniroute','openai','deepseek']
  for (const id of providers) {
    if (!['gemini','nvidia','omniroute','openai','deepseek'].includes(id)) { console.log(`${id}: SKIP (unknown provider)`); continue }
    if (!process.env[`${id.toUpperCase()}_API_KEY`]) { console.log(`${id}: SKIP (no key)`); continue }
    if (['gemini','nvidia','openai','deepseek'].includes(id) && process.env.AI_ALLOW_EXTERNAL_PROVIDERS !== 'true') { console.log(`${id}: SKIP (external policy disabled)`); continue }
    let model = process.env[`${id.toUpperCase()}_MODEL`] || ''
    if (id !== 'gemini') { try { model = getProviderConfig({provider:id}).model } catch { console.log(`${id}: SKIP (configuration unavailable)`); continue } }
    if (!model) { console.log(`${id}: SKIP (model missing)`); continue }
    const provider = id === 'gemini' ? new GeminiProvider() : new OpenAICompatibleProvider(id,getProviderConfig,(messages,c) => ({model:c.model,messages,max_tokens:256,stream:false}))
    try {
      await provider.generate([{role:'user',content:'Reply with OK.'}],{providerId:id,model,priority:0,enabled:true,timeoutMs,maxRetries:0},AbortSignal.timeout(timeoutMs),{maxOutputTokens:256})
      console.log(`${id}: PASS`)
    } catch (error) { console.log(`${id}: FAIL (${error instanceof ProviderFailure ? error.code : 'NETWORK_OR_TIMEOUT'})`) }
  }
}
main().catch(() => { console.log('Smoke failed without exposing error details'); process.exitCode = 1 })
