import { generateCompletion, GatewayConfigError, GatewayProviderError } from './ai-gateway'

export interface AiChatResult {
  content: string
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface AiChatProvider {
  generate(messages: { role: string; content: string }[], userId?: number, userRole?: string): Promise<AiChatResult>
}

export class RealAiChatProvider implements AiChatProvider {
  async generate(messages: { role: string; content: string }[], userId?: number, userRole?: string): Promise<AiChatResult> {
    const result = await generateCompletion({
      messages: messages as any,
      userId,
      userRole,
    })
    return {
      content: result.content,
      usage: result.usage,
    }
  }
}

export class MockAiChatProvider implements AiChatProvider {
  private response: string

  constructor(response?: string) {
    this.response = response || 'Bu bir mock AI yanıtıdır. Gerçek AI çağrısı yapılmamıştır.'
  }

  async generate(_messages: { role: string; content: string }[], _userId?: number, _userRole?: string): Promise<AiChatResult> {
    return {
      content: this.response,
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }
  }
}

export { GatewayConfigError, GatewayProviderError }
