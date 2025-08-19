"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

import { Check, CheckCheck, Clock, XCircle } from 'lucide-react';
import { useHub } from '@/components/HubProvider';

type Row = {
  conversationId: number;
  state?: string;
  initiatedBy?: string;
  content: string;
  messageCreatedAt: string;
  origin?: string | null;
  convCreatedAt?: string;
  convUpdatedAt?: string;
};

type ConversationCreatedPayload = {
  id?: number | string;
  state?: string;
  json?: string;
};

type WhatsappEnvelope = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{ from?: string; timestamp?: string; type?: string; text?: { body?: string } }>;
        contacts?: Array<{ wa_id?: string }>;
      };
    }>;
  }>;
};

export function ConversationsChat({ phone, onClose, mode = 'modal' }: { phone: string; onClose?: () => void; mode?: 'modal' | 'page' }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastSigRef = useRef<string>("0");
  const rowsRef = useRef<Row[]>([]);
  const joinedConvIdsRef = useRef<Set<number>>(new Set());

  const hub = useHub();
  // Evitar rolagem do body quando em modal
  useEffect(() => {
    if (mode !== 'modal') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mode]);

  function computeSignature(list: Row[]): string {
    if (list.length === 0) return "0";
    const last = list[list.length - 1];
    return `${list.length}:${last.conversationId}:${last.messageCreatedAt}`;
  }

  useEffect(() => { rowsRef.current = rows; }, [rows]);

  // Subscrições do hub (delta por conversa)
  useEffect(() => {
    const offUpdated = hub.onConversationUpdated((p) => {
      try {
        const idNum: number | undefined = typeof p?.id === 'number' ? p.id : (typeof p?.id === 'string' ? Number(p.id) : undefined);
        const newState = typeof p?.state === 'string' ? p.state.toLowerCase() : undefined;
        if (idNum === undefined || Number.isNaN(idNum) || !newState) return;
        setRows((curr) => curr.map((r) => (r.conversationId === idNum ? { ...r, state: newState } : r)));
      } catch {}
    });
    const offCreated = hub.onConversationCreated((raw) => {
      try {
        const payload = raw as ConversationCreatedPayload;
        const idRaw = payload?.id;
        const idNum: number | undefined = typeof idRaw === 'number' ? idRaw : (typeof idRaw === 'string' ? Number(idRaw) : undefined);
        if (idNum === undefined || Number.isNaN(idNum)) return;
        const newState: string | undefined = typeof payload?.state === 'string' ? payload.state.toLowerCase() : undefined;
        let parsed: WhatsappEnvelope | undefined;
        try { parsed = typeof payload?.json === 'string' ? (JSON.parse(payload.json) as WhatsappEnvelope) : undefined; } catch {}
        const entry = Array.isArray(parsed?.entry) ? parsed!.entry![0] : undefined;
        const value = entry?.changes && Array.isArray(entry.changes) ? entry.changes[0]?.value : undefined;
        const msg0 = value?.messages && Array.isArray(value.messages) ? value.messages[0] : undefined;
        const contactWa = value?.contacts && Array.isArray(value.contacts) ? value.contacts[0]?.wa_id : undefined;
        const from = typeof msg0?.from === 'string' ? msg0.from : (typeof contactWa === 'string' ? contactWa : undefined);
        if (from && phone && String(from) !== String(phone)) return;
        const content: string = (msg0?.text?.body && typeof msg0.text.body === 'string' && msg0.text.body.trim().length > 0)
          ? msg0.text.body
          : (typeof msg0?.type === 'string' ? `[${msg0.type}]` : '[mensagem]');
        const tsStr: string | undefined = typeof msg0?.timestamp === 'string' ? msg0.timestamp : undefined;
        const tsMs = tsStr && /^\d+$/.test(tsStr) ? Number(tsStr) * 1000 : Date.now();
        const newItem: Row = {
          conversationId: idNum,
          state: newState,
          initiatedBy: 'CLIENT',
          content,
          messageCreatedAt: new Date(tsMs).toISOString(),
          origin: null,
          convCreatedAt: undefined,
          convUpdatedAt: undefined,
        };
        setRows((curr) => {
          const exists = curr.some(r => r.conversationId === newItem.conversationId && r.messageCreatedAt === newItem.messageCreatedAt && r.content === newItem.content);
          if (exists) return curr;
          return [...curr, newItem];
        });
        (async () => { try { await hub.joinConversation(String(idNum)); } catch {} })();
      } catch {}
    });
    return () => { offUpdated(); offCreated(); };
  }, [hub, phone]);

  // Entrar no grupo do telefone (provider) e fazer carga inicial via REST (uma vez)
  useEffect(() => {
    const cancelled = false;
    (async () => {
      try { await hub.joinPhone(phone); } catch {}
      try {
        setLoading(true);
        const restUrl = `/api/conversations?phone=${encodeURIComponent(phone)}`;
        const res = await fetch(restUrl, { cache: 'no-store' });
        const { data } = await res.json();
        const list: Row[] = Array.isArray(data) ? data : [];
        const sig = computeSignature(list);
        if (!cancelled && sig !== lastSigRef.current) {
          if (list.length > 0 || rowsRef.current.length === 0) {
            setRows(list);
            lastSigRef.current = sig;
          }
        }
      } catch {}
      finally { setLoading(false); }
    })();
    return () => {
      (async () => { try { await hub.leavePhone(phone); } catch {} })();
    };
  }, [phone, hub]);

  // Entrar/sair nos grupos de conversa dos itens visíveis (ref-count provider)
  useEffect(() => {
    const visibleConvIds = new Set<number>(rows.map(r => r.conversationId));
    let cancelled = false;
    (async () => {
      for (const id of visibleConvIds) {
        if (cancelled) break;
        if (!joinedConvIdsRef.current.has(id)) {
          try { await hub.joinConversation(String(id)); joinedConvIdsRef.current.add(id); } catch {}
        }
      }
      for (const id of Array.from(joinedConvIdsRef.current)) {
        if (cancelled) break;
        if (!visibleConvIds.has(id)) {
          try { await hub.leaveConversation(String(id)); } catch {}
          joinedConvIdsRef.current.delete(id);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [rows, hub]);

  // sempre rolar para o final quando grupos mudarem
  useEffect(() => {
    const el = listRef.current; if (!el) return; el.scrollTop = el.scrollHeight;
  }, [rows]);

  const groups = useMemo(() => {
    const map = new Map<number, Row[]>();
    for (const r of rows) {
      const list = map.get(r.conversationId) || [];
      list.push(r);
      map.set(r.conversationId, list);
    }
    const arr = Array.from(map.entries()).map(([id, items]) => ({
      id,
      items: items.sort((a, b) => new Date(a.messageCreatedAt).getTime() - new Date(b.messageCreatedAt).getTime()),
    }));
    function lastMessageTime(items: Row[]): number {
      if (items.length === 0) return 0;
      const last = items[items.length - 1];
      const t = Date.parse(last.messageCreatedAt);
      return Number.isFinite(t) ? t : 0;
    }
    // Ordena pela data da última mensagem de cada conversa (ascendente)
    arr.sort((a, b) => lastMessageTime(a.items) - lastMessageTime(b.items));
    return arr;
  }, [rows]);

  const containerCls = mode === 'modal' ? 'fixed inset-0 z-50 flex items-stretch bg-white' : 'min-h-screen flex items-stretch bg-white';

  return (
    <div className={containerCls}>
      <div className="flex-1 flex flex-col max-h-screen">
        <div className="p-4 border-b flex items-center gap-3">
          <h3 className="text-lg font-medium">Chat – {phone}</h3>
          <div className="ml-auto flex items-center gap-2">
            {onClose && (
              <button type="button" onClick={onClose} className="px-3 py-1.5 border rounded-md text-sm hover:bg-gray-50">Fechar</button>
            )}
          </div>
        </div>

        {loading && <div className="p-4">Carregando...</div>}

        {!loading && (
          <div ref={listRef} className="flex-1 overflow-auto p-4 space-y-6">
            {groups.map(g => (
              <div key={g.id} className="rounded-lg">
                <div className="p-3 space-y-2">
                  {g.items.map(item => (
                    <div key={`${item.conversationId}-${item.messageCreatedAt}`} className={`flex ${item.initiatedBy === 'SYSTEM' ? 'justify-end' : 'justify-start'}`}>
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
  if (s === 'sent') return <Check className="w-4 h-4 text-gray-400" />;
  if (s === 'initial') return <Clock className="w-4 h-4 text-gray-400" />;
  return <Clock className="w-4 h-4 text-gray-300" />;
}


