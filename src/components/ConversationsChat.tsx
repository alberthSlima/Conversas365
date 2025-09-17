"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

import { Check, CheckCheck, Clock, XCircle } from 'lucide-react';
import { useHub } from '@/components/HubProvider';

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
        const newState: string | undefined = typeof payload?.state === 'string' ? payload.state.toLowerCase() : undefined;
        let parsed: WhatsappEnvelope | undefined;
        try { parsed = typeof payload?.json === 'string' ? (JSON.parse(payload.json) as WhatsappEnvelope) : undefined; } catch {}
        const entry = Array.isArray(parsed?.entry) ? parsed!.entry![0] : undefined;
        const value = entry?.changes && Array.isArray(entry.changes) ? entry.changes[0]?.value : undefined;
        const msg0 = value?.messages && Array.isArray(value.messages) ? value.messages[0] : undefined;
        const contactWa = value?.contacts && Array.isArray(value.contacts) ? value.contacts[0]?.wa_id : undefined;
        const from = typeof msg0?.from === 'string' ? msg0.from : (typeof contactWa === 'string' ? contactWa : undefined);
        if (from && phone && String(from) !== String(phone)) return;
        const ctxRaw: string = (msg0?.text?.body && typeof msg0.text.body === 'string' && msg0.text.body.trim().length > 0)
          ? JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ type: 'text', text: { body: msg0.text.body } }] } }] }] })
          : JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ type: msg0?.type ?? 'msg' }] } }] }] });
        const tsStr: string | undefined = typeof msg0?.timestamp === 'string' ? msg0.timestamp : undefined;
        const tsMs = tsStr && /^\d+$/.test(tsStr) ? Number(tsStr) * 1000 : Date.now();
        const createdAtIso = new Date(tsMs).toISOString();
        const newItem: Row = {
          id: idNum,
          state: newState,
          initiatedBy: 'CLIENT',
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
            {groups.map(g => (
              <div key={g.id} className="rounded-lg">
                <div className="p-1.5 space-y-1">
                  {g.items.map(item => (
                    <div key={`${item.id}-${item.createdAt}`} className={`flex ${item.initiatedBy === 'SYSTEM' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[60%] rounded-md px-2 py-1 text-[12px] leading-4 ${item.initiatedBy === 'SYSTEM' ? 'bg-blue-50 border border-blue-100' : 'bg-green-50 border border-green-100'}`}>
                        <div className="text-[10px] text-gray-500 mb-0.5">{new Date(item.createdAt).toLocaleString()}</div>
                        {(() => { const pm = parseMessage(item.context); return (
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

function parseContext(raw?: string): string {
  if (!raw || !raw.trim().startsWith('{')) return raw || '';
  try {
    type WaMsg = { type?: string; text?: { body?: string }; button?: { text?: string } };
    type WaChange = { value?: { messages?: WaMsg[] } };
    const obj = JSON.parse(raw) as { entry?: Array<{ changes?: WaChange[] }> };
    const msg0: WaMsg | undefined = obj.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg0) {
      if (msg0.text && typeof msg0.text.body === 'string' && msg0.text.body.trim().length > 0) return msg0.text.body;
      if (msg0.type === 'button' && msg0.button?.text) {
        return msg0.button.text;
      }
      if (typeof msg0.type === 'string') return `[${msg0.type}]`;
    }
  } catch {}
  // formato sem entry/changes (webhook simplificado)
  try {
    type Msg = { type?: string; text?: { body?: string }; button?: { text?: string } };
    const obj3 = JSON.parse(raw) as { messages?: Msg[] };
    const msg = obj3.messages?.[0];
    if (msg) {
      if (msg.text?.body) return msg.text.body;
      if (msg.button?.text) return msg.button.text;
      if (msg.type) return `[${msg.type}]`;
    }
  } catch {}
  // tentar HSM Components
  try {
    const obj = JSON.parse(raw) as { Components?: Array<{ Text?: string; Type?: string }> };
    if (Array.isArray(obj?.Components)) {
      const body = obj.Components.find(c => (c.Type || '').toLowerCase() === 'body');
      if (body?.Text) return body.Text;
    }
  } catch {}
  return raw || '';
}

// Mensagens podem vir como HSM (Components) ou envelope padrão
function parseMessage(raw?: string): ParsedMessage {
  if (!raw) return { text: '', buttons: [] };
  // tentar Components
  try {
    const obj = JSON.parse(raw) as { Components?: Array<{ Text?: string; Type?: string; SubType?: string }> };
    if (Array.isArray(obj?.Components)) {
      const body = obj.Components.find(c => (c.Type || '').toLowerCase() === 'body');
      const buttons = obj.Components.filter(c => (c.SubType || '').toUpperCase() === 'QUICK_REPLY').map(c => c.Text || '').filter(Boolean);
      return { text: body?.Text || '', buttons };
    }
  } catch {}
  // fallback envelope
  return { text: parseContext(raw), buttons: [] };
}

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