const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

export const TOKEN_KEY = 'authToken';
export const USER_KEY = 'currentUser';

export const session = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
  },
  set: (token, user) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  updateUser: (patch) => {
    const user = { ...(session.getUser() || {}), ...patch };
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
};

// Notify the app when the backend rejects the session so it can redirect to login
export const onUnauthorized = (handler) => { unauthorizedHandler = handler; };
let unauthorizedHandler = null;

async function request(path, { method = 'GET', body, formData, signal, auth = true } = {}) {
  const headers = {};
  if (!formData) headers['Content-Type'] = 'application/json';
  const token = session.getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
      signal
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw Object.assign(new Error('Cannot reach the server. Please check that the backend is running.'), { code: 'NETWORK' });
  }

  let data = null;
  try { data = await res.json(); } catch { data = null; }

  if (res.status === 401 && auth) {
    session.clear();
    if (unauthorizedHandler) unauthorizedHandler(data?.message);
  }
  if (!res.ok) {
    throw Object.assign(new Error(data?.message || `Request failed (${res.status})`), { code: data?.error, status: res.status });
  }
  return data;
}

const qs = (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
};

export const api = {
  // Auth
  login: (username, password, role) => request('/auth/login', { method: 'POST', body: { username, password, role }, auth: false }),
  me: () => request('/auth/me'),
  changePassword: ({ currentPassword, newPassword }) => request('/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } }),

  // Users
  getUsers: (params = {}) => request(`/users${qs(params)}`),
  getActiveWorkers: () => request('/users?role=worker&status=active'),
  createUser: (userData) => request('/users', { method: 'POST', body: userData }),
  updateUser: (id, userData) => request(`/users/${id}`, { method: 'PUT', body: userData }),
  toggleUserActive: (id) => request(`/users/${id}/toggle-active`, { method: 'PATCH' }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Waste records
  getWasteRecords: (params = {}, signal) => request(`/waste${qs(params)}`, { signal }),
  getWasteRecordsByDate: (date, signal) => request(`/waste${qs({ date })}`, { signal }),
  getTodayRecords: () => request('/waste/today'),
  getPreviousPendingRecords: () => request('/waste/pending-previous'),
  getWasteStats: (date, signal) => request(`/waste/stats${qs({ date })}`, { signal }),
  getWorkerStats: (workerName, workerId) => request(`/waste/worker-stats${qs({ workerName, workerId })}`),
  getCollectionHistory: (params = {}) => request(`/waste/history${qs(params)}`),
  createWasteRecord: (recordData) => request('/waste', { method: 'POST', body: recordData }),
  assignWasteRecord: (id, workerName, workerId) => request(`/waste/${id}/assign`, { method: 'PUT', body: { assignedTo: workerName, assignedToUserId: workerId } }),
  collectWasteRecord: (id) => request(`/waste/${id}/collect`, { method: 'PUT', body: {} }),
  completeWasteRecord: (id, binVerified = true, binMismatchNote = '') => request(`/waste/${id}/complete`, { method: 'PUT', body: { binVerified, binMismatchNote } }),
  cancelWasteRecord: (id, reason = '') => request(`/waste/${id}/cancel`, { method: 'PUT', body: { reason } }),
  deleteWasteRecord: (id) => request(`/waste/${id}`, { method: 'DELETE' }),

  // AI vision (API key stays server-side)
  getAiStatus: () => request('/ai/status'),
  classifyImage: (imageFile, hint = '', signal) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (hint) formData.append('hint', hint);
    return request('/ai/classify-image', { method: 'POST', formData, signal });
  },

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH', body: {} }),
  sendWasteReminder: ({ wasteRecordId, recordId, cooldownSeconds }) => request('/notifications/reminder', { method: 'POST', body: { wasteRecordId, recordId, cooldownSeconds } })
};
