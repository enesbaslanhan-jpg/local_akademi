import { describe, it, expect } from 'vitest';
import { generateSuggestedActions } from './mentorSuggestedActions';

describe('mentorSuggestedActions', () => {
  it('returns empty array if message is not from assistant', () => {
    const actions = generateSuggestedActions({ role: 'user', content: 'test' });
    expect(actions).toEqual([]);
  });

  it('filters out system capabilities and greeting intents', () => {
    expect(generateSuggestedActions({ role: 'assistant', metadata: { intent: 'greeting' } })).toEqual([]);
    expect(generateSuggestedActions({ role: 'assistant', metadata: { intent: 'system_capability' } })).toEqual([]);
  });

  it('returns knowledge route for valid citation', () => {
    const actions = generateSuggestedActions({
      role: 'assistant',
      citations: [{ knowledgeObjectCode: 'VALID-123' }]
    });
    expect(actions).toHaveLength(1);
    expect(actions[0].route).toBe('/app/knowledge/VALID-123');
  });

  it('does not render Karar Kontrolü action (disabled/Yakında filter)', () => {
    const actions = generateSuggestedActions({
      role: 'assistant',
      content: 'Bu bir karar.',
      metadata: { intent: 'decision_support' }
    });
    const decisionAction = actions.find(a => a.id === 'open_decision_check');
    expect(decisionAction).toBeUndefined();
  });

  it('does not render Pratik Kart action (disabled/Yakında filter)', () => {
    const actions = generateSuggestedActions({
      role: 'assistant',
      content: 'Birlikte pratik yapalım.'
    });
    const practiceAction = actions.find(a => a.id === 'open_practical_cards');
    expect(practiceAction).toBeUndefined();
  });

  it('returns finance models route for financial_analysis intent', () => {
    const actions = generateSuggestedActions({
      role: 'assistant',
      metadata: { intent: 'financial_analysis' }
    });
    expect(actions).toHaveLength(1);
    expect(actions[0].route).toBe('/app/finance/models');
  });

  it('returns maximum 2 actions and does not render external URLs', () => {
    // If there is any external URL action, we verify it's filtered.
    // Currently, our allowlist is internal only.
    const actions = generateSuggestedActions({
      role: 'assistant',
      citations: [
        { knowledgeObjectCode: 'VALID-1' },
        { knowledgeObjectCode: 'VALID-2' }
      ],
      metadata: { intent: 'financial_analysis' }
    });
    expect(actions.length).toBeLessThanOrEqual(2);
    actions.forEach(a => {
      expect(a.route.startsWith('/app/')).toBe(true);
    });
  });
});
