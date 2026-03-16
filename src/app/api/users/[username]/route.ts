import { NextResponse } from 'next/server';
import { ApiClient } from '@/libs/api';
import { getTlsFetchOptions } from '@/lib/serverTls';

// GET /api/users/{username}
export async function GET(req: Request) {
  const client = new ApiClient();
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const username = decodeURIComponent(parts[parts.length - 1] || '');
  const headers: Record<string, string> = { Accept: 'application/json' };

  const endpoint = `/Users/${encodeURIComponent(username)}`;
  const tlsOpts = await getTlsFetchOptions(client.getFullUrl(endpoint));
  const res = await client.getResponse(endpoint, { ...tlsOpts, headers });
  const txt = await res.text().catch(() => '');
  return new NextResponse(txt || '{}', { status: res.status });
}

// PUT /api/users/{id} -> atualizar senha/perfil
export async function PUT(req: Request) {
  const client = new ApiClient();
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const idOrUsername = decodeURIComponent(parts[parts.length - 1] || '');
  const body = await req.json().catch(() => ({}));
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': 'application/json' };
  const appAuth = req.headers.get('cookie')?.split(';').map((s) => s.trim()).find((s) => s.startsWith('app_auth='))?.split('=')[1];
  if (appAuth) {
    let token = appAuth;
    try {
      token = decodeURIComponent(token);
      if (/%[0-9A-Fa-f]{2}/.test(token)) token = decodeURIComponent(token);
    } catch {}
    headers['Authorization'] = token.replace(/^Basic%20/i, 'Basic ');
  }

  const putEndpoint = `/Users/${encodeURIComponent(idOrUsername)}`;
  const tlsOptsPut = await getTlsFetchOptions(client.getFullUrl(putEndpoint));
  const res = await client.putResponse(putEndpoint, body, { ...tlsOptsPut, headers });
  const txt = await res.text().catch(() => '');
  return new NextResponse(txt, { status: res.status });
}


