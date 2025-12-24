import { NextResponse } from 'next/server';
import type { Dispatcher } from 'undici';

export async function POST(req: Request) {
  try {
    // aceita JSON e form-urlencoded
    let username: string | undefined;
    let password: string | undefined;
    try {
      const ct = req.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const body = await req.json();
        username = body?.username;
        password = body?.password;
      } 
    } catch {}

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'username/password required' }, { status: 400 });
    }

    const base = process.env.EXTERNAL_API_BASE_URL || '';
    if (!base) return NextResponse.json({ ok: false, error: 'EXTERNAL_API_BASE_URL not set' }, { status: 500 });

    const apiRoot = base; 
    // v2 endpoint
    const url = `${apiRoot}/api/v2/users/auth`;
    type RequestInitWithDispatcher = RequestInit & { dispatcher?: Dispatcher };
    const fetchOptions: RequestInitWithDispatcher = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain',
      },
      body: JSON.stringify({ username, password }),
    };
    try {
      const target = new URL(url);
      const allowInsecure = (process.env.ALLOW_INSECURE_TLS === 'true');
      const isLocalHttps = target.protocol === 'https:' && (target.hostname === 'localhost' || target.hostname === '127.0.0.1');
      if (allowInsecure && isLocalHttps) {
        const undici = await import('undici');
        fetchOptions.dispatcher = new undici.Agent({ connect: { rejectUnauthorized: false } });
      }
    } catch {}
    const res = await fetch(url, fetchOptions);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return new NextResponse(txt || 'Upstream error', { status: res.status });
    }

    // Tentar ler token do header Authorization ou do corpo JSON
    const authorizationFromHeader = res.headers.get('authorization') ?? res.headers.get('Authorization') ?? undefined;

    // Corpo pode estar vazio; tratar com segurança
    let payload: unknown = undefined;
    try {
      payload = await res.json();
    } catch {
      payload = undefined;
    }

    interface ApiAuthResponse {
      id?: number;
      username?: string;
      role?: string;
      authorization?: string;
    }

    const data: ApiAuthResponse = (payload && typeof payload === 'object') ? (payload as ApiAuthResponse) : {};
    const tokenCandidate = authorizationFromHeader
      ?? data.authorization

    if (!tokenCandidate) {
      // tenta último recurso: ler texto puro
      try {
        const rawText = await res.clone().text();
        if (rawText && rawText.startsWith('Basic ')) {
          const out = NextResponse.json({ ok: true, user: { id: data?.id, username: data?.username, role: data?.role } });
          out.cookies.set({ name: 'app_auth', value: encodeURIComponent(rawText), httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60*60*8 });
          return out;
        }
      } catch {}
      return NextResponse.json({ ok: false, error: 'authorization ausente (nem header nem body)' }, { status: 502 });
    }

    const out = NextResponse.json({ ok: true, user: { id: data?.id, username: data?.username, role: data?.role } });
    out.cookies.set({
      name: 'app_auth',
      value: encodeURIComponent(tokenCandidate),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    return out;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


