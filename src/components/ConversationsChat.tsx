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

  const containerCls = mode === 'modal' ? 'fixed inset-0 z-50 flex items-stretch bg-gradient-to-br from-gray-50 to-gray-100' : 'min-h-screen flex items-stretch bg-gradient-to-br from-gray-50 to-gray-100';

  return (
    <div className={containerCls}>
      <div className="flex-1 flex flex-col max-h-screen">
        {/* Header do Chat */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center gap-4 shadow-lg">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Chat WhatsApp</h3>
              <p className="text-sm text-blue-100">{phone}</p>
            </div>
          </div>
          {onClose && (
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-xl transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Fechar
            </button>
          )}
        </div>

        {loading && (
          <div className="p-8 flex flex-col items-center justify-center">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600 font-medium">Carregando mensagens...</p>
          </div>
        )}

        {!loading && (
          <div ref={listRef} className="flex-1 overflow-auto p-6 space-y-4 bg-white/50">
            {groups.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-10 text-center max-w-md">
                  <svg className="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-700 font-semibold text-lg mb-2">Nenhuma mensagem</p>
                  <p className="text-gray-500 text-sm mb-6">Não há conversas para este número ainda.</p>
                  <button
                    type="button"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Recarregar
                  </button>
                </div>
              </div>
            )}
            {groups.map(g => (
              <div key={g.id} className="mb-2">
                <div className="space-y-3">
                  {g.items.map(item => (
                    <div key={`${item.id}-${item.createdAt}`} className={`flex ${item.initiatedBy === 'SYSTEM' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                      <div className={`max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-3 shadow-md ${
                        item.initiatedBy === 'SYSTEM' 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                          : 'bg-white border-2 border-gray-200 text-gray-900'
                      }`}>
                        <div className={`text-xs mb-2 flex items-center gap-1.5 ${item.initiatedBy === 'SYSTEM' ? 'text-blue-100' : 'text-gray-500'}`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(item.createdAt).toLocaleString()}
                        </div>
                        {(() => { const pm: ParsedMessage = { text: parseContextText(item.context), buttons: parseContextButtons(item.context) }; return (
                          <>
                            <div className="whitespace-normal break-words leading-relaxed" dangerouslySetInnerHTML={{ __html: formatWhatsapp(pm.text).replace(/\n/g,'<br/>') }} />
                            {pm.buttons.length > 0 && (
                              <div className="mt-3 flex flex-col items-stretch gap-2">
                                {pm.buttons.map((b: string, i: number)=>(
                                  <button 
                                    key={i} 
                                    type="button" 
                                    className={`text-center px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98] ${
                                      item.initiatedBy === 'SYSTEM'
                                        ? 'bg-white text-blue-600 hover:bg-blue-50'
                                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                                    }`}
                                  >
                                    {b}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        ); })()}
                        {item.initiatedBy === 'SYSTEM' && (
                          <div className="mt-2 flex items-center justify-end gap-1">
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
  if (s === 'failed') return <XCircle className="w-4 h-4 text-red-300" />;
  if (s === 'read') return <CheckCheck className="w-4 h-4 text-blue-200" />;
  if (s === 'delivered') return <CheckCheck className="w-4 h-4 text-blue-100" />;
  if (s === 'sent') return <Check className="w-4 h-4 text-blue-100" />;
  if (s === 'initial') return <Clock className="w-4 h-4 text-blue-100" />;
  return <Clock className="w-4 h-4 text-blue-100" />;
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