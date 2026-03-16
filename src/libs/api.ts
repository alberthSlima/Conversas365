import { env } from '@/utils/env';

/**
 * Cliente HTTP para API Externa (Medeiros)
 * Centraliza comunicação com backend externo
 */

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? env.EXTERNAL_API_BASE_URL;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getFullUrl(endpoint: string): string {
    return this.buildUrl(endpoint);
  }

  private buildUrl(endpoint: string): string {
    const base = this.baseUrl.replace(/\/$/, '').trim();
    if (!base) {
      throw new Error('EXTERNAL_API_BASE_URL não configurado');
    }
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  private getAuthHeaders(): HeadersInit {
    if (typeof window !== 'undefined') return {};
    
    const username = env.EXTERNAL_API_USERNAME;
    const password = env.EXTERNAL_API_PASSWORD;
    
    if (!username || !password) return {};

    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
    };
  }

  private mergeHeaders(options?: RequestInit): HeadersInit {
    const authHeaders = this.getAuthHeaders();
    const optionHeaders = (options?.headers as Record<string, string>) || {};
    return { ...authHeaders, ...optionHeaders };
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...this.mergeHeaders(options),
      },
      cache: 'no-store',
      ...options,
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.mergeHeaders(options),
      },
      body: data ? JSON.stringify(data) : undefined,
      cache: 'no-store',
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: string })?.error ||
          `HTTP Error: ${response.status} - ${response.statusText}`
      );
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    const text = await response.text();
    if (!text) return {} as T;

    return JSON.parse(text);
  }

  async getResponse(endpoint: string, options?: RequestInit): Promise<Response> {
    const url = this.buildUrl(endpoint);
    return fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...this.mergeHeaders(options),
      },
      cache: 'no-store',
      ...options,
    });
  }

  async postResponse(endpoint: string, data?: unknown, options?: RequestInit): Promise<Response> {
    const url = this.buildUrl(endpoint);
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.mergeHeaders(options),
      },
      body: data ? JSON.stringify(data) : undefined,
      cache: 'no-store',
      ...options,
    });
  }

  async putResponse(endpoint: string, data?: unknown, options?: RequestInit): Promise<Response> {
    const url = this.buildUrl(endpoint);
    return fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.mergeHeaders(options),
      },
      body: data ? JSON.stringify(data) : undefined,
      cache: 'no-store',
      ...options,
    });
  }
}

/**
 * Instância padrão do cliente
 */
export const apiClient = new ApiClient();
