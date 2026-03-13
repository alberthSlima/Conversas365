/**
 * Opções de fetch para TLS inseguro (apenas servidor).
 * Só deve ser importado em API routes / server code.
 */

export type RequestInitWithDispatcher = RequestInit & { dispatcher?: unknown };

export async function getTlsFetchOptions(fullUrl: string): Promise<RequestInitWithDispatcher> {
  if (process.env.ALLOW_INSECURE_TLS !== 'true') return {};
  try {
    const target = new URL(fullUrl);
    if (target.protocol !== 'https:') return {};
    const undici = await import('undici');
    return {
      dispatcher: new undici.Agent({ 
        connect: { 
          rejectUnauthorized: false 
        },
        headersTimeout: 60000, // 60 segundos
        bodyTimeout: 60000 // 60 segundos
      }),
    };
  } catch {
    return {};
  }
}
