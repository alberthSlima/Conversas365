import type { NextRequest } from 'next/server';
import { ApiClient } from '@/infrastructure/http/ApiClient';
import { getTlsFetchOptions } from '@/lib/serverTls';

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
  const phoneParam: string = phone;

  const client = new ApiClient();
  const endpoint = `/api/v2/conversations/${encodeURIComponent(phoneParam)}`;
  const tlsOpts = await getTlsFetchOptions(client.getFullUrl(endpoint));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      function send(data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (error) {
          console.error('[STREAM] Erro ao enviar dados:', error);
        }
      }

      async function tick() {
        if (closed) return;
        try {
          const res = await client.getResponse(endpoint, tlsOpts);
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
        } catch (error) {
          console.error('[STREAM] Erro no tick:', error);
          if (!closed) {
            send({ type: 'error' });
          }
        }
      }

      const pingId = setInterval(() => {
        if (!closed) {
          send({ type: 'ping', t: Date.now() });
        }
      }, 15000);
      
      const pollId = setInterval(() => {
        if (!closed) {
          tick();
        }
      }, 5000);
      
      await tick();

      req.signal.addEventListener('abort', () => {
        if (!closed) {
          closed = true;
          clearInterval(pollId);
          clearInterval(pingId);
          try {
            controller.close();
          } catch (error) {
            console.error('[STREAM] Erro ao fechar controller:', error);
          }
        }
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


