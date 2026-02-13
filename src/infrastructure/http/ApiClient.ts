/**
 * Infrastructure: ApiClient
 * Cliente HTTP centralizado para comunicação com APIs
 */

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
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
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      cache: 'no-store',
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP Error: ${response.status} - ${response.statusText}`
      );
    }

    return response.json();
  }
}
