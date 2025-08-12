"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, CheckCheck, Clock, XCircle } from 'lucide-react';

type Row = {
  conversationId: number;
  state?: string;
  initiatedBy?: string;
  messageId: number;
  content: string;
  messageCreatedAt: string;
  origin?: 'SYSTEM' | 'CLIENT';
  convCreatedAt?: string;
  convUpdatedAt?: string;
};

export function ConversationsChat({ phone, onClose }: { phone: string; onClose: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let controller = new AbortController();
    let es: EventSource | null = null;

    async function fetchOnce(initial: boolean) {
      if (!active) return;
      try {
        if (initial) setLoading(true);
        const res = await fetch(`/api/conversations?phone=${encodeURIComponent(phone)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!active) return;
        if (res.ok) {
          const { data } = await res.json();
          if (!active) return;
          setRows(Array.isArray(data) ? data : []);
        }
      } catch {
        // silencioso no polling
      } finally {
        if (initial) setLoading(false);
      }
    }

    // Tenta SSE primeiro; se falhar, permanece com o polling
    try {
      es = new EventSource(`/api/conversations/stream?phone=${encodeURIComponent(phone)}`);
      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload?.type === 'conversations') {
            setRows(Array.isArray(payload.data) ? payload.data : []);
          }
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        es = null;
      };
    } catch {}

    fetchOnce(true);

    const intervalId = setInterval(() => {
      if (!active) return;
      controller.abort();
      controller = new AbortController();
      fetchOnce(false);
    }, 5000);

    return () => {
      active = false;
      clearInterval(intervalId);
      controller.abort();
      es?.close();
    };
  }, [phone]);

  const groups = useMemo(() => {
    const map = new Map<number, Row[]>();
    for (const r of rows) {
      const list = map.get(r.conversationId) || [];
      list.push(r);
      map.set(r.conversationId, list);
    }
    // ordenar mensagens de cada conversa por data asc (garantia extra)
    const arr = Array.from(map.entries()).map(([id, items]) => ({ id, items: items.sort((a,b) => new Date(a.messageCreatedAt).getTime() - new Date(b.messageCreatedAt).getTime()) }));
    // ordenar conversas pela data de criação/atualização da conversation (não pelo timestamp da mensagem extraída)
    arr.sort((a,b) => {
      const ta = new Date(a.items[0]?.convCreatedAt || a.items[0]?.convUpdatedAt || 0).getTime();
      const tb = new Date(b.items[0]?.convCreatedAt || b.items[0]?.convUpdatedAt || 0).getTime();
      return ta - tb; // mais antigas em cima, mais recentes embaixo
    });
    return arr;
  }, [rows]);


  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-white">
      <div className="flex-1 flex flex-col max-h-screen">
        <div className="p-4 border-b flex items-center gap-3">
          <h3 className="text-lg font-medium">Chat – {phone}</h3>
          <div className="ml-auto"><Button variant="outline" onClick={onClose}>Fechar</Button></div>
        </div>

        {loading && <div className="p-4">Carregando...</div>}

        {!loading && (
          <div className="flex-1 overflow-auto p-4 space-y-6">
            {groups.map(g => (
              <div key={g.id} className="rounded-lg">
                <div className="p-3 space-y-2">
                  {g.items.map(item => (
                    <div key={item.messageId + '-' + item.messageCreatedAt} className={`flex ${item.origin === 'SYSTEM' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-md px-3 py-2 text-sm ${item.origin === 'SYSTEM' ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
                        <div className="text-xs text-gray-500 mb-1">{new Date(item.messageCreatedAt).toLocaleString()}</div>
                        <div className="whitespace-pre-wrap break-words">{item.content}</div>
                        {item.origin === 'SYSTEM' && (
                          <div className="mt-1 text-xs flex items-center justify-end gap-1">
                            {renderTicks(item.state)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {groups.length === 0 && <p className="text-sm text-gray-600">Nenhuma mensagem.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function renderTicks(state?: string) {
  const s = (state || '').toLowerCase();
  if (s === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
  if (s === 'read') return <CheckCheck className="w-4 h-4 text-blue-500" />;
  if (s === 'delivered') return <CheckCheck className="w-4 h-4 text-gray-400" />;
  if (s === 'initial') return <Check className="w-4 h-4 text-gray-400" />;
  return <Clock className="w-4 h-4 text-gray-300" />;
}


