// Base URL for the API — proxied through Vite in dev, direct in production
const BASE_URL = '/api/v1';

// ---------------------------------------------------------------------------
// Token helpers (localStorage)
// ---------------------------------------------------------------------------

export const getAccessToken = () => localStorage.getItem('pp360_access_token');
export const getRefreshToken = () => localStorage.getItem('pp360_refresh_token');

export const saveTokens = (accessToken, refreshToken) => {
  localStorage.setItem('pp360_access_token', accessToken);
  if (refreshToken) localStorage.setItem('pp360_refresh_token', refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem('pp360_access_token');
  localStorage.removeItem('pp360_refresh_token');
};

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

const apiFetch = async (path, options = {}) => {
  const token = getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw { status: response.status, detail: errorBody.detail || 'Request failed' };
  }

  // 204 No Content — return null
  if (response.status === 204) return null;

  return response.json();
};

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

/**
 * Login with email and password.
 * Returns { access_token, refresh_token, token_type }
 */
export const login = async (email, password) => {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  saveTokens(data.access_token, data.refresh_token);
  return data;
};

/**
 * Register a new user.
 */
export const register = async (empId, email, password, role = 'employee') => {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ emp_id: empId, email, password, role }),
  });
};

/**
 * Get the currently authenticated user.
 */
export const getMe = async () => {
  return apiFetch('/auth/me');
};

/**
 * Refresh the access token using the refresh token.
 */
export const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token available');

  const data = await apiFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  saveTokens(data.access_token, data.refresh_token);
  return data;
};

/**
 * Logout — clear local tokens.
 */
export const logout = () => {
  clearTokens();
};

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export const healthCheck = async () => {
  return apiFetch('/health');
};
