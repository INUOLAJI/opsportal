const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://opsportal-backend-n1jf.onrender.com/api';

export const getAccessToken = () => {
  return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken') || null;
};

export const getRefreshToken = () => {
  return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken') || null;
};

export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.clear();
};

// Browsers can't set custom headers on a WebSocket connection, so the access
// token rides along as a query param instead — read and validated server-side
// by api/jwt_auth_middleware.py.
export const getWebSocketUrl = () => {
  const token = getAccessToken();
  const httpBase = API_BASE_URL.replace(/\/api\/?$/, '');
  const wsBase = httpBase.replace(/^http/, 'ws');
  return `${wsBase}/ws/dashboard/?token=${encodeURIComponent(token || '')}`;
};

async function customFetch(endpoint, options = {}) {
  const token = getAccessToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    // Let the browser set 'Content-Type: multipart/form-data; boundary=...'
    // itself for file uploads — setting it manually breaks the boundary.
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // If 401 Unauthorized, attempt refresh token token
  if (response.status === 401 && !options._retry) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: refreshToken }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const newAccess = refreshData.access;

          if (localStorage.getItem('refreshToken')) {
            localStorage.setItem('accessToken', newAccess);
          } else {
            sessionStorage.setItem('accessToken', newAccess);
          }

          headers['Authorization'] = `Bearer ${newAccess}`;
          response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            _retry: true,
          });
        } else {
          clearTokens();
          window.location.href = '/signin';
        }
      } catch (err) {
        clearTokens();
        window.location.href = '/signin';
      }
    }
  }

  return response;
}

// Auth API Service
export const authService = {
  signIn: async (email, password, role) => {
    const response = await fetch(`${API_BASE_URL}/auth/signin/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.detail || 'Authentication failed');
      error.response = { data, status: response.status };
      throw error;
    }
    return data;
  },

  signUp: async (full_name, email, password, role, companyData = {}) => {
    const token = getAccessToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/auth/signup/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        full_name, 
        email, 
        password, 
        role,
        company_name: companyData.company_name,
        company_phone: companyData.company_phone,
        company_address: companyData.company_address,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      let detailMsg = data.detail;
      if (!detailMsg && typeof data === 'object') {
        const firstKey = Object.keys(data)[0];
        if (firstKey && Array.isArray(data[firstKey])) {
          detailMsg = `${firstKey}: ${data[firstKey][0]}`;
        } else if (firstKey && typeof data[firstKey] === 'string') {
          detailMsg = `${firstKey}: ${data[firstKey]}`;
        }
      }
      const error = new Error(detailMsg || 'Registration failed');
      error.response = { data, status: response.status };
      throw error;
    }
    return data;
  },

  // uid/token come from the query params on the /verify-email link staff get by email.
  verifyEmail: async (uid, token) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-email/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, token }),
    });

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.detail || 'Verification failed');
      error.response = { data, status: response.status };
      throw error;
    }
    return data;
  },

  // Always resolves with a generic message, even for unknown emails —
  // matches the backend's response, which never confirms whether an
  // account exists.
  resendVerification: async (email) => {
    const response = await fetch(`${API_BASE_URL}/auth/resend-verification/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.detail || 'Could not resend verification email');
      error.response = { data, status: response.status };
      throw error;
    }
    return data;
  },

  changePassword: async (current_password, new_password) => {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/auth/change-password/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ current_password, new_password }),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.detail || 'Could not change password');
      error.response = { data, status: response.status };
      throw error;
    }
    return data;
  },

  completeProfile: async (payload) => {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/auth/complete-profile/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.detail || 'Could not complete profile');
      error.response = { data, status: response.status };
      throw error;
    }
    return data;
  },
};

// Tasks API Service
export const tasksService = {
  getAll: async () => {
    const res = await customFetch('/tasks/');
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },
  create: async (taskData) => {
    const res = await customFetch('/tasks/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create task');
    }
    return res.json();
  },
  update: async (id, taskData) => {
    const res = await customFetch(`/tasks/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(taskData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update task');
    }
    return res.json();
  },
  delete: async (id) => {
    const res = await customFetch(`/tasks/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete task');
    return true;
  },
  // Staff-only action: flag a task assigned to them as ready for admin review.
  requestCompletion: async (id) => {
    const res = await customFetch(`/tasks/${id}/request-completion/`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to request completion review');
    }
    return res.json();
  },
  uploadAttachment: async (taskId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await customFetch(`/tasks/${taskId}/attachments/`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload attachment');
    }
    return res.json();
  },
  deleteAttachment: async (taskId, attId) => {
    const res = await customFetch(`/tasks/${taskId}/attachments/${attId}/`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete attachment');
    }
    return true;
  },
};

// Documents API Service
export const documentsService = {
  getAll: async () => {
    const res = await customFetch('/documents/');
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },
  // formData must be a FormData instance with 'title', 'category', and 'file' appended.
  create: async (formData) => {
    const res = await customFetch('/documents/', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err.detail || err.file?.[0] || err.title?.[0] || 'Failed to upload document';
      throw new Error(message);
    }
    return res.json();
  },
  delete: async (id) => {
    const res = await customFetch(`/documents/${id}/`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete document');
    return true;
  },
};

// Activity API Service
export const activityService = {
  getAll: async () => {
    const res = await customFetch('/activity/');
    if (!res.ok) throw new Error('Failed to fetch activity logs');
    return res.json();
  },
  markAllRead: async () => {
    const res = await customFetch('/activity/mark-all-read/', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to mark notifications as read');
    return res.json();
  },
};

// Users API Service
export const usersService = {
  // Pass role='staff' (or 'admin') to filter server-side — e.g. the task
  // assignee dropdown only wants staff, while the Team page wants everyone.
  getAll: async (role) => {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    const res = await customFetch(`/users/${query}`);
    if (!res.ok) throw new Error('Failed to fetch team users');
    return res.json();
  },
  // Admin-only. Permanently deletes the account and everything tied to
  // it (their uploaded documents, activity log) — irreversible.
  remove: async (id) => {
    const res = await customFetch(`/users/${id}/`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to remove team member');
    }
    return true;
  },
};

// Platform Settings API Service — a single global row; PATCH and rotate-secret
// are admin-only server-side (403 for staff), so the frontend just treats
// the form as read-only for non-admins rather than hiding it.
export const settingsService = {
  get: async () => {
    const res = await customFetch('/settings/');
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },
  update: async (patch) => {
    const res = await customFetch('/settings/', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update settings');
    }
    return res.json();
  },
  rotateSecret: async () => {
    const res = await customFetch('/settings/rotate-secret/', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to rotate the secret key');
    }
    return res.json();
  },
};

export default customFetch;