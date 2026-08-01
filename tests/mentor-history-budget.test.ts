import { describe, it, expect } from 'vitest'
import { applyHistoryBudget, isDisposableHistoryMessage } from '../src/services/mentor-history-budget'
import type { ChatMessage } from '../src/services/ai-provider'

describe('Mentor History Budget', () => {
  it('geçmiş mesaj sayısı profile göre sınırlanır', () => {
    const messages: ChatMessage[] = Array(20).fill({ role: 'user', content: 'test' })
    const budgeted = applyHistoryBudget(messages, 'business_knowledge')
    expect(budgeted.length).toBeLessThan(20)
  })

  it('eski disclaimer metinleri temizlenir', () => {
    const messages: ChatMessage[] = [{ role: 'assistant', content: 'Cevap oldukça uzun bir cümledir ve 30 karakteri geçmektedir.\n\n---\nBu bilgi genel bilgilendirme niteliği taşımaz.' }]
    const budgeted = applyHistoryBudget(messages, 'business_knowledge')
    expect(budgeted[0].content).not.toContain('Bu bilgi genel')
  })

  it('eski Kaynaklar/citation blokları temizlenir', () => {
    const messages: ChatMessage[] = [{ role: 'assistant', content: 'Cevap oldukça uzun bir cümledir ve 30 karakteri geçmektedir.\n\n---\nKaynaklar:\n- A' }]
    const budgeted = applyHistoryBudget(messages, 'business_knowledge')
    expect(budgeted[0].content).not.toContain('Kaynaklar:')
  })

  it('deterministik greeting mesajları gereksiz history tüketmez', () => {
    const messages: ChatMessage[] = [{ role: 'assistant', content: 'Merhaba, nasıl yardımcı olabilirim?' }]
    const budgeted = applyHistoryBudget(messages, 'business_knowledge')
    expect(budgeted.length).toBe(0)
  })

  it('boş geçmiş güvenli çalışır', () => {
    const budgeted = applyHistoryBudget([], 'business_knowledge')
    expect(budgeted.length).toBe(0)
  })
  
  it('conversation rewrite ilgili önceki assistant cevabını korur', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Q1' },
      { role: 'assistant', content: 'A1' }
    ]
    const budgeted = applyHistoryBudget(messages, 'conversation_control', { userMessage: 'Daha kısa' })
    expect(budgeted.length).toBe(2)
    expect(budgeted[0].content).toBe('A1')
    expect(budgeted[1].content).toBe('Daha kısa')
  })

  it('kullanıcının son kullanıcı düzeltme talimatı korunur', () => {
    const messages: ChatMessage[] = [
      { role: 'assistant', content: 'A1' }
    ]
    const budgeted = applyHistoryBudget(messages, 'business_knowledge', { userMessage: 'Teşekkürler', preserveUserInstruction: true })
    expect(budgeted[budgeted.length - 1].role).toBe('user')
    expect(budgeted[budgeted.length - 1].content).toBe('Teşekkürler')
  })
})
