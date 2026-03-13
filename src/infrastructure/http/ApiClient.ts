/**
 * Infrastructure: ApiClient
 * Cliente HTTP centralizado para comunicação com APIs
 */

export class ApiClient {
  private baseUrl: string;

  /** Sem baseUrl: usa EXTERNAL_API_BASE_URL do env. Com baseUrl: usa o valor (ex: '/api'). */
  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.EXTERNAL_API_BASE_URL ?? '';
  }

  /** Base URL configurada (para validação ou montagem de URL completa). */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /** URL completa do endpoint (para uso em getTlsFetchOptions etc.). */
  getFullUrl(endpoint: string): string {
    return this.fullUrl(endpoint);
  }

  private static readonly EXTERNAL_API_NOT_CONFIGURED = 'EXTERNAL_API_BASE_URL não configurado';

  private fullUrl(endpoint: string): string {
    const base = this.baseUrl.replace(/\/$/, '').trim();
    if (!base) {
      throw new Error(ApiClient.EXTERNAL_API_NOT_CONFIGURED);
    }
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${path}`;
  }

  /**
   * Headers padrão quando a baseUrl é a API externa (Basic auth do env).
   * No client (browser) process.env não expõe essas variáveis, então retorna {}.
   */
  private getDefaultHeaders(): Record<string, string> {
    if (typeof process === 'undefined' || !process.env) return {};
    const externalBase = (process.env.EXTERNAL_API_BASE_URL || '').replace(/\/$/, '');
    const base = this.baseUrl.replace(/\/$/, '');
    if (!base || base !== externalBase) return {};
    const username = process.env.EXTERNAL_API_USERNAME?.trim();
    const password = process.env.EXTERNAL_API_PASSWORD?.trim();
    if (!username || !password) return {};
    return {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    };
  }

  private mergeHeaders(options?: RequestInit): Record<string, string> {
    const defaultHeaders = this.getDefaultHeaders();
    const optionHeaders = (options?.headers as Record<string, string>) || {};
    return { ...defaultHeaders, ...optionHeaders };
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = this.fullUrl(endpoint);
    const init: RequestInit = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...this.mergeHeaders(options) },
      cache: 'no-store',
      ...options,
    };
    const response = await fetch(url, init);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} - ${response.statusText}`);
    }
    return response.json();
  }

  /** Retorna a Response bruta (para proxy que precisa repassar status) */
  async getResponse(endpoint: string, options?: RequestInit): Promise<Response> {
    const url = this.fullUrl(endpoint);
    const init: RequestInit = {
      method: 'GET',
      headers: { Accept: 'application/json', ...this.mergeHeaders(options) },
      cache: 'no-store',
      ...options,
    };
    return fetch(url, init);
  }

  async post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    const url = this.fullUrl(endpoint);
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...this.mergeHeaders(options) },
      body: data != null ? JSON.stringify(data) : undefined,
      cache: 'no-store',
      ...options,
    };
    const response = await fetch(url, init);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: string })?.error ||
          `HTTP Error: ${response.status} - ${response.statusText}`
      );
    }
    
    // Se não há conteúdo (204), retorna objeto vazio
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }
    
    // Tenta fazer parse do JSON
    const text = await response.text();
    if (!text) return {} as T;
    
    return JSON.parse(text);
  }

  /** Retorna a Response bruta (para proxy que precisa repassar status) */
  async postResponse(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<Response> {
    const url = this.fullUrl(endpoint);
    const init: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.mergeHeaders(options),
      },
      body: data != null ? JSON.stringify(data) : undefined,
      cache: 'no-store',
      ...options,
    };
    return fetch(url, init);
  }

  /** PUT e retorna a Response bruta (para proxy) */
  async putResponse(
    endpoint: string,
    data?: unknown,
    options?: RequestInit
  ): Promise<Response> {
    const url = this.fullUrl(endpoint);
    const init: RequestInit = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.mergeHeaders(options),
      },
      body: data != null ? JSON.stringify(data) : undefined,
      cache: 'no-store',
      ...options,
    };
    return fetch(url, init);
  }
}
