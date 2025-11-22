/**
 * API Utilities for NutriChain Frontend
 * Centralized API configuration and helper functions
 */

// API Base URL - can be configured for different environments
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Auth token management
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
};

export const getUser = (): any | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
};

export const setUser = (user: any): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

// API Request Helper
interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  requireAuth?: boolean;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, requireAuth = false } = options;

  const url = `${API_BASE_URL}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add auth token if required
  if (requireAuth) {
    const token = getToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(url, requestOptions);

  // Handle non-JSON responses (like HTML error pages)
  const contentType = response.headers.get('content-type');
  let data;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    // If response is not JSON (e.g., HTML error page)
    const text = await response.text();
    data = {
      error: 'Server returned non-JSON response',
      message: response.statusText || 'Request failed',
      statusCode: response.status
    };
  }

  if (!response.ok) {
    const error = new Error(data.error || data.message || `Request failed with status ${response.status}`);
    (error as any).response = { data, status: response.status };
    throw error;
  }

  return data;
}

// Auth API
export const authApi = {
  async login(email: string, password: string) {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  async register(email: string, password: string, role: string, name: string) {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: { email, password, role, name },
    });
  },

  async registerAdmin(email: string, password: string, name: string, inviteCode: string) {
    return apiRequest('/api/auth/register-admin', {
      method: 'POST',
      body: { email, password, name, inviteCode },
    });
  },

  logout() {
    removeToken();
  },
};

// Deliveries API
export const deliveriesApi = {
  async getAll(params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/api/deliveries${query}`, { requireAuth: true });
  },

  async getById(id: string | number) {
    return apiRequest(`/api/deliveries/${id}`, { requireAuth: true });
  },

  async create(data: any) {
    return apiRequest('/api/deliveries', {
      method: 'POST',
      body: data,
      requireAuth: true,
    });
  },

  async updateStatus(id: string | number, status: string) {
    return apiRequest(`/api/deliveries/${id}/status`, {
      method: 'PATCH',
      body: { status },
      requireAuth: true,
    });
  },
};

// Verifications API
export const verificationsApi = {
  async getAll(params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/api/verifications${query}`, { requireAuth: true });
  },

  async getById(id: string | number) {
    return apiRequest(`/api/verifications/${id}`, { requireAuth: true });
  },

  async create(data: any) {
    return apiRequest('/api/verifications', {
      method: 'POST',
      body: data,
      requireAuth: true,
    });
  },

  async getStats() {
    return apiRequest('/api/verifications/stats/summary', { requireAuth: true });
  },
};

// Schools API
export const schoolsApi = {
  async getAll(params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/api/schools${query}`, { requireAuth: true });
  },

  async getById(id: string | number) {
    return apiRequest(`/api/schools/${id}`, { requireAuth: true });
  },
};

// Caterings API
export const cateringsApi = {
  async getAll(params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/api/caterings${query}`, { requireAuth: true });
  },

  async getById(id: string | number) {
    return apiRequest(`/api/caterings/${id}`, { requireAuth: true });
  },

  async create(data: any) {
    return apiRequest('/api/caterings', {
      method: 'POST',
      body: data,
      requireAuth: true,
    });
  },

  async update(id: string | number, data: any) {
    return apiRequest(`/api/caterings/${id}`, {
      method: 'PATCH',
      body: data,
      requireAuth: true,
    });
  },

  async getDeliveries(id: string | number, params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/api/caterings/${id}/deliveries${query}`, { requireAuth: true });
  },

  async getStats(id: string | number) {
    return apiRequest(`/api/caterings/${id}/stats`, { requireAuth: true });
  },
};

// Issues API
export const issuesApi = {
  async getAll(params?: Record<string, any>) {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiRequest(`/api/issues${query}`, { requireAuth: true });
  },

  async getById(id: string | number) {
    return apiRequest(`/api/issues/${id}`, { requireAuth: true });
  },

  async create(data: any) {
    // Handle FormData separately (for file uploads)
    if (data instanceof FormData) {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/issues`, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: data,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Request failed');
      }

      return result;
    }

    // Regular JSON request
    return apiRequest('/api/issues', {
      method: 'POST',
      body: data,
      requireAuth: true,
    });
  },

  async updateStatus(id: string | number, status: string, resolution_notes?: string) {
    return apiRequest(`/api/issues/${id}/status`, {
      method: 'PATCH',
      body: { status, resolution_notes },
      requireAuth: true,
    });
  },

  async getStats() {
    return apiRequest('/api/issues/stats/summary', { requireAuth: true });
  },
};

// Analytics API
export const analyticsApi = {
  async getDashboard() {
    return apiRequest('/api/analytics/dashboard', { requireAuth: true });
  },

  async getRecentActivity(limit?: number) {
    const query = limit ? `?limit=${limit}` : '';
    return apiRequest(`/api/analytics/recent-activity${query}`, { requireAuth: true });
  },

  async getTrends(period?: string) {
    const query = period ? `?period=${period}` : '';
    return apiRequest(`/api/analytics/trends${query}`, { requireAuth: true });
  },
};

// Default export object dengan semua API dan generic HTTP methods
const api = {
  // Named API exports
  auth: authApi,
  deliveries: deliveriesApi,
  verifications: verificationsApi,
  schools: schoolsApi,
  caterings: cateringsApi,
  issues: issuesApi,
  analytics: analyticsApi,

  // Generic HTTP methods untuk backward compatibility
  async get(endpoint: string, config?: { params?: Record<string, any> }) {
    const query = config?.params ? `?${new URLSearchParams(config.params).toString()}` : '';
    return apiRequest(`${endpoint}${query}`, { requireAuth: true });
  },

  async post(endpoint: string, data?: any) {
    return apiRequest(endpoint, {
      method: 'POST',
      body: data,
      requireAuth: true,
    });
  },

  async put(endpoint: string, data?: any) {
    return apiRequest(endpoint, {
      method: 'PUT',
      body: data,
      requireAuth: true,
    });
  },

  async patch(endpoint: string, data?: any) {
    return apiRequest(endpoint, {
      method: 'PATCH',
      body: data,
      requireAuth: true,
    });
  },

  async delete(endpoint: string) {
    return apiRequest(endpoint, {
      method: 'DELETE',
      requireAuth: true,
    });
  },
};

export default api;
