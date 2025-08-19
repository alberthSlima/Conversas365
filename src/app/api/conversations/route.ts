import { NextResponse } from 'next/server';
import type { Dispatcher } from 'undici';

// Proxy para o backend: GET /api/conversations?phone=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

  const baseUrl = process.env.EXTERNAL_API_BASE_URL || '';
  if (!baseUrl) {
    return NextResponse.json({ error: 'EXTERNAL_API_BASE_URL não configurado no ambiente do web' }, { status: 500 });
  }

  const headers: Record<string, string> = { 'Accept': 'application/json' };
  const appAuth = req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('app_auth='))?.split('=')[1];
  if (appAuth) {
    let token = appAuth;
    try {
      token = decodeURIComponent(token);
      if (/%[0-9A-Fa-f]{2}/.test(token)) token = decodeURIComponent(token);
    } catch {}
    headers['Authorization'] = token.replace(/^Basic%20/i, 'Basic ');
  }

  try {
    const apiRoot = baseUrl; // usar exatamente a variável de ambiente
    let url = `${apiRoot}/Offers/Conversations?phone=${encodeURIComponent(phone)}`;
    type RequestInitWithDispatcher = RequestInit & { dispatcher?: Dispatcher };
    const fetchOptions: RequestInitWithDispatcher = { headers, cache: 'no-store' };
    try {
      const target = new URL(url);
      const allowInsecure = (process.env.ALLOW_INSECURE_TLS === 'true');
      const isLocalHttps = target.protocol === 'https:' && (target.hostname === 'localhost' || target.hostname === '127.0.0.1');
      if (allowInsecure && isLocalHttps) {
        const undici = await import('undici');
        fetchOptions.dispatcher = new undici.Agent({ connect: { rejectUnauthorized: false } });
      }
    } catch {}
    let res = await fetch(url, fetchOptions);
    if (!res.ok && (res.status === 404 || res.status === 405)) {
      // Fallback para /Conversations sem prefixo Offers
      url = `${apiRoot}/Conversations?phone=${encodeURIComponent(phone)}`;
      res = await fetch(url, fetchOptions);
    }
    type ApiConversationItem = {
      conversationId?: number;
      id?: number;
      state?: string;
      initiatedBy?: string;
      messageId?: number;
      content?: string;
      json?: string;
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
      waMessageId?: string | null;
    };
    const rawJson: unknown = await res.json().catch(() => ([]));
    const list: ApiConversationItem[] = Array.isArray(rawJson) ? (rawJson as ApiConversationItem[]) : [];
    const mapped: MappedRow[] = list.map((item) => {
      const any = item as unknown as Record<string, unknown>;
      // tentar extrair content a partir do json quando iniciado pelo CLIENT e for type text
      let resolvedContent: string | undefined = undefined;
      const initiated = (item.initiatedBy || (any?.initiatedBy as string) || '').toString().toUpperCase();
      if (initiated === 'CLIENT') {
        try {
          const rawJson = typeof any?.json === 'string'
            ? any.json
            : (typeof item.content === 'string' && item.content.trim().startsWith('{') ? item.content : undefined);
          if (rawJson) {
            const parsed = JSON.parse(rawJson) as {
              entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ type?: string; text?: { body?: string } }> } }> }>;
            };
            const entry = Array.isArray(parsed.entry) ? parsed.entry[0] : undefined;
            const value = entry?.changes && Array.isArray(entry.changes) ? entry.changes[0]?.value : undefined;
            const msg0 = value?.messages && Array.isArray(value.messages) ? value.messages[0] : undefined;
            if (msg0 && msg0.type === 'text' && typeof msg0.text?.body === 'string' && msg0.text.body.trim().length > 0) {
              resolvedContent = msg0.text.body;
            }
          }
        } catch {}
      }
      if (!resolvedContent) {
        // Para SYSTEM, alguns backends enviam o content como um JSON string com { id, origin, channel, content, ... }
        if (initiated === 'SYSTEM' && typeof item.content === 'string' && item.content.trim().startsWith('{')) {
          try {
            const parsedAny = JSON.parse(item.content) as { content?: string };
            if (parsedAny && typeof parsedAny.content === 'string' && parsedAny.content.trim().length > 0) {
              resolvedContent = parsedAny.content;
            }
          } catch {}
        }
      }
      if (!resolvedContent) {
        resolvedContent = item.content ?? (any?.content as string) ?? '';
      }
      const candidates = [
        any?.waMessageId,
        any?.waId,
        any?.waMessageID,
        any?.messageIdStr,
        (any?.conversation as unknown as Record<string, unknown>)?.waId,
        (any?.conversation as unknown as Record<string, unknown>)?.waMessageId,
      ];
      const rawWa = candidates.find((c) => typeof c === 'string' && c.trim().length > 0) as string | undefined;
      return {
        conversationId: item.conversationId ?? item.id ?? 0,
        state: item.state ?? undefined,
        initiatedBy: item.initiatedBy ?? undefined,
        messageId: item.messageId ?? item.id ?? 0,
        content: resolvedContent,
        // exibir createdAt (da mensagem ou da conversa). Mensagem nunca é alterada
        messageCreatedAt: item.messageCreatedAt ?? item.createdAt ?? item.convCreatedAt ?? new Date().toISOString(),
        origin: (any?.origin as string) ?? undefined,
        convCreatedAt: item.convCreatedAt ?? item.conversationCreatedAt ?? undefined,
        waMessageId: rawWa ? rawWa.trim() : undefined,
      };
    });
    return NextResponse.json({ data: mapped }, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


