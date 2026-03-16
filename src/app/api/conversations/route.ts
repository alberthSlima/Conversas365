import { NextResponse } from 'next/server';
import { ApiClient } from '@/libs/api';
import { getTlsFetchOptions } from '@/lib/serverTls';

// Proxy para o backend: GET /api/conversations?phone=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

  const client = new ApiClient();

  const headers: Record<string, string> = { Accept: 'application/json' };
  const appAuth = req.headers.get('cookie')?.split(';').map((s) => s.trim()).find((s) => s.startsWith('app_auth='))?.split('=')[1];
  if (appAuth) {
    let token = appAuth;
    try {
      token = decodeURIComponent(token);
      if (/%[0-9A-Fa-f]{2}/.test(token)) token = decodeURIComponent(token);
    } catch {}
    headers['Authorization'] = token.replace(/^Basic%20/i, 'Basic ');
  }

  try {
    const endpoint = `/api/v2/conversations/${encodeURIComponent(phone)}`;
    const tlsOpts = await getTlsFetchOptions(client.getFullUrl(endpoint));
    const res = await client.getResponse(endpoint, { ...tlsOpts, headers });
    const rawJson: unknown = await res.json().catch(() => ([]));
    return NextResponse.json({ data: rawJson }, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


