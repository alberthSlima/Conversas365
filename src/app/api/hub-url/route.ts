import { NextResponse } from 'next/server';

export async function GET() {
  const base = process.env.EXTERNAL_API_BASE_URL;
  if (!base) {
    return NextResponse.json({ error: 'EXTERNAL_API_BASE_URL not set' }, { status: 500 });
  }
  const trimmed = base.replace(/\/+$/, '');
  const hostBase = trimmed.replace(/\/api\/v1\/?$/i, '');
  const hubUrl = `${hostBase}/hubs/conversations`;
  return NextResponse.json({ hubUrl });
}


