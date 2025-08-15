import { NextResponse } from 'next/server';

// Proxy para o backend: GET /api/conversations?phone=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

  const baseUrl = process.env.EXTERNAL_API_BASE_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: 'EXTERNAL_API_BASE_URL não configurado no ambiente do web' }, { status: 500 });
  }

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  const appAuth = req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('app_auth='))?.split('=')[1];
  if (appAuth) headers['Authorization'] = decodeURIComponent(appAuth);

  try {
    const normalizedBase = baseUrl.replace(/\/+$/, '');
    const apiRoot = normalizedBase.endsWith('/api/v1') ? normalizedBase : `${normalizedBase}/api/v1`;
    const url = `${apiRoot}/Offers/Conversations?phone=${encodeURIComponent(phone)}`;
    const res = await fetch(url, { headers, cache: 'no-store' });
    type ApiConversationItem = {
      conversationId?: number;
      id?: number;
      state?: string;
      initiatedBy?: string;
      messageId?: number;
      content?: string;
      messageCreatedAt?: string;
      createdAt?: string;
      convUpdatedAt?: string;
      convCreatedAt?: string;
      origin?: string;
      conversationCreatedAt?: string;
      conversationUpdatedAt?: string;
    };
    type MappedRow = {
      conversationId: number;
      state?: string;
      initiatedBy?: string;
      messageId: number;
      content: string;
      messageCreatedAt: string;
      origin?: string | null;
      convCreatedAt?: string;
    };
    const rawJson: unknown = await res.json().catch(() => ([]));
    const list: ApiConversationItem[] = Array.isArray(rawJson) ? (rawJson as ApiConversationItem[]) : [];
    const mapped: MappedRow[] = list.map((item) => ({
      conversationId: item.conversationId ?? item.id ?? 0,
      state: item.state ?? undefined,
      initiatedBy: item.initiatedBy ?? undefined,
      messageId: item.messageId ?? item.id ?? 0,
      content: item.content ?? '',
      // exibir createdAt (da mensagem ou da conversa). Mensagem nunca é alterada
      messageCreatedAt: item.messageCreatedAt ?? item.createdAt ?? item.convCreatedAt ?? new Date().toISOString(),
      origin: item.origin ?? undefined,
      convCreatedAt: item.convCreatedAt ?? item.conversationCreatedAt ?? undefined,
    }));
    return NextResponse.json({ data: mapped }, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


