"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

import { Check, CheckCheck, Clock, XCircle } from 'lucide-react';
import { useHub } from '@/components/HubProvider';
import { parseContextText, parseContextButtons, parseContextImages, parseCarouselCards, type CarouselCard } from '@/lib/dto';

// Cache global para evitar múltiplos downloads da mesma imagem
const downloadingImages = new Set<string>();
const downloadedImages = new Set<string>();

// Componente para cada card do carousel (imagem + botões) - Versão compacta
function CarouselCardComponent({ card, index }: { card: CarouselCard; index: number }) {
  const [imageStatus, setImageStatus] = useState<'loading' | 'local' | 'not-found' | 'error'>('loading');
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageSrc, setImageSrc] = useState(`/media/whatsapp/${card.imageId}.jpg?t=${Date.now()}`);

  // Verifica se a imagem já foi baixada anteriormente
  useEffect(() => {
    if (downloadedImages.has(card.imageId)) {
      setImageStatus('local');
    }
  }, [card.imageId]);

  const handleDownload = async () => {
    if (isDownloading || downloadingImages.has(card.imageId)) return;
    
    console.log(`[CHAT] Iniciando download de ${card.imageId}`);
    setIsDownloading(true);
    downloadingImages.add(card.imageId);

    try {
      const response = await fetch('/api/media/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: card.imageId, type: 'image' }),
      });

      if (response.ok) {
        const data = await response.json() as { url?: string; cached?: boolean };
        if (data.url) {
          downloadedImages.add(card.imageId);
          console.log(`[CHAT] ${data.cached ? 'Imagem já estava em cache' : 'Download concluído'}: ${card.imageId}`);
          
          // Sempre força reload da imagem com novo timestamp
          setImageStatus('local');
          setImageSrc(`${data.url}?t=${Date.now()}`);
        }
      }
    } catch (error) {
      console.error(`[CHAT] Erro ao baixar imagem ${card.imageId}:`, error);
      setImageStatus('error');
    } finally {
      setIsDownloading(false);
      downloadingImages.delete(card.imageId);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Imagem compacta */}
      <div className="relative rounded-lg overflow-hidden shadow-md group w-full aspect-square flex items-center justify-center bg-gray-100">
        {imageStatus === 'not-found' ? (
          <div className="flex flex-col items-center justify-center gap-1.5 text-gray-400 p-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[9px] font-medium text-center">Baixar</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            data-image-id={card.imageId}
            src={imageSrc}
            alt={`Imagem ${index + 1}`}
            className="w-full h-full object-cover"
            onLoad={() => {
              console.log(`[CHAT] Imagem carregada com sucesso: ${card.imageId} de ${imageSrc}`);
              setImageStatus('local');
              downloadedImages.add(card.imageId);
            }}
            onError={() => {
              console.log(`[CHAT] Erro ao carregar imagem: ${card.imageId} de ${imageSrc}`);
              if (imageSrc.includes('/media/whatsapp/')) {
                setImageStatus('not-found');
              } else {
                setImageStatus('error');
              }
            }}
          />
        )}
        
        {imageStatus !== 'local' && (
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`absolute inset-0 flex items-center justify-center backdrop-blur-[2px] transition-all duration-200 ${
              isDownloading 
                ? 'bg-blue-500/20 cursor-wait' 
                : 'bg-black/5 hover:bg-black/10'
            }`}
            title="Baixar imagem"
          >
            <div className={`p-2 rounded-full backdrop-blur-sm shadow-md ${
              isDownloading ? 'bg-blue-500/90' : 'bg-white/95 hover:bg-white hover:scale-105'
            } transition-all`}>
              {isDownloading ? (
                <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </div>
          </button>
        )}

        {imageStatus === 'local' && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-green-500 text-white text-[8px] font-bold rounded-full shadow-md flex items-center gap-0.5">
            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Salva
          </div>
        )}
      </div>

      {/* Botões compactos abaixo da imagem */}
      {card.buttons.length > 0 && (
        <div className="flex flex-col gap-1 w-full">
          {card.buttons.map((button, btnIndex) => (
            <button
              key={btnIndex}
              onClick={() => {
                if (button.type === 'URL' && button.url) {
                  window.open(button.url, '_blank');
                }
              }}
              className={`w-full py-1 px-1.5 rounded-md transition-colors text-[10px] font-medium flex items-center justify-center gap-0.5 ${
                button.type === 'URL'
                  ? 'bg-white border border-blue-500 text-blue-500 hover:bg-blue-50'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {button.type === 'URL' && (
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              )}
              <span className="truncate">{button.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente de Carrossel estilo WhatsApp (scroll horizontal compacto)
function ImageCarousel({ cards }: { cards: CarouselCard[] }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (cards.length === 0) return null;

  const scrollToIndex = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const firstCard = container.children[0]?.children[0] as HTMLElement;
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth + 8; // width + gap
    container.scrollTo({
      left: cardWidth * index,
      behavior: 'smooth'
    });
    setCurrentIndex(index);
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const firstCard = container.children[0]?.children[0] as HTMLElement;
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth + 8;
    const newIndex = Math.round(container.scrollLeft / cardWidth);
    setCurrentIndex(newIndex);
  };

  const goToPrevious = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    scrollToIndex(newIndex);
  };

  const goToNext = () => {
    const newIndex = Math.min(cards.length - 1, currentIndex + 1);
    scrollToIndex(newIndex);
  };

  // Se só tem 1 card
  if (cards.length === 1) {
    return (
      <div className="mb-2 w-full max-w-[160px] mx-auto">
        <CarouselCardComponent card={cards[0]} index={0} />
      </div>
    );
  }

  // Carousel horizontal compacto
  return (
    <div className="mb-2 w-full relative max-w-full">
      {/* Setas de navegação */}
      {currentIndex > 0 && (
        <button
          onClick={goToPrevious}
          className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white/95 hover:bg-white rounded-full shadow-md flex items-center justify-center transition-all"
          aria-label="Anterior"
        >
          <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {currentIndex < cards.length - 1 && (
        <button
          onClick={goToNext}
          className="absolute -right-1 top-1/2 -translate-y-1/2 z-10 w-6 h-6 bg-white/95 hover:bg-white rounded-full shadow-md flex items-center justify-center transition-all"
          aria-label="Próximo"
        >
          <svg className="w-3.5 h-3.5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Container do carousel - Sempre compacto */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="overflow-x-auto pb-1.5 snap-x snap-mandatory scrollbar-hide scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        <div className="flex gap-2 px-0.5">
          {cards.map((card, index) => (
            <div 
              key={card.imageId} 
              className="flex-shrink-0 w-[160px] snap-start"
              style={{ scrollSnapAlign: 'start' }}
            >
              <CarouselCardComponent card={card} index={index} />
            </div>
          ))}
        </div>
      </div>

      {/* Indicadores de posição - mais compactos */}
      {cards.length > 1 && (
        <div className="flex justify-center gap-1 mt-1.5">
          {cards.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`h-1 rounded-full transition-all ${
                index === currentIndex 
                  ? 'w-3 bg-blue-500' 
                  : 'w-1 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Ir para card ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type Row = {
  id: number;
  state?: string;
  initiatedBy?: string;
  context?: string;
  createdAt: string;
  updatedAt?: string;
};

type ParsedMessage = { text: string; buttons: string[]; images: string[]; carouselCards: CarouselCard[] };

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
      <div className="flex-1 flex flex-col max-h-screen w-full">
        {/* Header do Chat */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-4 shadow-lg">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-xl font-bold text-white truncate">Chat WhatsApp</h3>
              <p className="text-xs sm:text-sm text-blue-100 truncate">{phone}</p>
            </div>
          </div>
          {onClose && (
            <button 
              type="button" 
              onClick={onClose} 
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-xl transition-all duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Fechar</span>
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
          <div ref={listRef} className="flex-1 overflow-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-white/50">
            {groups.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] px-4">
                <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6 sm:p-10 text-center max-w-md w-full">
                  <svg className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-700 font-semibold text-base sm:text-lg mb-2">Nenhuma mensagem</p>
                  <p className="text-gray-500 text-sm mb-4 sm:mb-6">Não há conversas para este número ainda.</p>
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
                      <div className={`max-w-[90%] sm:max-w-[75%] md:max-w-[60%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-md ${
                        item.initiatedBy === 'SYSTEM' 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
                          : 'bg-white border-2 border-gray-200 text-gray-900'
                      }`}>
                        <div className={`text-xs mb-2 flex items-center gap-1.5 ${item.initiatedBy === 'SYSTEM' ? 'text-blue-100' : 'text-gray-500'}`}>
                          <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-[10px] sm:text-xs">{new Date(item.createdAt).toLocaleString()}</span>
                        </div>
                        {(() => { const pm: ParsedMessage = { text: parseContextText(item.context), buttons: parseContextButtons(item.context), images: parseContextImages(item.context), carouselCards: parseCarouselCards(item.context) }; return (
                          <>
                            {/* Texto da mensagem SEMPRE no topo */}
                            <div className="whitespace-normal break-words leading-relaxed mb-3 text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: formatWhatsapp(pm.text).replace(/\n/g,'<br/>') }} />
                            
                            {/* Carousel de imagens abaixo do texto */}
                            {pm.carouselCards.length > 0 ? (
                              <ImageCarousel cards={pm.carouselCards} />
                            ) : pm.images.length > 0 && (
                              <ImageCarousel cards={pm.images.map(id => ({ imageId: id, buttons: [] }))} />
                            )}
                            
                            {/* Botões globais: renderizar apenas se NÃO houver carouselCards */}
                            {pm.buttons.length > 0 && pm.carouselCards.length === 0 && (
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