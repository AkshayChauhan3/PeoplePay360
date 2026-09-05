// PeoplePay360 - Smart Hybrid API Client (Live FastAPI + Schema-Compliant Mock Fallback)

const DEFAULT_API_BASE = 'http://localhost:8000';

class ApiClient {
  private baseUrl: string;
  private isMockMode: boolean;
  private onModeChangeCallbacks: Array<(isMock: boolean) => void> = [];

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || DEFAULT_API_BASE;
    const savedMock = localStorage.getItem('peoplepay_mock_mode');
    this.isMockMode = savedMock !== null ? savedMock === 'true' : true;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public isMock(): boolean {
    return this.isMockMode;
  }

  public setMockMode(enabled: boolean) {
    this.isMockMode = enabled;
    localStorage.setItem('peoplepay_mock_mode', String(enabled));
    this.onModeChangeCallbacks.forEach((cb) => cb(enabled));
  }

  public subscribeModeChange(cb: (isMock: boolean) => void): () => void {
    this.onModeChangeCallbacks.push(cb);
    return () => {
      this.onModeChangeCallbacks = this.onModeChangeCallbacks.filter((c) => c !== cb);
    };
  }

  public getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  public setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  }

  public clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    mockFallbackFn?: () => T | Promise<T>
  ): Promise<T> {
    if (this.isMockMode && mockFallbackFn) {
      return Promise.resolve(mockFallbackFn());
    }

    const token = this.getAccessToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const fullUrl = `${this.baseUrl}${endpoint}`;
      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if ((response.status === 404 || response.status === 501) && mockFallbackFn) {
          console.warn(`[API] Endpoint ${endpoint} returned ${response.status}. Falling back to schema mock.`);
          return Promise.resolve(mockFallbackFn());
        }

        const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorBody.detail || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (err: any) {
      if (mockFallbackFn) {
        console.warn(`[API] Live request to ${endpoint} failed (${err.message}). Using mock fallback.`);
        return Promise.resolve(mockFallbackFn());
      }
      throw err;
    }
  }

  public get<T>(endpoint: string, mockFallbackFn?: () => T | Promise<T>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, mockFallbackFn);
  }

  public post<T>(endpoint: string, body?: any, mockFallbackFn?: () => T | Promise<T>): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      },
      mockFallbackFn
    );
  }

  public patch<T>(endpoint: string, body?: any, mockFallbackFn?: () => T | Promise<T>): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      },
      mockFallbackFn
    );
  }
}

export const apiClient = new ApiClient();
