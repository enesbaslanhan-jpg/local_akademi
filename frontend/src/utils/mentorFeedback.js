/**
 * Phase 7.4B feedback sistemi frontend-only ve tarayıcıya özgüdür.
 * Merkezi ürün analitiği veya kalıcı backend feedback kaydı değildir.
 */

const STORAGE_PREFIX = 'mentor_feedback:';

function getSafeUserScope(user) {
  if (user && user.id) {
    return `usr_${user.id}`;
  }
  return 'session_anon';
}

function getStorageKey(user, messageId) {
  const scope = getSafeUserScope(user);
  return `${STORAGE_PREFIX}${scope}:${messageId}`;
}

export function saveMentorFeedback(user, messageId, feedbackValue) {
  if (!messageId || !feedbackValue) return false;
  
  if (feedbackValue !== 'helpful' && feedbackValue !== 'not_helpful') {
    return false;
  }

  try {
    const key = getStorageKey(user, messageId);
    
    // YALNIZ messageId, feedbackValue saklanır. 
    // Cevap metni, kullanıcı girdisi, KO içeriği KESİNLİKLE saklanmaz.
    const payload = {
      messageId,
      feedbackValue,
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (error) {
    // localStorage kapalı, gizli mod veya kota aşımı durumunda çökmemeli
    console.warn('Feedback could not be saved to local storage.', error);
    return false;
  }
}

export function getMentorFeedback(user, messageId) {
  if (!messageId) return null;
  
  try {
    const key = getStorageKey(user, messageId);
    const item = localStorage.getItem(key);
    if (!item) return null;
    
    const parsed = JSON.parse(item);
    return parsed.feedbackValue || null;
  } catch (error) {
    return null;
  }
}
