import { NextResponse } from 'next/server';

export async function POST() {
  const out = NextResponse.json({ ok: true });
  out.cookies.set({ name: 'app_auth', value: '', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV==='production', path: '/', maxAge: 0 });
  return out;
}


