import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // não usamos mais supabase; manter rota para compatibilidade
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}


