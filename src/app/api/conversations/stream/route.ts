import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

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
  convUpdatedAt?: string;
};

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone');
  if (!phone) return new Response('phone is required', { status: 400 });
  const phoneParam: string = phone; // já validado acima

  const baseUrl = process.env.EXTERNAL_API_BASE_URL;
  if (!baseUrl) return new Response('EXTERNAL_API_BASE_URL not set', { status: 500 });

  const username = process.env.EXTERNAL_API_USERNAME;
  const password = process.env.EXTERNAL_API_PASSWORD;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (username && password) {
    headers['Authorization'] = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      function send(data: unknown) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      const normalizedBase = baseUrl.replace(/\/+$/, '');
      const apiRoot = normalizedBase.endsWith('/api/v1') ? normalizedBase : `${normalizedBase}/api/v1`;
      let url = `${apiRoot}/Offers/Conversations?phone=${encodeURIComponent(phoneParam)}`;

      async function tick() {
        if (closed) return;
        try {
          let res = await fetch(url, { headers, cache: 'no-store' });
          if (!res.ok && (res.status === 404 || res.status === 405)) {
            url = `${apiRoot}/Conversations?phone=${encodeURIComponent(phoneParam)}`;
            res = await fetch(url, { headers, cache: 'no-store' });
          }
          const raw: unknown = await res.json().catch(() => ([]));
          const list: ApiConversationItem[] = Array.isArray(raw) ? (raw as ApiConversationItem[]) : [];
          const mapped: MappedRow[] = list.map((item) => ({
            conversationId: item.conversationId ?? item.id ?? 0,
            state: item.state ?? undefined,
            initiatedBy: item.initiatedBy ?? undefined,
            messageId: item.messageId ?? item.id ?? 0,
            content: item.content ?? '',
            messageCreatedAt: item.messageCreatedAt ?? item.createdAt ?? item.convUpdatedAt ?? item.convCreatedAt ?? new Date().toISOString(),
            origin: item.origin ?? undefined,
            convCreatedAt: item.convCreatedAt ?? item.conversationCreatedAt ?? undefined,
            convUpdatedAt: item.convUpdatedAt ?? item.conversationUpdatedAt ?? undefined,
          }));
          send({ type: 'conversations', data: mapped });
        } catch {
          send({ type: 'error' });
        }
      }

      // keepalive ping
      const pingId = setInterval(() => send({ type: 'ping', t: Date.now() }), 15000);
      const pollId = setInterval(tick, 5000);
      await tick();

      req.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(pollId);
        clearInterval(pingId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}


