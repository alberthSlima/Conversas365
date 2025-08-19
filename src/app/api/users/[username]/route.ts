import { NextResponse } from 'next/server';
import type { Dispatcher } from 'undici';

// GET /api/users/{username}
export async function GET(req: Request) {
  const base = process.env.EXTERNAL_API_BASE_URL || '';
  if (!base) return NextResponse.json({ error: 'EXTERNAL_API_BASE_URL not set' }, { status: 500 });
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const username = decodeURIComponent(parts[parts.length - 1] || '');
  const headers: Record<string, string> = { 'Accept': 'application/json' };
  // Autorização (admin)
  try {
    // Não temos o objeto req aqui por assinatura, então GET por username não será utilizado por enquanto.
  } catch {}
  type RequestInitWithDispatcher = RequestInit & { dispatcher?: Dispatcher };
  const fetchOptions: RequestInitWithDispatcher = { headers, cache: 'no-store' };
  try {
    const target = new URL(`${base}/Users/${encodeURIComponent(username)}`);
    const allowInsecure = (process.env.ALLOW_INSECURE_TLS === 'true');
    if (allowInsecure && target.protocol === 'https:') {
      const undici = await import('undici');
      fetchOptions.dispatcher = new undici.Agent({ connect: { rejectUnauthorized: false } });
    }
  } catch {}
  const res = await fetch(`${base}/Users/${encodeURIComponent(username)}`, fetchOptions);
  const txt = await res.text().catch(() => '');
  return new NextResponse(txt || '{}', { status: res.status });
}

// PUT /api/users/{id} -> atualizar senha/perfil
export async function PUT(req: Request) {
  const base = process.env.EXTERNAL_API_BASE_URL || '';
  if (!base) return NextResponse.json({ error: 'EXTERNAL_API_BASE_URL not set' }, { status: 500 });
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const idOrUsername = decodeURIComponent(parts[parts.length - 1] || ''); // backend aceita {id}
  const body = await req.json().catch(() => ({}));
  const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  // Copiar Authorization do cookie admin
  const appAuth = req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('app_auth='))?.split('=')[1];
  if (appAuth) {
    let token = appAuth;
    try {
      token = decodeURIComponent(token);
      if (/%[0-9A-Fa-f]{2}/.test(token)) token = decodeURIComponent(token);
    } catch {}
    headers['Authorization'] = token.replace(/^Basic%20/i, 'Basic ');
  }
  type RequestInitWithDispatcher2 = RequestInit & { dispatcher?: Dispatcher };
  const fetchOptions2: RequestInitWithDispatcher2 = { method: 'PUT', headers, body: JSON.stringify(body) };
  try {
    const target = new URL(`${base}/Users/${encodeURIComponent(idOrUsername)}`);
    const allowInsecure = (process.env.ALLOW_INSECURE_TLS === 'true');
    if (allowInsecure && target.protocol === 'https:') {
      const undici = await import('undici');
      fetchOptions2.dispatcher = new undici.Agent({ connect: { rejectUnauthorized: false } });
    }
  } catch {}
  const res = await fetch(`${base}/Users/${encodeURIComponent(idOrUsername)}`, fetchOptions2);
  const txt = await res.text().catch(() => '');
  return new NextResponse(txt, { status: res.status });
}


