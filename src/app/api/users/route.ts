import { NextResponse } from 'next/server';
import type { Dispatcher } from 'undici';

// GET /api/users?pageNumber=&pageSize=&username=&role=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const base = process.env.EXTERNAL_API_BASE_URL || '';
  if (!base) return NextResponse.json({ error: 'EXTERNAL_API_BASE_URL not set' }, { status: 500 });

  const pageNumber = Number(searchParams.get('pageNumber') ?? searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? searchParams.get('size') ?? '10');
  const username = searchParams.get('username') ?? '';
  const role = searchParams.get('role') ?? '';
  const sortBy = searchParams.get('sortBy') ?? '';
  const desc = (searchParams.get('desc') ?? '').toLowerCase();

  const qs = new URLSearchParams();
  qs.set('pageNumber', String(pageNumber));
  qs.set('pageSize', String(pageSize));
  if (username) qs.set('username', username);
  if (role) qs.set('role', role);
  if (sortBy) qs.set('sortBy', sortBy);
  if (desc === 'true' || desc === '1') qs.set('desc', 'true');

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

  const url = `${base}/Users`;
  type RequestInitWithDispatcher = RequestInit & { dispatcher?: Dispatcher };
  const fetchOptions: RequestInitWithDispatcher = { headers, cache: 'no-store' };
  try {
    const target = new URL(url);
    const allowInsecure = (process.env.ALLOW_INSECURE_TLS === 'true');
    if (allowInsecure && target.protocol === 'https:') {
      const undici = await import('undici');
      fetchOptions.dispatcher = new undici.Agent({ connect: { rejectUnauthorized: false } });
    }
  } catch {}
  const res = await fetch(`${url}?${qs.toString()}`, fetchOptions);
  const txt = await res.text().catch(() => '');
  return new NextResponse(txt || '[]', { status: res.status });
}

// POST /api/users -> cria usuário { username, password, role }
export async function POST(req: Request) {
  const base = process.env.EXTERNAL_API_BASE_URL || '';
  if (!base) return NextResponse.json({ error: 'EXTERNAL_API_BASE_URL not set' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  const appAuth = req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('app_auth='))?.split('=')[1];
  if (appAuth) {
    let token = appAuth;
    try {
      token = decodeURIComponent(token);
      if (/%[0-9A-Fa-f]{2}/.test(token)) token = decodeURIComponent(token);
    } catch {}
    headers['Authorization'] = token.replace(/^Basic%20/i, 'Basic ');
  }
  type RequestInitWithDispatcher = RequestInit & { dispatcher?: Dispatcher };
  const fetchOptions: RequestInitWithDispatcher = { method: 'POST', headers, body: JSON.stringify(body) };
  try {
    const target = new URL(`${base}/Users`);
    const allowInsecure = (process.env.ALLOW_INSECURE_TLS === 'true');
    if (allowInsecure && target.protocol === 'https:') {
      const undici = await import('undici');
      fetchOptions.dispatcher = new undici.Agent({ connect: { rejectUnauthorized: false } });
    }
  } catch {}
  const res = await fetch(`${base}/Users`, fetchOptions);
  const txt = await res.text().catch(() => '');
  return new NextResponse(txt, { status: res.status });
}


