/**
 * Deterministik suggested actions allowlist for Phase 7.4B
 */

const ALLOWED_INTERNAL_ROUTES = [
  '/app/finance/models/',
  '/app/settings',
  '/app/decision-checks/',
  '/app/practical-cards/'
];



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

  /*
   * ATIF TABANLI EYLEM KALDIRILDI.
   *
   * Eskiden ilk gecerli atif icin "ilgili icerigi ac" eylemi uretiliyor
   * ve `/app/knowledge/:code` sayfasina goturuyordu. Bilgi Kutuphanesi
   * urun sahibi kararyla kaldirildi (03.09.2026); o rota artik yok.
   * Eylemi birakmak kullaniciyi olu bir baglantiya gonderirdi.
   *
   * Atiflar hala GORUNUYOR (CitationBadge) -- yalniz tiklanmiyorlar.
   */
  // 2. Intent tabanli actions
  if (message.metadata?.intent === 'financial_analysis') {
    // Model routing - varsayalım intent'ten veya metadata'dan modelCode gelseydi:
    // Fakat elimizde kesin modelCode yoksa genel model kütüphanesine yönlendirebiliriz.
    addAction({
      id: 'open_financial_models',
      type: 'open_financial_models',
      labelKey: 'suggestedActions.openFinancialModels',
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
      labelKey: 'suggestedActions.updateBusinessProfile',
      route: '/app/settings',
      source: 'intent',
      disabled: false
    });
  }

  return actions;
}
