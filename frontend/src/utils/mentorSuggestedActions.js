/**
 * Deterministik suggested actions allowlist for Phase 7.4B
 */

const ALLOWED_INTERNAL_ROUTES = [
  '/app/knowledge/',
  '/app/finance/models/',
  '/app/settings',
  '/app/quiz/take/',
  '/app/flashcards/study/'
];

function isValidKOCode(code) {
  if (typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (trimmed.length === 0) return false;
  // Sadece harf, rakam, tire ve alt çizgiye izin ver.
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

function getSafeKnowledgeRoute(code) {
  if (!isValidKOCode(code)) return null;
  return `/app/knowledge/${encodeURIComponent(code.trim())}`;
}

export function generateSuggestedActions(message) {
  if (!message) return [];
  if (message.role !== 'assistant') return [];
  // system capabilities veya greeting durumunda action gösterme
  if (message.metadata?.intent === 'greeting' || message.metadata?.intent === 'system_capability') return [];
  if (message.content && (message.content.includes('Merhaba') && message.content.length < 50)) return []; // extra safety

  const actions = [];
  const addedIds = new Set();
  
  function addAction(action) {
    if (actions.length >= 2) return;
    if (addedIds.has(action.id)) return;
    actions.push(action);
    addedIds.add(action.id);
  }

  // 1. Citation (Kaynak) Action
  if (message.citations && Array.isArray(message.citations) && message.citations.length > 0) {
    // Ilk gecerli citation
    const validCitation = message.citations.find(c => isValidKOCode(c.knowledgeObjectCode));
    if (validCitation) {
      addAction({
        id: `open_knowledge_${validCitation.knowledgeObjectCode}`,
        type: 'open_knowledge',
        label: 'İlgili İçeriği Aç',
        route: getSafeKnowledgeRoute(validCitation.knowledgeObjectCode),
        source: 'citation',
        disabled: false
      });
    }
  }

  // 2. Intent tabanli actions
  if (message.metadata?.intent === 'financial_analysis') {
    // Model routing - varsayalım intent'ten veya metadata'dan modelCode gelseydi:
    // Fakat elimizde kesin modelCode yoksa genel model kütüphanesine yönlendirebiliriz.
    addAction({
      id: 'open_financial_models',
      type: 'open_financial_models',
      label: 'Finansal Modelleri Aç',
      route: '/app/finance/models',
      source: 'intent',
      disabled: false
    });
  }
  
  if (message.metadata?.intent === 'business_planning') {
    // Profil / işletme bilgileri eksik olabilir
    addAction({
      id: 'open_business_profile',
      type: 'open_business_profile',
      label: 'İşletme Bilgilerini Güncelle',
      route: '/app/settings',
      source: 'intent',
      disabled: false
    });
  }

  return actions;
}
