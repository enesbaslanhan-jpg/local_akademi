const API_URL = import.meta.env.VITE_API_URL || '';
export const RATE_LIMIT_EVENT = 'localkarar:rate-limit';
export const RATE_LIMIT_MESSAGE = 'Çok kısa sürede fazla istek gönderildi. Birkaç saniye sonra tekrar deneyin.';

export function retryAfterSaniyesi(headers) {
  const raw = headers?.get?.('retry-after');
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds);
  const dateMs = Date.parse(raw);
  if (!Number.isFinite(dateMs)) return null;
  return Math.max(0, Math.ceil((dateMs - Date.now()) / 1000));
}

function hizSiniriniBildir(retryAfterSeconds) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(RATE_LIMIT_EVENT, {
    detail: { message: RATE_LIMIT_MESSAGE, retryAfterSeconds }
  }));
}

const getHeaders = (includeAuth = true) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token && includeAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/*
 * OTURUM YENILEME
 *
 * Erisim tokeni 8 saat gecerli ve eskiden yenilenmiyordu: suresi dolan
 * kullanici sessizce disari atiliyordu. Artik 401 alinca bir kez
 * yenileme denenip istek TEKRARLANIYOR.
 *
 * TEK UCUS (single flight): sayfa acilisinda birden cok istek ayni anda
 * 401 alabiliyor. Her biri ayri yenileme baslatsaydi, ilki tokeni
 * harcadigi icin digerleri "tekrar kullanim" sayilir ve sunucu AILEYI
 * IPTAL EDERDI - yani otomatik yenileme, kullaniciyi atmanin yeni bir
 * yolu olurdu. Bu yuzden ayni anda yalniz BIR yenileme ucusu var,
 * digerleri onu bekliyor.
 */
const REFRESH_KEY = 'refreshToken';

/* Yenilemenin UYGULANMAYACAGI yollar: kimlik akisinin kendisi. Bunlarda
   401 gercekten "kimlik dogrulanamadi" demek, "token eskidi" degil. */
const YENILEME_DISI = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
  '/auth/password-reset'
];

let yenilemeUcusu = null;
const devamEdenGetIstekleri = new Map();

export function oturumTokenleriniYaz(token, refreshToken) {
  if (token) localStorage.setItem('token', token);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function oturumTokenleriniSil() {
  localStorage.removeItem('token');
  localStorage.removeItem(REFRESH_KEY);
}

async function tokenYenile() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return false;

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  if (!response.ok) {
    oturumTokenleriniSil();
    return false;
  }
  const data = await response.json().catch(() => null);
  if (!data?.token) {
    oturumTokenleriniSil();
    return false;
  }
  oturumTokenleriniYaz(data.token, data.refreshToken);
  return true;
}

function yenilemeyiPaylas() {
  if (!yenilemeUcusu) {
    yenilemeUcusu = tokenYenile().finally(() => { yenilemeUcusu = null; });
  }
  return yenilemeUcusu;
}

export class ApiError extends Error {
  constructor(message, status, data, retryAfterSeconds = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.retryAfterSeconds = retryAfterSeconds;
  }
};

function parseSSEChunk(buffer) {
  const events = [];
  const lines = buffer.split('\n');
  const leftover = lines.pop() || '';
  let currentEvent = '';
  let currentData = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      currentData = line.slice(6).trim();
    } else if (line === '') {
      if (currentEvent && currentData) {
        try {
          events.push({ event: currentEvent, data: JSON.parse(currentData) });
        } catch { }
      }
      currentEvent = '';
      currentData = '';
    }
  }

  return { events, leftover };
}

async function streamSSE({ url, method, body, signal, onStart, onProvider, onDelta, onDone, onCancelled, onError }) {
  const token = localStorage.getItem('token');
  if (!token) {
    if (onError) onError({ code: 'AUTH_ERROR', message: 'Oturum bulunamadı' });
    return;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${url}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body,
      signal
    });
  } catch (err) {
    if (err.name === 'AbortError') return;
    if (onError) onError({ code: 'NETWORK_ERROR', message: 'Bağlantı hatası' });
    return;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 429) {
      const retryAfterSeconds = retryAfterSaniyesi(response.headers);
      hizSiniriniBildir(retryAfterSeconds);
      if (onError) onError({ code: 'RATE_LIMITED', message: RATE_LIMIT_MESSAGE, retryAfterSeconds });
      return;
    }
    if (onError) onError({ code: 'API_ERROR', message: data?.error?.message || data?.error || 'Hata oluştu' });
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    if (onError) onError({ code: 'NO_BODY', message: 'Yanıt alınamadı' });
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const { events, leftover } = parseSSEChunk(buffer);
      buffer = leftover;

      for (const { event, data } of events) {
        switch (event) {
          case 'start':
            if (onStart) onStart(data);
            break;
          case 'provider':
            if (onProvider) onProvider(data);
            break;
          case 'delta':
            if (onDelta) onDelta(data);
            break;
          case 'done':
            if (onDone) onDone(data);
            break;
          case 'cancelled':
            if (onCancelled) onCancelled(data);
            break;
          case 'error':
            if (onError) onError(data.error);
            break;
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    if (onError) onError({ code: 'STREAM_ERROR', message: 'Akış hatası' });
  } finally {
    reader.releaseLock();
  }
}

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v);
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const api = {
  async request(path, options = {}, includeAuth = true, tekrarMi = false, tekUcusMu = false) {
    const method = String(options.method || 'GET').toUpperCase();
    /* React StrictMode geliştirmede effect'leri iki kez çalıştırabilir; hızlı
       rota geçişleri de aynı üst-seviye veriyi eşzamanlı isteyebilir. Yalnız
       devam eden, gövdesiz GET'ler birleştirilir; sonuç önbelleğe alınmaz. */
    if (method === 'GET' && !options.signal && !tekUcusMu) {
      const tokenKey = includeAuth ? (localStorage.getItem('token') || '') : 'public';
      const key = `${tokenKey}\n${path}`;
      const existing = devamEdenGetIstekleri.get(key);
      if (existing) return existing;
      const request = api.request(path, options, includeAuth, tekrarMi, true);
      devamEdenGetIstekleri.set(key, request);
      void request.then(
        () => devamEdenGetIstekleri.delete(key),
        () => devamEdenGetIstekleri.delete(key)
      );
      return request;
    }
    const headers = { ...getHeaders(includeAuth), ...options.headers };
    if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
      delete headers['Content-Type'];
    }
    /*
     * GOVDE YOKSA CONTENT-TYPE DA YOK.
     *
     * getHeaders her istege 'Content-Type: application/json' koyuyordu.
     * Govdesiz bir POST/PATCH/DELETE'te bu, Fastify'in JSON ayristiricisini
     * tetikliyor ve istek daha ROTAYA VARMADAN 400 ile reddediliyor:
     * "Body cannot be empty when content-type is set to 'application/json'".
     *
     * Hata sessiz: arayuz "Islem basarisiz" diyor, rota hic calismadigi
     * icin sunucu tarafinda da iz kalmiyor. Olculdu (20.08.2026) - bu
     * yuzden su uc noktalar arayuzden HIC calismiyordu: sohbet arsivleme
     * ve geri alma, mentor hafizasi itiraz ve dogrulama, degerlendirme
     * yeniden baslatma, anket sifirlama, eski profil esitleme.
     *
     * Daha once bu, TEK bir cagri yerinde bos nesne gondererek yamanmisti;
     * kok sebep durdugu icin digerleri kirik kaldi. Duzeltme artik burada.
     */
    if (options.body === undefined || options.body === null) {
      delete headers['Content-Type'];
    }
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });

    const rawContentType = response.headers?.get ? response.headers.get('content-type') : '';
    const contentType = typeof rawContentType === 'string' ? rawContentType : '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      const data = isJson ? await response.json().catch(() => ({})) : {};
      const retryAfterSeconds = response.status === 429 ? retryAfterSaniyesi(response.headers) : null;
      const message = response.status === 429
        ? RATE_LIMIT_MESSAGE
        : data.error || data.message || 'İşlem başarısız';
      const error = new ApiError(message, response.status, data, retryAfterSeconds);
      if (response.status === 429) hizSiniriniBildir(retryAfterSeconds);
      if (response.status === 401 && includeAuth && !tekrarMi && !YENILEME_DISI.some(y => path.startsWith(y))) {
        /* FormData govdesi tek kullanimlik bir akis; tekrarlanamaz. */
        const govdeTekrarlanabilir = !(typeof FormData !== 'undefined' && options.body instanceof FormData);
        if (govdeTekrarlanabilir && await yenilemeyiPaylas()) {
          return api.request(path, options, includeAuth, true, true);
        }
        oturumTokenleriniSil();
      }
      throw error;
    }

    if (response.status === 204 || !response.body) {
      return {};
    }

    if (!isJson) {
      throw new ApiError(
        'API sunucusuna ulaşılamadı veya beklenmeyen bir yanıt alındı.',
        response.status,
        {}
      );
    }

    const data = await response.json().catch(() => {
      throw new ApiError('API yanıtı işlenemedi.', response.status, {});
    });
    return data;
  },

  system: {
    async health() {
      return api.request('/health', {}, false);
    }
  },

  auth: {
    async login(email, password) {
      return api.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
    },
    /* `acceptedLegal`: sunucu onaysız kaydı reddeder (bkz. auth.ts).
       Arayüzdeki kutu tek başına yeterli değil — uç nokta doğrudan da
       çağrılabilir. */
    async register(email, password, name, acceptedLegal = false) {
      return api.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, acceptedLegal })
      }, false);
    },
    async getLegalDocuments() {
      return api.request('/auth/legal-documents', {}, false);
    },
    /*
     * İletişim formu. `includeAuth` KAPALI değil: giriş yapmışsa hesap
     * bilgisi mesaja eklensin diye token gönderiliyor, ama uç nokta
     * girişi zorunlu tutmuyor — hesabına erişemeyen kullanıcı da
     * yazabilmeli, zaten en sık destek sebebi budur.
     */
    async destekTalebi(govde) {
      return api.request('/support/contact', {
        method: 'POST',
        body: JSON.stringify(govde)
      });
    },
    async getConsents() {
      return api.request('/auth/consents');
    },
    async acceptConsents() {
      return api.request('/auth/consents', { method: 'POST', body: JSON.stringify({}) });
    },
    async me() {
      return api.request('/auth/me');
    },
    async changePassword(currentPassword, newPassword) {
      return api.request('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
    },
    /* Tum cihazlardaki oturumlari kapatir; cagirana taze token doner. */
    async logoutAll() {
      return api.request('/auth/logout-all', { method: 'POST' });
    },
    /* Yalniz BU cihazin oturumunu kapatir. Kimlik dogrulama istemez:
       suresi dolmus erisim tokeniyle de cikilabilmeli. */
    async logout(refreshToken) {
      return api.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken })
      }, false);
    },
    /* Sifre sifirlama istegi. Sunucu KAYITLI OLMAYAN adres icin de 200
       doner (e-posta sayimini engellemek icin) - arayuz de ayni mesaji
       gostermeli, "boyle bir kullanici yok" DEMEMELI. */
    async requestPasswordReset(email) {
      return api.request('/auth/password-reset/request', {
        method: 'POST', body: JSON.stringify({ email })
      }, false);
    },
    async confirmPasswordReset(token, newPassword) {
      return api.request('/auth/password-reset/confirm', {
        method: 'POST', body: JSON.stringify({ token, newPassword })
      }, false);
    },
    async requestEmailVerification() {
      return api.request('/auth/email/verify-request', {
        method: 'POST', body: JSON.stringify({})
      });
    },
    async confirmEmailVerification(code) {
      return api.request('/auth/email/verify-confirm', {
        method: 'POST', body: JSON.stringify({ code })
      });
    },
    async changeEmail(newEmail, currentPassword) {
      return api.request('/auth/email', {
        method: 'PUT',
        body: JSON.stringify({ newEmail, currentPassword })
      });
    },
    async deleteAccount(currentPassword, confirmation) {
      return api.request('/auth/account', {
        method: 'DELETE',
        body: JSON.stringify({ currentPassword, confirmation })
      });
    },
    async uploadAvatar(file) {
      const body = new FormData();
      body.append('avatar', file);
      return api.request('/auth/avatar', { method: 'POST', body });
    },
    async removeAvatar() {
      return api.request('/auth/avatar', { method: 'DELETE' });
    }
  },

  courses: {
    async getAll(filters = {}) {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== '' && v !== null) params.append(k, String(v)) })
      const qs = params.toString()
      return api.request(`/courses${qs ? `?${qs}` : ''}`);
    },
    async getById(id) { return api.request(`/courses/${id}`); },
    async getLesson(courseId, lessonId) { return api.request(`/courses/${courseId}/lessons/${lessonId}`); },
    async create(data) { return api.request('/courses', { method: 'POST', body: JSON.stringify(data) }); },
    async update(id, data) { return api.request(`/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async delete(id) { return api.request(`/courses/${id}`, { method: 'DELETE' }); }
  },

  lessons: {
    async getById(id) { return api.request(`/lessons/${id}`); },
    async create(courseId, data) { return api.request(`/lessons/courses/${courseId}/lessons`, { method: 'POST', body: JSON.stringify(data) }); },
    async update(id, data) { return api.request(`/lessons/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async delete(id) { return api.request(`/lessons/${id}`, { method: 'DELETE' }); }
  },

  enrollments: {
    async getMy() { return api.request('/enrollments/my'); },
    async enroll(courseId) { return api.request('/enrollments', { method: 'POST', body: JSON.stringify({ courseId }) }); },
    async updateProgress(id, progress, status) {
      return api.request(`/enrollments/${id}/progress`, { method: 'PUT', body: JSON.stringify({ progress, status }) });
    }
  },

  knowledge: {
    async search(q, type) {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (type) params.append('type', type);
      const query = params.toString() ? `?${params.toString()}` : '';
      return api.request(`/knowledge/search${query}`);
    },
    async getById(id) { return api.request(`/knowledge/${id}`); },
    async getRelated(id) { return api.request(`/knowledge/related/${id}`); }
  },

  profil: {
    async guncelle(veri) {
      return api.request('/auth/profile', { method: 'PATCH', body: JSON.stringify(veri) });
    },
    async kapakYukle(file) {
      const form = new FormData();
      form.append('file', file);
      return api.request('/auth/cover', { method: 'POST', body: form });
    },
    async kapakKaldir() { return api.request('/auth/cover', { method: 'DELETE' }); },
  },

  search: {
    async query(q) {
      return api.request(`/api/v2/search?q=${encodeURIComponent(q)}`);
    }
  },

  conversation: {
    BASE: '/mentor/conversations',
    async getList(archived = false) {
      const query = buildQuery({ archived: archived ? 'true' : 'false' });
      return api.request(`${api.conversation.BASE}${query}`);
    },
    async create(title, context) {
      const body = { title };
      if (context) body.context = context;
      return api.request(`${api.conversation.BASE}`, { method: 'POST', body: JSON.stringify(body) });
    },
    async getById(id) { return api.request(`${api.conversation.BASE}/${id}`); },
    async update(id, title) { return api.request(`${api.conversation.BASE}/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }); },
    async remove(id) { return api.request(`${api.conversation.BASE}/${id}`, { method: 'DELETE' }); },
    async archive(id) { return api.request(`${api.conversation.BASE}/${id}/archive`, { method: 'PATCH' }); },
    async unarchive(id) { return api.request(`${api.conversation.BASE}/${id}/unarchive`, { method: 'PATCH' }); },
    async sendMessage(id, message, knowledgeObjectCode, contextOverride) {
      const body = { message };
      if (knowledgeObjectCode) body.knowledgeObjectCode = knowledgeObjectCode;
      if (contextOverride) body.contextOverride = contextOverride;
      return api.request(`${api.conversation.BASE}/${id}/messages`, { method: 'POST', body: JSON.stringify(body) });
    },

    streamMessage({ conversationId, content, knowledgeObjectCode, contextOverride, signal, onStart, onProvider, onDelta, onDone, onCancelled, onError }) {
      const body = { message: content };
      if (knowledgeObjectCode) body.knowledgeObjectCode = knowledgeObjectCode;
      if (contextOverride) body.contextOverride = contextOverride;
      return streamSSE({
        url: `${api.conversation.BASE}/${conversationId}/messages/stream`,
        method: 'POST',
        body: JSON.stringify(body),
        signal,
        onStart, onProvider, onDelta, onDone, onCancelled, onError
      });
    },

    regenerate({ conversationId, messageId, signal, onStart, onProvider, onDelta, onDone, onCancelled, onError }) {
      return streamSSE({
        url: `${api.conversation.BASE}/${conversationId}/messages/${messageId}/regenerate`,
        method: 'POST',
        body: '',
        signal,
        onStart, onProvider, onDelta, onDone, onCancelled, onError
      });
    },

    editAndRegenerate({ conversationId, messageId, content, signal, onStart, onProvider, onDelta, onDone, onCancelled, onError }) {
      return streamSSE({
        url: `${api.conversation.BASE}/${conversationId}/messages/${messageId}/edit-and-regenerate`,
        method: 'POST',
        body: JSON.stringify({ message: content }),
        signal,
        onStart, onProvider, onDelta, onDone, onCancelled, onError
      });
    }
  },

  formulas: {
    async list() { return api.request('/formulas'); },
    async calculate(formulaId, inputs) {
      return api.request(`/formulas/${formulaId}/calculate`, { method: 'POST', body: JSON.stringify({ inputs }) });
    },
    async getHistory() { return api.request('/formula-calculations'); }
  },

  financialModels: {
    async list() { return api.request('/financial-models'); },
    async get(code) { return api.request(`/financial-models/${encodeURIComponent(code)}`); },
    async recommend(data) {
      return api.request('/financial-models/recommend', { method: 'POST', body: JSON.stringify(data) });
    },
    async validate(code, data) {
      return api.request(`/financial-models/${encodeURIComponent(code)}/validate`, { method: 'POST', body: JSON.stringify(data) });
    },
    async run(workspaceId, code, data) {
      return api.request(`/workspaces/${workspaceId}/financial-models/${encodeURIComponent(code)}/runs`, { method: 'POST', body: JSON.stringify(data) });
    },
    async runs(workspaceId, modelCode = '') {
      return api.request(`/workspaces/${workspaceId}/financial-model-runs${modelCode ? `?modelCode=${encodeURIComponent(modelCode)}` : ''}`);
    },
    async getRun(workspaceId, runId) {
      return api.request(`/workspaces/${workspaceId}/financial-model-runs/${runId}`);
    },
    async compare(workspaceId, runIds) {
      return api.request(`/workspaces/${workspaceId}/financial-model-runs/compare`, { method: 'POST', body: JSON.stringify({ runIds }) });
    },
    async saveDecision(workspaceId, data) {
      return api.request(`/workspaces/${workspaceId}/decision-journal`, { method: 'POST', body: JSON.stringify(data) });
    },
    async reviewDecision(workspaceId, entryId, data) {
      return api.request(`/workspaces/${workspaceId}/decision-journal/${entryId}/outcome`, { method: 'PATCH', body: JSON.stringify(data) });
    },
    async cases() { return api.request('/financial-cases'); }
  },

  learningPath: {
    async getCurrent() { return api.request('/learning-path/current'); },
    async generate(title, pathData) {
      return api.request('/learning-path/generate', { method: 'POST', body: JSON.stringify({ title, pathData }) });
    },
    async generatePersonalized(title) {
      return api.request('/learning-path/generate-personalized', { method: 'POST', body: JSON.stringify({ title }) });
    },
    async generatePilot(title) {
      return api.request('/learning-path/generate-pilot', { method: 'POST', body: JSON.stringify({ title }) });
    },
    async getProgress(id) {
      return api.request(`/learning-path/${id}/progress`);
    },
    async update(id, data) { return api.request(`/learning-path/${id}`, { method: 'PUT', body: JSON.stringify(data) }); },
    async delete(id) { return api.request(`/learning-path/${id}`, { method: 'DELETE' }); }
  },

  community: {
    async list(type = '') {
      return api.request(`/community${type ? `?type=${encodeURIComponent(type)}` : ''}`);
    },
    async submit(data) {
      return api.request('/community/posts', {
        method: 'POST', body: JSON.stringify(data)
      });
    },
    /* Kaldırma gerçek silme değil, sunucuda durum değişikliği.
       Ön moderasyon kalktığı için müdahale yolu bu. */
    async remove(postId) {
      return api.request(`/community/${postId}`, { method: 'DELETE' });
    },
    async post(postId) {
      return api.request(`/community/post/${postId}`);
    },
    /* Begeni ve kaydetme ayni sekle sahip; tek yardimci iki ucu da
       cagiriyor. Sunucu guncel sayiyi donuyor -- istemcide saymak,
       baska biri ayni anda begenirse yaniltir. */
    async etkilesim(postId, tur, aktif) {
      return api.request(`/community/${postId}/${tur}`, {
        method: aktif ? 'POST' : 'DELETE'
      });
    },
    async benimListem(liste) {
      return api.request(`/community/me/${liste}`);
    },
    async benimOzetim() {
      return api.request('/community/me/summary');
    },
    /* Profil: kendi profilim `/auth/me`den geliyor, baskasininki
       burada. Ayri uclar cunku baskasinin profilinde begeni ve
       kaydetme YOK -- urun karari. */
    async profil(userId) { return api.request(`/community/social/people/${userId}/profile`); },
    async profilGonderileri(userId, tur) {
      return api.request(`/community/people/${userId}/posts${tur ? `?tur=${tur}` : ''}`);
    },
    async profilKisileri(userId, liste) {
      return api.request(`/community/social/people/${userId}/${liste}`);
    },
    async bildirimler() { return api.request('/community/social/notifications'); },
    async bildirimleriOkundu() { return api.request('/community/social/notifications/read', { method: 'POST' }); },

    async people(q = '') { return api.request(`/community/social/people${q ? `?q=${encodeURIComponent(q)}` : ''}`); },
    async follow(personId, active) { return api.request(`/community/social/people/${personId}/follow`, { method: active ? 'POST' : 'DELETE' }); },
    async block(personId, active) { return api.request(`/community/social/people/${personId}/block`, { method: active ? 'POST' : 'DELETE' }); },
    async threads() { return api.request('/community/social/threads'); },
    async createThread(data) { return api.request('/community/social/threads', { method: 'POST', body: JSON.stringify(data) }); },
    async davetKarari(threadId, karar) {
      return api.request(`/community/social/threads/${threadId}/invite/${karar}`, { method: 'POST' });
    },
    async messages(threadId) { return api.request(`/community/social/threads/${threadId}/messages`); },
    async sendMessage(threadId, body) { return api.request(`/community/social/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ body }) }); },
    async ads() { return api.request('/community/social/ads'); },
    async createAd(data) { return api.request('/community/social/ads', { method: 'POST', body: JSON.stringify(data) }); },
    async kisiyiBildir(personId, reason, details) {
      return api.request(`/community/social/people/${personId}/report`, {
        method: 'POST', body: JSON.stringify({ reason, ...(details ? { details } : {}) }),
      });
    },
    async kullaniciSikayetleri() { return api.request('/community/social/user-reports'); },
    async sikayetiCoz(reportId, resolution, note) {
      return api.request(`/community/social/user-reports/${reportId}/resolve`, {
        method: 'POST', body: JSON.stringify({ resolution, ...(note ? { note } : {}) }),
      });
    },
    async tumReklamlar() { return api.request('/community/social/ads/all'); },
    /* Sayac artirma: KIMIN artirdigi kaydedilmiyor, yalniz sayi buyur.
       Hata yutuluyor -- olcum yan etkidir, ekrani bozmamali. */
    async reklamOlayi(adId, olay) {
      return api.request(`/community/social/ads/${adId}/${olay}`, { method: 'POST' }).catch(() => {});
    },
    async removeAd(adId) { return api.request(`/community/social/ads/${adId}`, { method: 'DELETE' }); },
    async uploadMedia(file) {
      const form = new FormData();
      form.append('file', file);
      return api.request('/community/media', { method: 'POST', body: form });
    },
    async discardMedia(mediaId) {
      return api.request(`/community/media/${mediaId}`, { method: 'DELETE' });
    },
    async createOfficial(data) {
      return api.request('/community/official', {
        method: 'POST', body: JSON.stringify(data)
      });
    },
    async createAiOfficial(data) {
      return api.request('/community/official/ai-draft', {
        method: 'POST', body: JSON.stringify(data)
      });
    },
    async moderation() {
      return api.request('/community/moderation');
    },
    async report(postId, reason, details) {
      return api.request(`/community/${postId}/reports`, {
        method: 'POST', body: JSON.stringify({ reason, details })
      });
    },
    async reports() {
      return api.request('/community/reports');
    },
    async resolveReport(reportId, action, note) {
      return api.request(`/community/reports/${reportId}/resolve`, {
        method: 'POST', body: JSON.stringify({ action, note })
      });
    },
    /* Duzenleme ve arsivleme YALNIZ resmi gonderilerde; sunucu da
       bunu uyguluyor (403 + USER_POST_NOT_EDITABLE). */
    async duzenle(postId, veri) {
      return api.request(`/community/${postId}`, { method: 'PATCH', body: JSON.stringify(veri) });
    },
    async arsivle(postId, geriAl = false) {
      return api.request(`/community/${postId}/archive`, { method: 'POST', body: JSON.stringify({ geriAl }) });
    },
    async moderate(postId, action, reason) {
      return api.request(`/community/${postId}/moderate`, {
        method: 'POST', body: JSON.stringify({ action, reason })
      });
    }
  },

  admin: {
    async getStats(period) {
      return api.request(`/admin/stats?period=${period}`);
    },
    async getReviewerMetrics() {
      return api.request('/admin/ai-reviewer/metrics');
    },
    async getReviewerHealth() {
      return api.request('/admin/ai-reviewer/health');
    },
    async generateQuizDraft(koId) {
      return api.request(`/admin/quiz-generator/${koId}/draft`, {
        method: 'POST'
      });
    },
    async publishQuizDraft(quizId) {
      return api.request(`/admin/quiz-generator/${quizId}/publish`, {
        method: 'POST'
      });
    },
    async listUsers(filters = {}) {
      const query = buildQuery(filters);
      return api.request(`/admin/users${query}`);
    },
    async updateUserRole(userId, role) {
      return api.request(`/admin/users/${userId}/role`, {
        method: 'PATCH', body: JSON.stringify({ role })
      });
    },
    /* Askıya alma: hesap kapanır, açık oturumlar ölür. Geri alınabilir. */
    async suspendUser(userId, reason = '') {
      return api.request(`/admin/users/${userId}/suspend`, {
        method: 'POST', body: JSON.stringify({ reason })
      });
    },
    async unsuspendUser(userId) {
      return api.request(`/admin/users/${userId}/unsuspend`, {
        method: 'POST', body: JSON.stringify({})
      });
    },
    /* Anonimleştirme: kişisel alanlar temizlenir, kayıt silinmez.
       GERİ ALINAMAZ — denetim izleri ve ilişkiler için kayıt durur. */
    async anonymizeUser(userId) {
      return api.request(`/admin/users/${userId}/anonymize`, {
        method: 'POST', body: JSON.stringify({})
      });
    },
    async getAuditLogs(filters = {}) {
      const query = buildQuery(filters);
      return api.request(`/admin/audit-logs${query}`);
    }
  },

  /* --- v2 Knowledge Object API --- */
  knowledgeV2: {
    V2_PREFIX: '/api/v2',

    async list(filters = {}) {
      const query = buildQuery(filters);
      return api.request(`${api.knowledgeV2.V2_PREFIX}/knowledge-objects${query}`);
    },

    async getByCode(code) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/knowledge-objects/${code}`);
    },

    async getCategories() {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/categories`);
    },

    async adminList(filters = {}) {
      const query = buildQuery(filters);
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects${query}`);
    },

    async create(data) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects`, {
        method: 'POST', body: JSON.stringify(data)
      });
    },

    async update(code, data) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects/${code}`, {
        method: 'PUT', body: JSON.stringify(data)
      });
    },

    async submitReview(code) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects/${code}/submit-review`, {
        method: 'POST'
      });
    },

    async approve(code, notes) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects/${code}/approve`, {
        method: 'POST', body: JSON.stringify({ notes })
      });
    },

    async reject(code, notes) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects/${code}/reject`, {
        method: 'POST', body: JSON.stringify({ notes })
      });
    },

    async publish(code) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects/${code}/publish`, {
        method: 'POST'
      });
    },

    async archive(code) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects/${code}/archive`, {
        method: 'POST'
      });
    },

    async importPreview(data) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects/import/preview`, {
        method: 'POST', body: JSON.stringify(data)
      });
    },

    async importCommit(data) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects/import/commit`, {
        method: 'POST', body: JSON.stringify(data)
      });
    },

    async getImportJob(id) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/import-jobs/${id}`);
    },

    async listImportJobs() {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/import-jobs`);
    },

    async companionPreview(data) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects/companion-content/preview`, {
        method: 'POST', body: JSON.stringify(data)
      });
    },

    async companionCommit(data) {
      return api.request(`${api.knowledgeV2.V2_PREFIX}/admin/knowledge-objects/companion-content/commit`, {
        method: 'POST', body: JSON.stringify(data)
      });
    },

    async listTopics(filters = {}) {
      const query = buildQuery(filters);
      return api.request(`/api/v2/knowledge-topics${query}`);
    },

    async getTopic(topicKey, level) {
      const query = level ? `?level=${encodeURIComponent(level)}` : '';
      return api.request(`/api/v2/knowledge-topics/${topicKey}${query}`);
    }
  },

  memory: {
    BASE: '/api/memory',

    async list(filters = {}) {
      const query = buildQuery(filters);
      return api.request(`${api.memory.BASE}${query}`);
    },

    async getById(id) {
      return api.request(`${api.memory.BASE}/${id}`);
    },

    async create(data) {
      return api.request(`${api.memory.BASE}`, {
        method: 'POST', body: JSON.stringify(data)
      });
    },

    async update(id, data) {
      return api.request(`${api.memory.BASE}/${id}`, {
        method: 'PATCH', body: JSON.stringify(data)
      });
    },

    async remove(id) {
      return api.request(`${api.memory.BASE}/${id}`, { method: 'DELETE' });
    },

    async clearAll() {
      return api.request(`${api.memory.BASE}/all`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmation: 'DELETE_ALL_MEMORIES' })
      });
    },

    async dispute(id) {
      return api.request(`${api.memory.BASE}/${id}/dispute`, { method: 'POST' });
    },

    async confirm(id) {
      return api.request(`${api.memory.BASE}/${id}/confirm`, { method: 'POST' });
    }
  },

  onboarding: {
    async getStatus() { return api.request('/onboarding/status'); },
    async getProfile() { return api.request('/onboarding/profile'); },
    async updateProfile(data) { return api.request('/onboarding/profile', { method: 'PUT', body: JSON.stringify(data) }); },
    async complete() { return api.request('/onboarding/complete', { method: 'POST', body: JSON.stringify({ onboardingCompleted: true }) }); },
    async reset() { return api.request('/onboarding/reset', { method: 'POST' }); },
    async completeTour() { return api.request('/onboarding/tour/complete', { method: 'POST' }); },
    async resetTour() { return api.request('/onboarding/tour/reset', { method: 'POST' }); }
  },

  business: {
    async getProfile() { return api.request('/business/business-profile'); },
    async updateProfile(data) { return api.request('/business/business-profile', { method: 'PUT', body: JSON.stringify(data) }); }
  },

  learning: {
    async start(koId) { return api.request('/learning/start', { method: 'POST', body: JSON.stringify({ koId }) }); },
    async updateProgress(koId, progressPercent) {
      return api.request('/learning/progress', { method: 'POST', body: JSON.stringify({ koId, progressPercent }) });
    },
    async complete(koId) { return api.request('/learning/complete', { method: 'POST', body: JSON.stringify({ koId }) }); },
    async getProgress(koId) { return api.request(`/learning/progress/${koId}`); },
    async getAllProgress() { return api.request('/learning/progress'); },
    async readingComplete(lessonId, courseId) {
      return api.request('/learning/reading-complete', { method: 'POST', body: JSON.stringify({ lessonId, courseId }) });
    },
    async updateLessonProgress(lessonId, data) {
      return api.request('/learning/lesson-progress', { method: 'POST', body: JSON.stringify({ lessonId, ...data }) });
    },
    /* "Kaldığın yer" işareti. İlerleme yüzdesine dokunmaz. */
    async lessonView(lessonId) {
      return api.request('/learning/lesson-view', { method: 'POST', body: JSON.stringify({ lessonId }) });
    },
  },

  assessment: {
    async getQuestions() { return api.request('/assessment/questions'); },
    async getStatus() { return api.request('/assessment/status'); },
    async submit(answers, version = 1) { return api.request('/assessment/submit', { method: 'POST', body: JSON.stringify({ answers, version }) }); },
    async getResults() { return api.request('/assessment/results'); },
    async restart() { return api.request('/assessment/restart', { method: 'POST' }); }
  },

  dashboard: {
    async getSummary() {
      return api.request('/dashboard');
    },
    async getPilotSummary() {
      return api.request('/dashboard/pilot');
    }
  },

  feed: {
    async getFeed() {
      return api.request('/api/v1/feed');
    },
    async viewItem(itemKey) {
      return api.request('/api/v1/feed/items/view', { method: 'POST', body: JSON.stringify({ itemKey }) });
    },
    async dismissItem(itemKey) {
      return api.request('/api/v1/feed/items/dismiss', { method: 'POST', body: JSON.stringify({ itemKey }) });
    }
  },

  learningProgress: {
    async getContinue(limit = 3) {
      return api.request(`/api/v1/learning-progress/continue?limit=${encodeURIComponent(limit)}`);
    },
    async getRecent(limit = 3) {
      return api.request(`/api/v1/learning-progress/recent?limit=${encodeURIComponent(limit)}`);
    },
    async getCompleted(limit = 3) {
      return api.request(`/api/v1/learning-progress?status=completed&limit=${encodeURIComponent(limit)}`);
    },
    async update(contentType, contentId, data) {
      return api.request(
        `/api/v1/learning-progress/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}`,
        { method: 'PATCH', body: JSON.stringify(data) }
      );
    }
  },

  flashcards: {
    async getByKoId(koId) {
      return api.request(`/flashcards/knowledge/${koId}`);
    },
    async submitReview(flashcardId, rating) {
      return api.request(`/flashcards/${flashcardId}/reviews`, {
        method: 'POST', body: JSON.stringify({ rating })
      });
    },
    async getDue(limit = 20) {
      return api.request(`/flashcards/due?limit=${limit}`);
    }
  },

  videos: {
    async getByKoId(koId) {
      return api.request(`/videos/ko/${koId}`);
    },
    async updateProgress(videoId, currentSecond, watchedDelta) {
      return api.request(`/videos/progress/${videoId}`, {
        method: 'POST', body: JSON.stringify({ currentSecond, watchedDelta })
      });
    },
    async adminList() {
      return api.request('/videos/admin/videos');
    },
    async adminGet(id) {
      return api.request(`/videos/admin/videos/${id}`);
    },
    async adminUpsert(koId, data) {
      return api.request(`/videos/admin/videos/ko/${koId}`, {
        method: 'PUT', body: JSON.stringify(data)
      });
    },
    async adminPublish(id, playbackUrl) {
      return api.request(`/videos/admin/videos/${id}/publish`, {
        method: 'POST', body: JSON.stringify({ playbackUrl })
      });
    },
  },

  workspace: {
    async list() { return api.request('/workspaces') },
    async create(data) {
      return api.request('/workspaces', { method: 'POST', body: JSON.stringify(data) })
    },
    async get(workspaceId) { return api.request(`/workspaces/${workspaceId}`) },
    async update(workspaceId, data) {
      return api.request(`/workspaces/${workspaceId}`, { method: 'PUT', body: JSON.stringify(data) })
    },
    async archive(workspaceId) {
      return api.request(`/workspaces/${workspaceId}`, { method: 'DELETE' })
    },
    async switchWorkspace(workspaceId) {
      return api.request('/workspaces/switch', { method: 'POST', body: JSON.stringify({ workspaceId }) })
    },
    async syncLegacyProfile() {
      return api.request('/workspaces/sync-legacy-profile', { method: 'POST' })
    },
    members: {
      async list(workspaceId) { return api.request(`/workspaces/${workspaceId}/members`) },
      async updateRole(workspaceId, memberId, role) {
        return api.request(`/workspaces/${workspaceId}/members/${memberId}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
      },
      async remove(workspaceId, memberId) {
        return api.request(`/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE' })
      }
    },
    invitations: {
      async list(workspaceId) { return api.request(`/workspaces/${workspaceId}/invitations`) },
      async create(workspaceId, data) {
        return api.request(`/workspaces/${workspaceId}/invitations`, { method: 'POST', body: JSON.stringify(data) })
      },
      async cancel(workspaceId, invitationId) {
        return api.request(`/workspaces/${workspaceId}/invitations/${invitationId}`, { method: 'DELETE' })
      },
      async accept(token) {
        return api.request('/workspaces/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) })
      }
    },
    contacts: {
      async list(workspaceId) { return api.request(`/workspaces/${workspaceId}/contacts`) },
      async create(workspaceId, data) {
        return api.request(`/workspaces/${workspaceId}/contacts`, { method: 'POST', body: JSON.stringify(data) })
      },
      async update(workspaceId, contactId, data) {
        return api.request(`/workspaces/${workspaceId}/contacts/${contactId}`, { method: 'PUT', body: JSON.stringify(data) })
      },
      async archive(workspaceId, contactId) {
        return api.request(`/workspaces/${workspaceId}/contacts/${contactId}`, { method: 'DELETE' })
      }
    },
    settings: {
      async get(workspaceId) { return api.request(`/workspaces/${workspaceId}/settings`) },
      async update(workspaceId, data) {
        return api.request(`/workspaces/${workspaceId}/settings`, { method: 'PUT', body: JSON.stringify(data) })
      }
    },
    activity: {
      async list(workspaceId, params = {}) {
        const q = buildQuery(params)
        return api.request(`/workspaces/${workspaceId}/activity${q}`)
      }
    },
    tracker: {
      async summary(workspaceId) {
        return api.request(`/workspaces/${workspaceId}/tracker/summary`)
      },
      async calendar(workspaceId, from, to) {
        const q = buildQuery({ from, to })
        return api.request(`/workspaces/${workspaceId}/tracker/calendar${q}`)
      },
      async list(workspaceId, filters = {}) {
        const q = buildQuery(filters)
        return api.request(`/workspaces/${workspaceId}/records${q}`)
      },
      async get(workspaceId, recordId) {
        return api.request(`/workspaces/${workspaceId}/records/${recordId}`)
      },
      async create(workspaceId, data) {
        return api.request(`/workspaces/${workspaceId}/records`, {
          method: 'POST', body: JSON.stringify(data)
        })
      },
      async update(workspaceId, recordId, data) {
        return api.request(`/workspaces/${workspaceId}/records/${recordId}`, {
          method: 'PATCH', body: JSON.stringify(data)
        })
      },
      async defer(workspaceId, recordId, data) {
        return api.request(`/workspaces/${workspaceId}/records/${recordId}/defer`, {
          method: 'POST', body: JSON.stringify(data)
        })
      },
      async archive(workspaceId, recordId) {
        return api.request(`/workspaces/${workspaceId}/records/${recordId}`, { method: 'DELETE' })
      },
      async addReminder(workspaceId, recordId, data) {
        return api.request(`/workspaces/${workspaceId}/records/${recordId}/reminders`, {
          method: 'POST', body: JSON.stringify(data)
        })
      },
      async attachDocument(workspaceId, recordId, documentId) {
        return api.request(`/workspaces/${workspaceId}/records/${recordId}/documents/${documentId}`, {
          method: 'POST'
        })
      }
    },
    exports: {
      /**
       * Kayıt dışa aktarımını indirir.
       *
       * `api.request` JSON çözer, bu yüzden ikili içerik için kullanılamaz;
       * burada Blob okunup tarayıcıya indirtiliyor. Dosya adı sunucunun
       * gönderdiği Content-Disposition başlığından alınır.
       */
      async downloadRecords(workspaceId, format, filters = {}) {
        const token = localStorage.getItem('token')
        const query = buildQuery(filters)
        const res = await fetch(
          `${API_URL}/workspaces/${workspaceId}/exports/records.${format}${query}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )

        if (!res.ok) {
          let data = null
          try { data = await res.json() } catch { /* ikili/boş yanıt */ }
          throw new ApiError(data?.error || 'Dışa aktarım başarısız', res.status, data)
        }

        const disposition = res.headers.get('Content-Disposition') || ''
        const match = disposition.match(/filename="?([^";]+)"?/i)
        const filename = match ? match[1] : `kayitlar.${format}`

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        try {
          const link = document.createElement('a')
          link.href = url
          link.download = filename
          document.body.appendChild(link)
          link.click()
          link.remove()
        } finally {
          URL.revokeObjectURL(url)
        }

        return {
          filename,
          rowCount: Number(res.headers.get('X-Export-Row-Count') ?? 0),
          truncated: res.headers.get('X-Export-Truncated') === 'true'
        }
      },

      /*
       * TEK KAYDIN PDF'İ -- dosyanın KENDİSİNİ döndürür.
       *
       * `downloadRecords` indirmeyi kendi başlatıyor; bu ise `File`
       * veriyor, çünkü çağıran taraf ya paylaşım menüsüne verecek ya
       * da indirecek. Kararı çağıran veriyor.
       */
      async fetchRecordPdf(workspaceId, recordId) {
        const token = localStorage.getItem('token')
        const res = await fetch(
          `${API_URL}/workspaces/${workspaceId}/records/${recordId}/export.pdf`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )
        if (!res.ok) {
          let data = null
          try { data = await res.json() } catch { /* ikili/boş yanıt */ }
          throw new ApiError(data?.error || 'Kayıt indirilemedi', res.status, data)
        }
        const disposition = res.headers.get('Content-Disposition') || ''
        const match = disposition.match(/filename="?([^";]+)"?/i)
        const filename = match ? match[1] : `kayit-${recordId}.pdf`
        const blob = await res.blob()
        return new File([blob], filename, { type: 'application/pdf' })
      }
    },
    documents: {
      async list(workspaceId) {
        return api.request(`/workspaces/${workspaceId}/documents`)
      },
      async upload(workspaceId, file, metadata = {}) {
        const form = new FormData()
        form.append('file', file)
        const uploaded = await api.request('/documents/upload', { method: 'POST', body: form })
        return api.request(`/workspaces/${workspaceId}/documents/${uploaded.id}`, {
          method: 'PATCH', body: JSON.stringify(metadata)
        })
      },
      async update(workspaceId, documentId, metadata) {
        return api.request(`/workspaces/${workspaceId}/documents/${documentId}`, {
          method: 'PATCH', body: JSON.stringify(metadata)
        })
      },
      async archive(workspaceId, documentId) {
        return api.request(`/workspaces/${workspaceId}/documents/${documentId}`, { method: 'DELETE' })
      },
      async suggestions(workspaceId, documentId) {
        return api.request(`/workspaces/${workspaceId}/documents/${documentId}/suggestions`)
      },
      async financialModelSuggestions(workspaceId, documentId) {
        return api.request(`/workspaces/${workspaceId}/documents/${documentId}/financial-model-suggestions`)
      },
      async acceptSuggestion(workspaceId, suggestionId, overrides = {}) {
        return api.request(`/workspaces/${workspaceId}/document-suggestions/${suggestionId}/accept`, {
          method: 'POST', body: JSON.stringify(overrides)
        })
      },
      async rejectSuggestion(workspaceId, suggestionId) {
        return api.request(`/workspaces/${workspaceId}/document-suggestions/${suggestionId}/reject`, {
          method: 'POST'
        })
      }
    },
    notifications: {
      async list(workspaceId) {
        return api.request(`/workspaces/${workspaceId}/notifications`)
      },
      async read(workspaceId, notificationId) {
        return api.request(`/workspaces/${workspaceId}/notifications/${notificationId}/read`, { method: 'PATCH' })
      },
      async readAll(workspaceId) {
        return api.request(`/workspaces/${workspaceId}/notifications/read-all`, { method: 'POST' })
      }
    }
  },

  news: {
    async list({ category, cursor, limit = 12 } = {}) {
      return api.request(`/api/news${buildQuery({ category, cursor, limit })}`, {}, false);
    }
  },

  quizzes: {
    async getByKoId(koId) {
      return api.request(`/quizzes/${koId}`);
    },
    async submitAttempt(koId, answers) {
      return api.request(`/quizzes/${koId}/attempts`, {
        method: 'POST', body: JSON.stringify({ answers })
      });
    },
    async getHistory() {
      return api.request('/quizzes/history');
    }
  },

  decisionChecks: {
    async list() {
      return api.request('/api/v1/decision-checks');
    },
    async listSessions() {
      return api.request('/api/v1/decision-checks/sessions/me');
    },
    async start(code) {
      return api.request(`/api/v1/decision-checks/${code}/start`, { method: 'POST', body: '{}' });
    },
    async getSession(sessionId) {
      return api.request(`/api/v1/decision-checks/sessions/${sessionId}`);
    },
    async saveAnswer(sessionId, answer) {
      return api.request(`/api/v1/decision-checks/sessions/${sessionId}/answers`, {
        method: 'PATCH',
        body: JSON.stringify(answer)
      });
    },
    async complete(sessionId) {
      return api.request(`/api/v1/decision-checks/sessions/${sessionId}/complete`, {
        method: 'POST',
        body: '{}'
      });
    },
    async getResult(sessionId) {
      return api.request(`/api/v1/decision-checks/sessions/${sessionId}/result`);
    }
  }
};
