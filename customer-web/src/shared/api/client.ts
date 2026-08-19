export interface ApiResponse<T> {
  message: string;
  data: T;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const getTenantSlug = () => {
  // Option B: Dynamic subdomain or localhost fallback
  const hostname = window.location.hostname;
  
  // If localhost or IP address
  if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
    // Check URL query first ?slug=xxx
    const urlParams = new URLSearchParams(window.location.search);
    const slugFromUrl = urlParams.get('slug');
    if (slugFromUrl) {
      localStorage.setItem('tenant_slug', slugFromUrl);
      return slugFromUrl;
    }
    // Fallback to localStorage or default
    return localStorage.getItem('tenant_slug') || 'radbill';
  }

  // Production: extract subdomain (e.g. majujaya.radbill.id -> majujaya)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  
  return 'radbill';
};

export const getApiBaseUrl = () => import.meta.env.VITE_API_URL || '/api';

export const buildPublicApiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
};

export const fetchApi = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  const token = localStorage.getItem('customer_access_token');
  const slug = getTenantSlug();

  const baseUrl = getApiBaseUrl();

  const headers = new Headers(options.headers);
  headers.set('X-Tenant-Slug', slug);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  const payload = (await response.json()) as ApiResponse<T> & { message?: string };

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('customer_access_token');
    }
    throw new ApiError(payload.message || 'Terjadi kesalahan pada server', response.status);
  }

  return payload;
};

export const fetchPublicApi = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
  const slug = getTenantSlug();
  const baseUrl = getApiBaseUrl();

  const headers = new Headers(options.headers);
  headers.set('X-Tenant-Slug', slug);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  const payload = (await response.json()) as ApiResponse<T> & { message?: string };

  if (!response.ok) {
    throw new ApiError(payload.message || 'Terjadi kesalahan pada server', response.status);
  }

  return payload;
};
