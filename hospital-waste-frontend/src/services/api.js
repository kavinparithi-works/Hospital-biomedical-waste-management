const API_BASE = 'http://localhost:5000/api';

export const api = {
  // Auth
  login: async (username, password, role) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  },

  // Users Management (Admin)
  getUsers: async (queryParams = {}) => {
    const params = new URLSearchParams(queryParams);
    const res = await fetch(`${API_BASE}/users?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch users');
    return data;
  },

  createUser: async (userData) => {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create user');
    return data;
  },

  updateUser: async (id, userData) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update user');
    return data;
  },

  toggleUserActive: async (id) => {
    const res = await fetch(`${API_BASE}/users/${id}/toggle-active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to toggle user status');
    return data;
  },

  deleteUser: async (id) => {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete user');
    return data;
  },

  // Waste Records & Stats
  getWasteRecords: async (queryParams = {}) => {
    const params = new URLSearchParams(queryParams);
    const url = `${API_BASE}/waste${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch waste records');
    return data;
  },

  getTodayRecords: async () => {
    const res = await fetch(`${API_BASE}/waste/today`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch today waste records');
    return data;
  },

  getPreviousPendingRecords: async () => {
    const res = await fetch(`${API_BASE}/waste/pending-previous`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch previous pending records');
    return data;
  },

  getWasteStats: async (date, signal) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    const url = `${API_BASE}/waste/stats${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch waste statistics');
    return data;
  },

  getWasteRecordsByDate: async (date, signal) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    const url = `${API_BASE}/waste?${params.toString()}`;
    const res = await fetch(url, { signal });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch waste records');
    return data;
  },

  // Classify image via Gemini vision (POST FormData to backend — API key stays server-side)
  classifyImage: async (imageFile, signal) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    const res = await fetch(`${API_BASE}/ai/classify-image`, {
      method: 'POST',
      body: formData,
      signal
    });
    const data = await res.json();
    if (!res.ok) throw Object.assign(new Error(data.message || 'Image classification failed'), { code: data.error, status: res.status });
    return data;
  },

  getWorkerStats: async (workerName, workerId) => {
    const params = new URLSearchParams();
    if (workerName) params.append('workerName', workerName);
    if (workerId) params.append('workerId', workerId);
    
    const res = await fetch(`${API_BASE}/waste/worker-stats?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch worker statistics');
    return data;
  },

  getCollectionHistory: async (queryParams = {}) => {
    const params = new URLSearchParams(queryParams);
    const res = await fetch(`${API_BASE}/waste/history?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch collection history');
    return data;
  },

  createWasteRecord: async (recordData) => {
    const res = await fetch(`${API_BASE}/waste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recordData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create waste record');
    return data;
  },

  collectWasteRecord: async (id, workerName, workerId) => {
    const res = await fetch(`${API_BASE}/waste/${id}/collect`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectedBy: workerName, collectedByUserId: workerId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to mark waste as collected');
    return data;
  },

  completeWasteRecord: async (id, workerName, workerId, binVerified = true, binMismatchNote = '') => {
    const res = await fetch(`${API_BASE}/waste/${id}/complete`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collectedBy: workerName,
        collectedByUserId: workerId,
        binVerified,
        binMismatchNote
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to mark waste as completed');
    return data;
  },

  assignWasteRecord: async (id, workerName, workerId, staffName) => {
    const res = await fetch(`${API_BASE}/waste/${id}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo: workerName, assignedToUserId: workerId, staffName })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to assign worker');
    return data;
  },

  getActiveWorkers: async () => {
    const res = await fetch(`${API_BASE}/users?role=worker&status=active`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch workers');
    return data;
  },

  // Notifications
  getNotifications: async (queryParams = {}) => {
    const params = new URLSearchParams(queryParams);
    const res = await fetch(`${API_BASE}/notifications?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch notifications');
    return data;
  },

  markNotificationRead: async (id) => {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to mark notification as read');
    return data;
  },

  markAllNotificationsRead: async (userId, role) => {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to mark notifications as read');
    return data;
  },

  sendWasteReminder: async ({ wasteRecordId, recordId, staffName, staffId, cooldownSeconds }) => {
    const res = await fetch(`${API_BASE}/notifications/reminder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wasteRecordId, recordId, staffName, staffId, cooldownSeconds })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to send reminder');
    return data;
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        username: currentUser.username,
        currentPassword,
        newPassword
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to change password');
    return data;
  }
};

