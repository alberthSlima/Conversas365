import { NextResponse } from 'next/server';

export async function GET() {
  const base = process.env.HUB_URL;
  if (!base) {
    return NextResponse.json({ error: 'HUB_URL not set' }, { status: 500 });
  }
  const hubUrl = `${base}/hubs/conversations`;
  return NextResponse.json({ hubUrl });
}


