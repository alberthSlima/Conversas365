"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

import { Check, CheckCheck, Clock, XCircle } from 'lucide-react';
import { useHub } from '@/components/HubProvider';
import { parseContextText, parseContextButtons } from '@/lib/dto';

type Row = {
  id: number;
  state?: string;
  initiatedBy?: string;
  context?: string;
  createdAt: string;
  updatedAt?: string;
};

type ParsedMessage = { text: string; buttons: string[] };

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
    return `${list.length}:${last.id}:${last.createdAt}`;
  }

  useEffect(() => { rowsRef.current = rows; }, [rows]);

  // Subscrições do hub (delta por conversa)
  useEffect(() => {
    const offUpdated = hub.onConversationUpdated((p) => {
      try {
        const idNum: number | undefined = typeof p?.id === 'number' ? p.id : (typeof p?.id === 'string' ? Number(p.id) : undefined);
        const newState = typeof p?.state === 'string' ? p.state.toLowerCase() : undefined;
        if (idNum === undefined || Number.isNaN(idNum) || !newState) return;
        setRows((curr) => curr.map((r) => (r.id === idNum ? { ...r, state: newState } : r)));
      } catch {}
    });
    const offCreated = hub.onConversationCreated((raw) => {
      try {
        const payload = raw as ConversationCreatedPayload;
        const idRaw = payload?.id;
        const idNum: number | undefined = typeof idRaw === 'number' ? idRaw : (typeof idRaw === 'string' ? Number(idRaw) : undefined);
        if (idNum === undefined || Number.isNaN(idNum)) return;
        const anyPayload = raw as unknown as Record<string, unknown>;
        const newState: string | undefined = typeof payload?.state === 'string' ? payload.state.toLowerCase() : undefined;
        const ctxFromPayload: string | undefined = typeof anyPayload?.context === 'string' ? (anyPayload.context as string) : undefined;
        const createdAtFromPayload: string | undefined = typeof anyPayload?.createdAt === 'string' ? (anyPayload.createdAt as string) : undefined;
        const initiatedByFromPayload: string | undefined = typeof anyPayload?.initiatedBy === 'string' ? (anyPayload.initiatedBy as string) : undefined;
        let ctxRaw: string | undefined = ctxFromPayload;
        let createdAtIso: string | undefined = createdAtFromPayload;
        if (!ctxRaw || !createdAtIso) {
          // fallback: tentar interpretar payload.json no formato antigo
          let parsed: WhatsappEnvelope | undefined;
          try {
            const legacyJsonRaw = (anyPayload as Record<string, unknown>)['json'];
            if (typeof legacyJsonRaw === 'string') {
              parsed = JSON.parse(legacyJsonRaw) as WhatsappEnvelope;
            } else {
              parsed = undefined;
            }
          } catch {}
          const entry = Array.isArray(parsed?.entry) ? parsed!.entry![0] : undefined;
          const value = entry?.changes && Array.isArray(entry.changes) ? entry.changes[0]?.value : undefined;
          const msg0 = value?.messages && Array.isArray(value.messages) ? value.messages[0] : undefined;
          if (!ctxRaw) {
            if (msg0?.text?.body && typeof msg0.text.body === 'string' && msg0.text.body.trim().length > 0) {
              ctxRaw = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ type: 'text', text: { body: msg0.text.body } }] } }] }] });
            } else {
              ctxRaw = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ type: msg0?.type ?? 'msg' }] } }] }] });
            }
          }
          if (!createdAtIso) {
            const tsStr: string | undefined = typeof msg0?.timestamp === 'string' ? msg0.timestamp : undefined;
            const tsMs = tsStr && /^\d+$/.test(tsStr) ? Number(tsStr) * 1000 : Date.now();
            createdAtIso = new Date(tsMs).toISOString();
          }
        }
        if (!ctxRaw) ctxRaw = '';
        if (!createdAtIso) createdAtIso = new Date().toISOString();
        const newItem: Row = {
          id: idNum,
          state: newState,
          initiatedBy: initiatedByFromPayload || 'CLIENT',
          context: ctxRaw,
          createdAt: createdAtIso,
        };
        setRows((curr) => {
          const exists = curr.some(r => r.id === newItem.id && r.createdAt === newItem.createdAt && r.context === newItem.context);
          if (exists) return curr;
          return [...curr, newItem];
        });
        (async () => { try { await hub.joinConversation(String(idNum)); } catch {} })();
      } catch {}
    });
    return () => { offUpdated(); offCreated(); };
  }, [hub, phone]);

  // Fallback em SSE para contornar falhas do Hub/CORS e manter o chat atualizado
  useEffect(() => {
    let closed = false;
    try {
      const url = `/api/conversations/stream?phone=${encodeURIComponent(phone)}`;
      const es = new EventSource(url);
      es.onmessage = (ev: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(ev.data) as { type?: string; data?: Array<Partial<Row>> };
          console.debug('[SSE] /api/conversations/stream event:', parsed);
          if (parsed && parsed.type === 'conversations' && Array.isArray(parsed.data)) {
            // Normalizar para Row[]
            const incoming: Row[] = parsed.data.map((r) => ({
              id: Number(r.id) || 0,
              state: typeof r.state === 'string' ? r.state : undefined,
              initiatedBy: typeof r.initiatedBy === 'string' ? r.initiatedBy : undefined,
              context: typeof r.context === 'string' ? r.context : undefined,
              createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
              updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : undefined,
            }));
            const sig = computeSignature(incoming);
            if (!closed && sig !== lastSigRef.current) {
              setRows(incoming);
              lastSigRef.current = sig;
            }
          }
        } catch {}
      };
      es.onerror = () => {
        console.warn('[SSE] /api/conversations/stream error');
        try { es.close(); } catch {}
      };
      return () => {
        closed = true;
        try { es.close(); } catch {}
      };
    } catch {
      // ignora erros de criação do EventSource
      return;
    }
  }, [phone]);

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
        console.debug('[REST] /api/conversations data:', data);
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
    const visibleConvIds = new Set<number>(rows.map(r => r.id));
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
      const list = map.get(r.id) || [];
      list.push(r);
      map.set(r.id, list);
    }
    const arr = Array.from(map.entries()).map(([id, items]) => ({
      id,
      items: items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }));
    function lastMessageTime(items: Row[]): number {
      if (items.length === 0) return 0;
      const last = items[items.length - 1];
      const t = Date.parse(last.createdAt);
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
          <div ref={listRef} className="flex-1 overflow-auto p-2 space-y-3">
            {groups.length === 0 && (
              <div className="p-6 text-sm text-gray-500">
                Nenhuma mensagem para este número.
                <button
                  type="button"
                  className="ml-3 px-2 py-1 border rounded-md hover:bg-gray-50"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const restUrl = `/api/conversations?phone=${encodeURIComponent(phone)}`;
                      const res = await fetch(restUrl, { cache: 'no-store' });
                      const { data } = await res.json();
                      const list: Row[] = Array.isArray(data) ? data : [];
                      setRows(list);
                      lastSigRef.current = computeSignature(list);
                    } catch {} finally { setLoading(false); }
                  }}
                >
                  Recarregar
                </button>
              </div>
            )}
            {groups.map(g => (
              <div key={g.id} className="rounded-lg">
                <div className="p-1.5 space-y-1">
                  {g.items.map(item => (
                    <div key={`${item.id}-${item.createdAt}`} className={`flex ${item.initiatedBy === 'SYSTEM' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[60%] rounded-md px-2 py-1 text-[12px] leading-4 ${item.initiatedBy === 'SYSTEM' ? 'bg-blue-50 border border-blue-100' : 'bg-green-50 border border-green-100'}`}>
                        <div className="text-[10px] text-gray-500 mb-0.5">{new Date(item.createdAt).toLocaleString()}</div>
                        {(() => { const pm: ParsedMessage = { text: parseContextText(item.context), buttons: parseContextButtons(item.context) }; return (
                          <>
                            <div className="whitespace-normal break-words text-[12px] leading-4" dangerouslySetInnerHTML={{ __html: formatWhatsapp(pm.text).replace(/\n/g,'<br/>') }} />
                            {pm.buttons.length > 0 && (
                              <div className="mt-1.5 flex flex-col items-center gap-1">
                                {pm.buttons.map((b: string, i: number)=>(
                                  <button key={i} type="button" className="w-full max-w-[200px] text-center px-2.5 py-1 bg-white border rounded-md text-[12px] font-medium shadow-sm hover:bg-gray-100 active:scale-[0.98] transition-transform">
                                    {b}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ); })()}
                        {item.initiatedBy === 'SYSTEM' && (
                          <div className="mt-0.5 text-[10px] flex items-center justify-end gap-1">
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

// parsing movido para '@/lib/dto'

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatWhatsapp(text: string): string {
  const normalized = (text || '').replace(/\r\n/g, '\n').replace(/\n{2,}/g, '\n');
  const esc = escapeHtml(normalized);
  // bold *text*
  const bolded = esc.replace(/\*(\S[^*]*?)\*/g, '<strong>$1</strong>');
  // italic _text_
  const it = bolded.replace(/_(\S[^_]*?)_/g, '<em>$1</em>');
  return it;
}