import { NextResponse } from 'next/server';
import { ApiClient } from '@/libs/api';
import { getTlsFetchOptions } from '@/lib/serverTls';

export async function POST(req: Request) {
  try {
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

    const client = new ApiClient();
    const authEndpoint = '/api/v2/users/auth';
    const tlsOpts = await getTlsFetchOptions(client.getFullUrl(authEndpoint));
    const res = await client.postResponse(authEndpoint, { username, password }, tlsOpts);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return new NextResponse(txt || 'Upstream error', { status: res.status });
    }

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


