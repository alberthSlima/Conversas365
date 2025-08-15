"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

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
  const listRef = useRef<HTMLDivElement | null>(null);
  const signalRActiveRef = useRef<boolean>(false);
  const lastSigRef = useRef<string>("0");
  const rowsRef = useRef<Row[]>([]);

  function computeSignature(list: Row[]): string {
    if (list.length === 0) return "0";
    const last = list[list.length - 1];
    return `${list.length}:${last.messageId}:${last.messageCreatedAt}`;
  }

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

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
          const list: Row[] = Array.isArray(data) ? data : [];
          const sig = computeSignature(list);
          if (sig !== lastSigRef.current) {
            if (list.length > 0 || rowsRef.current.length === 0) {
              setRows(list);
              lastSigRef.current = sig;
            }
          }
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
            const list: Row[] = Array.isArray(payload.data) ? payload.data : [];
            const sig = computeSignature(list);
            if (sig !== lastSigRef.current) {
              if (list.length > 0 || rowsRef.current.length === 0) {
                setRows(list);
                lastSigRef.current = sig;
              }
            }
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
      if (signalRActiveRef.current) return; // se SignalR estiver ativo, não fazer polling
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

  // Tenta usar SignalR se disponível (NEXT_PUBLIC_SIGNALR_URL) e pacote instalado; fallback permanece
  useEffect(() => {
    const hubUrl = process.env.NEXT_PUBLIC_SIGNALR_URL;
    if (!hubUrl) return;
    let stopped = false;
    type HubConnectionInstance = {
      on: (event: string, cb: (payload: unknown) => void) => void;
      start: () => Promise<void>;
      stop: () => Promise<void>;
    };
    type HubConnectionBuilderLike = {
      withUrl: (url: string) => HubConnectionBuilderLike;
      withAutomaticReconnect: () => HubConnectionBuilderLike;
      build: () => HubConnectionInstance;
    };
    type SignalRModule = { HubConnectionBuilder: new () => HubConnectionBuilderLike };
    let connection: HubConnectionInstance | null = null;
    (async () => {
      try {
        const dynamicImport = Function('m', 'return import(m)') as (m: string) => Promise<SignalRModule>;
        const signalR = await dynamicImport('@microsoft/signalr').catch(() => null);
        if (!signalR) return; // pacote não instalado → mantém polling
        const builder = new signalR.HubConnectionBuilder()
          .withUrl(`${hubUrl}?phone=${encodeURIComponent(phone)}`)
          .withAutomaticReconnect()
          .build();
        connection = builder;

        builder.on('conversations', (payload: unknown) => {
          try {
            const p = payload as { data?: unknown } | undefined;
            const list = Array.isArray(p?.data) ? (p!.data as Row[]) : [];
            const sig = computeSignature(list);
            if (sig !== lastSigRef.current) {
              if (list.length > 0 || rowsRef.current.length === 0) {
                setRows(list);
                lastSigRef.current = sig;
              }
            }
          } catch {}
        });

        await builder.start();
        connection = builder;
        if (!stopped) signalRActiveRef.current = true;
      } catch {
        // se falhar, mantém apenas polling/SSE
      }
    })();

    return () => {
      stopped = true;
      signalRActiveRef.current = false;
      try { if (connection) void connection.stop(); } catch {}
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
    // ordenar conversas por prioridade: convCreatedAt válida, depois id
    function getKey(it: Row | undefined, fallbackId: number): number {
      if (it?.convCreatedAt) {
        const t = Date.parse(it.convCreatedAt);
        if (Number.isFinite(t)) return t;
      }
      return fallbackId;
    }
    arr.sort((a, b) => getKey(a.items[0], a.id) - getKey(b.items[0], b.id));
    return arr;
  }, [rows]);

  // sempre rolar para o final quando grupos mudarem
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [groups]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-white">
      <div className="flex-1 flex flex-col max-h-screen">
        <div className="p-4 border-b flex items-center gap-3">
          <h3 className="text-lg font-medium">Chat – {phone}</h3>
          <div className="ml-auto"><button type="button" onClick={onClose} className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50">Fechar</button></div>
        </div>

        {loading && <div className="p-4">Carregando...</div>}

        {!loading && (
          <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-6">
            {groups.map(g => (
              <div key={g.id} className="rounded-lg">
                <div className="p-3 space-y-2">
                  {g.items.map(item => (
                    <div key={item.messageId + '-' + item.messageCreatedAt} className={`flex ${item.initiatedBy === 'SYSTEM' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-md px-3 py-2 text-sm ${item.initiatedBy === 'SYSTEM' ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
                        <div className="text-xs text-gray-500 mb-1">{new Date(item.messageCreatedAt).toLocaleString()}</div>
                        <div className="whitespace-pre-wrap break-words">{item.content}</div>
                        {item.initiatedBy === 'SYSTEM' && (
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


