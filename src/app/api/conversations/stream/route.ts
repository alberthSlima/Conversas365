import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

type ApiConversationItem = {
  id?: number;
  state?: string;
  initiatedBy?: string;
  context?: string;
  createdAt?: string;
  updatedAt?: string;
};

type MappedRow = {
  id: number;
  state?: string;
  initiatedBy?: string;
  context?: string;
  createdAt: string;
  updatedAt?: string;
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

     
      const url = `${baseUrl}/api/v2/conversations/${encodeURIComponent(phoneParam)}`;

      async function tick() {
        if (closed) return;
        try {
          const res = await fetch(url, { headers, cache: 'no-store' });
          const raw: unknown = await res.json().catch(() => ([]));
          const list: ApiConversationItem[] = Array.isArray(raw) ? (raw as ApiConversationItem[]) : [];
          const mapped: MappedRow[] = list.map((item) => ({
            id: item.id ?? 0,
            state: item.state ?? undefined,
            initiatedBy: item.initiatedBy ?? undefined,
            context: item.context ?? undefined,
            createdAt: item.createdAt ?? new Date().toISOString(),
            updatedAt: item.updatedAt ?? undefined,
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


