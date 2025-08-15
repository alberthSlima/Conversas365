import { NextResponse } from 'next/server';

// Proxy para o backend. Não acessa mais o banco diretamente.
// Suporta aliases: page/pageNumber e size/pageSize.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // aliases aceitos
  const pageNumberStr = searchParams.get('pageNumber') ?? searchParams.get('page') ?? '1';
  const pageSizeStr = searchParams.get('pageSize') ?? searchParams.get('size') ?? '10';

  const pageNumber = Number(pageNumberStr);
  const pageSize = Number(pageSizeStr);
  if (!Number.isFinite(pageNumber) || pageNumber < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
    return NextResponse.json({ error: 'pageNumber/page e pageSize/size devem ser inteiros positivos' }, { status: 400 });
  }

  // demais filtros opcionais (passados diretamente ao backend)
  const passthroughKeys = ['codCli', 'phone', 'state', 'initiatedBy', 'createdAt', 'origin'];

  const baseUrl = process.env.EXTERNAL_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: 'EXTERNAL_API_BASE_URL não configurado no ambiente do web' }, { status: 500 });
  }

  const backendParams = new URLSearchParams();
  backendParams.set('pageNumber', String(pageNumber));
  backendParams.set('pageSize', String(pageSize));
  for (const key of passthroughKeys) {
    const v = searchParams.get(key);
    if (v) backendParams.set(key, v);
  }

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  const appAuth = req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('app_auth='))?.split('=')[1];
  if (appAuth) headers['Authorization'] = decodeURIComponent(appAuth);

  try {
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const apiRoot = normalizedBase.endsWith('/api/v1') ? normalizedBase : `${normalizedBase}/api/v1`;
    const url = `${apiRoot}/Offers/Messages?${backendParams.toString()}`;
    const res = await fetch(url, { headers, cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


