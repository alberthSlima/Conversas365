import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ ok: false, error: 'username/password required' }, { status: 400 });
    }

    const base = process.env.EXTERNAL_API_BASE_URL;
    if (!base) return NextResponse.json({ ok: false, error: 'EXTERNAL_API_BASE_URL not set' }, { status: 500 });

    const url = `${base.replace(/\/+$/, '')}/api/v1/Users/auth`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return NextResponse.json({ ok: false, status: res.status, body: txt }, { status: 401 });
    }

    // API retorna JSON: { id, username, role, authorization }
    interface ApiAuthResponse {
      id: number;
      username: string;
      role: string;
      authorization: string;
    }
    const payload: ApiAuthResponse = await res.json();
    const authHeader: string | undefined = payload.authorization;
    if (!authHeader) {
      return NextResponse.json({ ok: false, error: 'authorization ausente no body' }, { status: 502 });
    }

    const out = NextResponse.json({ ok: true, user: { id: payload?.id, username: payload?.username, role: payload?.role } });
    out.cookies.set({
      name: 'app_auth',
      value: authHeader,
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


