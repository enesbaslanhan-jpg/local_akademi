const API_URL = import.meta.env.VITE_API_URL || '';

const getHeaders = (includeAuth = true) => {
  const headers = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('token');
  if (token && includeAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
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
  async request(path, options = {}, includeAuth = true) {
    const headers = { ...getHeaders(includeAuth), ...options.headers };
    if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
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
      const message = data.error || data.message || 'İşlem başarısız';
      const error = new ApiError(message, response.status, data);
      if (response.status === 401 && !path.startsWith('/auth/')) {
        localStorage.removeItem('token');
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
    async register(email, password, name) {
      return api.request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }, false);
    },
    async me() {
      return api.request('/auth/me');
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

  conversation: {
    BASE: '/mentor/conversations',
    async getList(archived = false) {
      const query = buildQuery({ archived: archived ? 'true' : 'false' });
      return api.request(`${api.conversation.BASE}${query}`);
    },
    async create(title) { return api.request(`${api.conversation.BASE}`, { method: 'POST', body: JSON.stringify({ title }) }); },
    async getById(id) { return api.request(`${api.conversation.BASE}/${id}`); },
    async update(id, title) { return api.request(`${api.conversation.BASE}/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }); },
    async remove(id) { return api.request(`${api.conversation.BASE}/${id}`, { method: 'DELETE' }); },
    async archive(id) { return api.request(`${api.conversation.BASE}/${id}/archive`, { method: 'PATCH' }); },
    async unarchive(id) { return api.request(`${api.conversation.BASE}/${id}/unarchive`, { method: 'PATCH' }); },
    async sendMessage(id, message, knowledgeObjectCode) {
      const body = { message };
      if (knowledgeObjectCode) body.knowledgeObjectCode = knowledgeObjectCode;
      return api.request(`${api.conversation.BASE}/${id}/messages`, { method: 'POST', body: JSON.stringify(body) });
    },

    streamMessage({ conversationId, content, knowledgeObjectCode, signal, onStart, onProvider, onDelta, onDone, onCancelled, onError }) {
      const body = { message: content };
      if (knowledgeObjectCode) body.knowledgeObjectCode = knowledgeObjectCode;
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
    async reset() { return api.request('/onboarding/reset', { method: 'POST' }); }
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
  }
};
