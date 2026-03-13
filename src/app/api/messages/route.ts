import { NextResponse } from 'next/server';
import { ApiClient } from '@/infrastructure/http/ApiClient';
import { getTlsFetchOptions } from '@/lib/serverTls';

// Proxy para o backend. Suporta aliases: page/pageNumber e size/pageSize.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const pageNumberStr = searchParams.get('pageNumber') ?? searchParams.get('page') ?? '1';
  const pageSizeStr = searchParams.get('pageSize') ?? searchParams.get('size') ?? '10';

  const pageNumber = Number(pageNumberStr);
  const pageSize = Number(pageSizeStr);
  if (!Number.isFinite(pageNumber) || pageNumber < 1 || !Number.isFinite(pageSize) || pageSize < 1) {
    return NextResponse.json({ error: 'pageNumber/page e pageSize/size devem ser inteiros positivos' }, { status: 400 });
  }

  const passthroughKeys = ['codCli', 'phone', 'state', 'initiatedBy', 'createdAt', 'origin', 'channel'];

  const client = new ApiClient();

  const backendParams = new URLSearchParams();
  backendParams.set('pageNumber', String(pageNumber));
  backendParams.set('pageSize', String(pageSize));
  backendParams.set('page', String(pageNumber));
  backendParams.set('size', String(pageSize));
  for (const key of passthroughKeys) {
    const v = searchParams.get(key);
    if (v) backendParams.set(key, v);
  }

  const headers: Record<string, string> = { Accept: 'application/json, text/plain' };
  const appAuth = req.headers.get('cookie')?.split(';').map((s) => s.trim()).find((s) => s.startsWith('app_auth='))?.split('=')[1];
  if (appAuth) {
    let token = appAuth;
    try {
      token = decodeURIComponent(token);
      if (/%[0-9A-Fa-f]{2}/.test(token)) token = decodeURIComponent(token);
    } catch {}
    headers['Authorization'] = token.replace(/^Basic%20/i, 'Basic ');
  }

  try {
    const endpoint = `/api/v2/messages?${backendParams.toString()}`;
    const tlsOpts = await getTlsFetchOptions(client.getFullUrl(endpoint));
    const res = await client.getResponse(endpoint, { ...tlsOpts, headers });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return new NextResponse(txt || 'Upstream error', { status: res.status });
    }
    const raw: unknown = await res.json().catch(() => ({}));

    // Normaliza diferentes formatos de resposta em { items, totalItems }
    let items: unknown[] = [];
    let totalItems: number | null = null;

    function pickTotal(obj: Record<string, unknown>): number | null {
      const cands = ['totalItems', 'total', 'totalCount', 'count', 'totalElements'];
      for (const k of cands) {
        const v = obj[k];
        if (typeof v === 'number' && Number.isFinite(v)) return v;
      }
      return null;
    }

    if (Array.isArray(raw)) {
      items = raw as unknown[];
    } else if (raw && typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      if (Array.isArray(obj.items)) {
        items = obj.items as unknown[];
        totalItems = pickTotal(obj);
      } else if (Array.isArray(obj.data)) {
        items = obj.data as unknown[];
        totalItems = pickTotal(obj);
      } else if (Array.isArray(obj.content)) {
        items = obj.content as unknown[];
        totalItems = pickTotal(obj);
      } else {
        // Primeiro array encontrado
        for (const v of Object.values(obj)) {
          if (Array.isArray(v)) { items = v as unknown[]; break; }
        }
        totalItems = pickTotal(obj);
      }
    }

    return NextResponse.json({ items, totalItems }, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


