const API_BASE = '/api';

async function fetchApi(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  // Handle CSV downloads
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    const blob = await response.blob();
    return blob;
  }

  return response.json();
}

// Auth
export const authApi = {
  login: (email, password) => fetchApi('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => fetchApi('/auth/me'),
  logout: () => fetchApi('/auth/logout', { method: 'POST' }),
  requestPasswordReset: (email) => fetchApi('/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) }),
  confirmPasswordReset: (token, password) => fetchApi('/auth/password-reset/confirm', { method: 'POST', body: JSON.stringify({ token, password }) }),
  changePassword: (currentPassword, password) => fetchApi('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, password }) }),
  checkPasswordStrength: (password) => fetchApi('/auth/check-password-strength', { method: 'POST', body: JSON.stringify({ password }) }),
  verifyEmail: (token) => fetchApi('/auth/verify-email', { method: 'POST', body: JSON.stringify({ token }) }),
  resendVerification: () => fetchApi('/auth/resend-verification', { method: 'POST' }),
};

// Dashboard
export const dashboardApi = {
  getOverview: () => fetchApi('/dashboard/overview'),
  getCards: () => fetchApi('/dashboard/cards'),
};

// Tickets
export const ticketsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/tickets${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchApi(`/tickets/${id}`),
  create: (data) => fetchApi('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/tickets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/tickets/${id}`, { method: 'DELETE' }),
  addMessage: (id, data) => fetchApi(`/tickets/${id}/messages`, { method: 'POST', body: JSON.stringify(data) }),
  exportCsv: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/tickets/export/csv${query ? `?${query}` : ''}`);
  },
  exportPdf: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/tickets/export/pdf${query ? `?${query}` : ''}`);
  },
  bulkDelete: (ids) => fetchApi('/tickets/bulk/delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkUpdate: (ids, data) => fetchApi('/tickets/bulk/update', { method: 'POST', body: JSON.stringify({ ids, data }) }),
};

// Customers
export const customersApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/customers${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchApi(`/customers/${id}`),
  create: (data) => fetchApi('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/customers/${id}`, { method: 'DELETE' }),
  getTickets: (id) => fetchApi(`/customers/${id}/tickets`),
  exportCsv: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/customers/export/csv${query ? `?${query}` : ''}`);
  },
  exportPdf: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/customers/export/pdf${query ? `?${query}` : ''}`);
  },
  bulkDelete: (ids) => fetchApi('/customers/bulk/delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkUpdate: (ids, data) => fetchApi('/customers/bulk/update', { method: 'POST', body: JSON.stringify({ ids, data }) }),
};

// Categories
export const categoriesApi = {
  getAll: () => fetchApi('/categories'),
  getById: (id) => fetchApi(`/categories/${id}`),
  create: (data) => fetchApi('/categories', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/categories/${id}`, { method: 'DELETE' }),
};

// Tags
export const tagsApi = {
  getAll: () => fetchApi('/tags'),
  getById: (id) => fetchApi(`/tags/${id}`),
  create: (data) => fetchApi('/tags', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/tags/${id}`, { method: 'DELETE' }),
};

// Knowledge Base
export const knowledgeApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/knowledge${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchApi(`/knowledge/${id}`),
  create: (data) => fetchApi('/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/knowledge/${id}`, { method: 'DELETE' }),
  markHelpful: (id, isHelpful) => fetchApi(`/knowledge/${id}/helpful`, { method: 'POST', body: JSON.stringify({ isHelpful }) }),
};

// Canned Responses
export const cannedResponsesApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/canned-responses${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchApi(`/canned-responses/${id}`),
  create: (data) => fetchApi('/canned-responses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/canned-responses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/canned-responses/${id}`, { method: 'DELETE' }),
  use: (id) => fetchApi(`/canned-responses/${id}/use`, { method: 'POST' }),
};

// Users
export const usersApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/users${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchApi(`/users/${id}`),
  create: (data) => fetchApi('/users', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/users/${id}`, { method: 'DELETE' }),
  getTickets: (id, status) => fetchApi(`/users/${id}/tickets${status ? `?status=${status}` : ''}`),
};

// Analytics
export const analyticsApi = {
  getOverview: () => fetchApi('/analytics/overview'),
  getTickets: () => fetchApi('/analytics/tickets'),
  getAgents: () => fetchApi('/analytics/agents'),
  getCustomers: () => fetchApi('/analytics/customers'),
};

// AI
export const aiApi = {
  chat: (message, sessionId, context) => fetchApi('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, sessionId, context })
  }),
  generateResponse: (ticketId, tone) => fetchApi('/ai/generate-response', {
    method: 'POST',
    body: JSON.stringify({ ticketId, tone })
  }),
  analyzeSentiment: (text) => fetchApi('/ai/analyze-sentiment', {
    method: 'POST',
    body: JSON.stringify({ text })
  }),
  summarizeTicket: (ticketId) => fetchApi('/ai/summarize-ticket', {
    method: 'POST',
    body: JSON.stringify({ ticketId })
  }),
  suggestCategory: (subject, description) => fetchApi('/ai/suggest-category', {
    method: 'POST',
    body: JSON.stringify({ subject, description })
  }),
  suggestPriority: (subject, description) => fetchApi('/ai/suggest-priority', {
    method: 'POST',
    body: JSON.stringify({ subject, description })
  }),
  generateArticle: (topic, keywords) => fetchApi('/ai/generate-article', {
    method: 'POST',
    body: JSON.stringify({ topic, keywords })
  }),
  feedback: (conversationId, wasHelpful) => fetchApi('/ai/feedback', {
    method: 'POST',
    body: JSON.stringify({ conversationId, wasHelpful })
  }),
  getHistory: (sessionId) => fetchApi(`/ai/history/${sessionId}`),
};

// Calls
export const callsApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchApi(`/calls${query ? `?${query}` : ''}`);
  },
  getById: (id) => fetchApi(`/calls/${id}`),
  getStats: () => fetchApi('/calls/stats'),
  getToken: (identity) => fetchApi(`/calls/token${identity ? `?identity=${identity}` : ''}`),
  getTranscript: (id) => fetchApi(`/calls/${id}/transcript`),
  createTicket: (id) => fetchApi(`/calls/${id}/create-ticket`, { method: 'POST' }),
  makeOutbound: (toPhone, customerId) => fetchApi('/calls/outbound', {
    method: 'POST',
    body: JSON.stringify({ toPhone, customerId })
  }),
  delete: (id) => fetchApi(`/calls/${id}`, { method: 'DELETE' }),
};

// Utility: Download blob as file
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Utility: Generate simple PDF from data
export function generatePdfFromData(pdfData) {
  const { title, generatedAt, columns, rows } = pdfData;
  let html = `<html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:40px;color:#333}
    h1{color:#4f46e5;margin-bottom:5px}
    .meta{color:#666;margin-bottom:20px;font-size:14px}
    table{width:100%;border-collapse:collapse;margin-top:20px}
    th{background:#4f46e5;color:white;padding:10px;text-align:left;font-size:13px}
    td{padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:13px}
    tr:nth-child(even){background:#f9fafb}
    .footer{margin-top:30px;text-align:center;color:#999;font-size:12px}
  </style></head><body>
  <h1>${title}</h1>
  <div class="meta">Generated: ${new Date(generatedAt).toLocaleString()} | Total: ${rows.length} records</div>
  <table><thead><tr>${columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>
  <div class="footer">AI Customer Support Agent - Report</div></body></html>`;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}
