// PeoplePay360 - HTTP API Client with JWT Bearer Token Handling
const API_URL = import.meta.env.VITE_API_URL || '';

class ApiClient {
  constructor() {
    this.baseUrl = API_URL;
  }

  getAccessToken() {
    return localStorage.getItem('access_token');
  }

  getToken() {
    return this.getAccessToken();
  }

  setTokens(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem('access_token', accessToken);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
  }

  setAuth(accessToken, user = null) {
    if (accessToken) this.setTokens(accessToken);
    if (user) this.setStoredUser(user);
  }

  clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
  }

  getStoredUser() {
    try {
      const u = localStorage.getItem('current_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  setStoredUser(user) {
    if (user) {
      localStorage.setItem('current_user', JSON.stringify(user));
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAccessToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Token expired or invalid
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:unauthorized', { detail: { endpoint } }));
        }
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        let message = `Request failed with status ${response.status}`;
        if (typeof errBody.detail === 'string') {
          message = errBody.detail;
        } else if (Array.isArray(errBody.detail)) {
          message = errBody.detail.map(d => d.msg || (d.loc ? `${d.loc.slice(-1)}: required` : JSON.stringify(d))).join(', ');
        } else if (errBody.detail && typeof errBody.detail === 'object') {
          message = JSON.stringify(errBody.detail);
        } else if (errBody.message) {
          message = errBody.message;
        }
        const error = new Error(message);
        error.status = response.status;
        error.data = errBody;
        throw error;
      }

      if (response.status === 204) {
        return { success: true };
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    } catch (err) {
      // Re-throw so caller can decide or use mock fallback
      throw err;
    }
  }

  async downloadBlob(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getAccessToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }
    return await response.blob();
  }

  get(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'GET', headers });
  }

  post(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers,
    });
  }

  patch(endpoint, body, headers = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers,
    });
  }

  delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new ApiClient();
