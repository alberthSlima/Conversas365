import { NextResponse } from 'next/server';
import type { Dispatcher } from 'undici';

// Proxy para o backend: GET /api/conversations?phone=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

  const baseUrl = process.env.EXTERNAL_API_BASE_URL || '';
  if (!baseUrl) {
    return NextResponse.json({ error: 'EXTERNAL_API_BASE_URL não configurado no ambiente do web' }, { status: 500 });
  }

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  const appAuth = req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('app_auth='))?.split('=')[1];
  if (appAuth) {
    let token = appAuth;
    try {
      token = decodeURIComponent(token);
      if (/%[0-9A-Fa-f]{2}/.test(token)) token = decodeURIComponent(token);
    } catch {}
    headers['Authorization'] = token.replace(/^Basic%20/i, 'Basic ');
  }

  try {
    const apiRoot = baseUrl; // usar exatamente a variável de ambiente
    let url = `${apiRoot}/Offers/Conversations?phone=${encodeURIComponent(phone)}`;
    type RequestInitWithDispatcher = RequestInit & { dispatcher?: Dispatcher };
    const fetchOptions: RequestInitWithDispatcher = { headers, cache: 'no-store' };
    try {
      const target = new URL(url);
      const allowInsecure = (process.env.ALLOW_INSECURE_TLS === 'true');
      const isLocalHttps = target.protocol === 'https:' && (target.hostname === 'localhost' || target.hostname === '127.0.0.1');
      if (allowInsecure && isLocalHttps) {
        const undici = await import('undici');
        fetchOptions.dispatcher = new undici.Agent({ connect: { rejectUnauthorized: false } });
      }
    } catch {}
    let res = await fetch(url, fetchOptions);
    if (!res.ok && (res.status === 404 || res.status === 405)) {
      // Fallback para /Conversations sem prefixo Offers
      url = `${apiRoot}/Conversations?phone=${encodeURIComponent(phone)}`;
      res = await fetch(url, fetchOptions);
    }
    const rawJson: unknown = await res.json().catch(() => ([]));
    return NextResponse.json({ data: rawJson }, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


