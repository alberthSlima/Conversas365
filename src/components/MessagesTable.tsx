"use client";

import { useEffect, useState } from "react";
import { ConversationsChat } from "./ConversationsChat";

const DEFAULT_PAGE_SIZE = 7;

interface Message {
  id: number;
  codCli?: string;
  content: string;
  createdAt: string;
  state?: string;
  phone?: string;
  channel?: string | null;
}

export default function MessagesTable() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageInput, setPageInput] = useState<string>('1');
  const [modalPhone, setModalPhone] = useState<string | null>(null);

  function openConversationsModal(phone?: string) {
    if (phone) setModalPhone(phone);
  }

  // filtros
  const [filterCodCli, setFilterCodCli] = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('');
  const [filterChannel, setFilterChannel] = useState('');

  // inputs controlados; pesquisa apenas ao pressionar Enter
  const [codCliInput, setCodCliInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  
  function applyCodCliFilter() {
    setFilterCodCli(codCliInput);
    setPage(0);
  }
  function applyPhoneFilter() {
    setFilterPhone(phoneInput);
    setPage(0);
  }

  useEffect(() => {
    async function fetchPage() {
      setLoading(true);
      const params = new URLSearchParams({ pageNumber: String(page + 1), pageSize: String(pageSize) });
      if (filterCodCli) params.append('codCli', filterCodCli);
      if (filterPhone) params.append('phone', filterPhone);
      if (filterStatus) params.append('state', filterStatus);
      if (filterDate) params.append('createdAt', filterDate);
      if (filterOrigin) params.append('origin', filterOrigin);
      if (filterChannel) params.append('channel', filterChannel);
      const res = await fetch(`/api/messages?${params.toString()}`);
      if (!res.ok) {
        console.error(await res.text());
        setMessages([]);
        setTotal(0);
      } else {
        type ApiConversation = {
          phone?: string;
          codCli?: string;
          waId?: string | null;
          waConvId?: string | null;
          state?: string;
          context?: unknown;
          initiatedBy?: string;
          createdAt?: string;
          updatedAt?: string;
        };
        type ApiItem = {
          id: number;
          conversationId: number;
          conversation?: ApiConversation;
          channel?: string | null;
          content: string;
          origin?: string | null;
          createdAt: string;
        };
        const { items, totalItems } = await res.json();
        const list: ApiItem[] = Array.isArray(items) ? items : [];
        const mapped: Message[] = list.map((i) => ({
          id: i.id,
          codCli: i.conversation?.codCli,
          content: i.content,
          createdAt: i.createdAt,
          state: i.conversation?.state,
          phone: i.conversation?.phone,
          channel: i.channel ?? null,
        }));
        setMessages(mapped);
        setTotal(totalItems ?? null);
      }
      setLoading(false);
    }
    fetchPage();
  }, [page, pageSize, filterCodCli, filterPhone, filterStatus, filterDate, filterOrigin, filterChannel]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const totalPages = total ? Math.ceil(total / pageSize) : 0;

  function mapState(state?: string) {
    switch ((state || '').toLowerCase()) {
      case 'read': return 'Lida';
      case 'delivered': return 'Entregue';
      case 'failed': return 'Não entregue';
      case 'initial':
      default: return 'Enviando';
    }
  }

  function formatPhone(phone?: string) {
    if (!phone) return '-';
    const d = phone.replace(/\D/g, '');
    if (d.startsWith('55') && d.length >= 6) {
      const ddd = d.slice(2, 4);
      const rest = d.slice(4);
      if (rest.length === 8) return `55 ${ddd} ${rest.slice(0, 4)}-${rest.slice(4)}`;
      if (rest.length === 9) return `55 ${ddd} ${rest.slice(0, 5)}-${rest.slice(5)}`;
      return `55 ${ddd} ${rest}`;
    }
    // fallback genérico
    if (d.length === 10) return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length === 11) return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`;
    return d;
  }

  return (
    <div className="space-y-4">
      {/* Filtros acima da tabela */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-48">
          <input
            placeholder="codCli"
            value={codCliInput}
            onChange={(e)=> setCodCliInput(e.target.value)}
            onKeyDown={(e)=>{ if(e.key === 'Enter'){ applyCodCliFilter(); } }}
            className="h-9 w-full border rounded-md px-2"
          />
        </div>
        <div className="w-64">
          <input
            placeholder="telefone"
            value={phoneInput}
            onChange={(e)=> setPhoneInput(e.target.value)}
            onKeyDown={(e)=>{ if(e.key === 'Enter'){ applyPhoneFilter(); } }}
            className="h-9 w-full border rounded-md px-2"
          />
        </div>
        <div className="w-40">
          <select className="w-40 h-9 border rounded-md px-2" value={filterStatus || 'all'} onChange={(e)=>{setPage(0); setFilterStatus(e.target.value === 'all' ? '' : e.target.value)}}>
            <option value="all">Todos</option>
            <option value="initial">Enviando</option>
            <option value="delivered">Entregue</option>
            <option value="read">Lida</option>
            <option value="failed">Não entregue</option>
          </select>
        </div>
        {/* Canal (opções dinâmicas com fallback) */}
        <div className="w-40">
          <select className="w-40 h-9 border rounded-md px-2" value={filterChannel || 'all'} onChange={(e)=>{setPage(0); setFilterChannel(e.target.value === 'all' ? '' : e.target.value)}}>
            <option value="all">Todos os canais</option>
            {Array.from(new Set(messages.map((m: Message) => m.channel).filter((c): c is string => Boolean(c)))).map((c) => (
              <option key={String(c)} value={String(c)}>{String(c)}</option>
            ))}
          </select>
        </div>
        <div className="w-40">
          <select className="w-40 h-9 border rounded-md px-2" value={filterOrigin || 'all'} onChange={(e)=>{setPage(0); setFilterOrigin(e.target.value === 'all' ? '' : e.target.value)}}>
            <option value="all">Todas as origens</option>
            <option value="Oferta">Oferta</option>
            <option value="Nps">Nps</option>
            <option value="Pedido">Pedido</option>
            <option value="Corte">Corte</option>
          </select>
        </div>
        <div className="w-44">
          <input type="date" className="h-9 w-full border rounded-md px-2" value={filterDate} onChange={(e)=>{setPage(0); setFilterDate(e.target.value)}} />
        </div>
      </div>
      {loading && <p>Carregando...</p>}
      {!loading && (
        <table className="min-w-full text-sm text-left text-gray-600">
          <thead className="bg-gray-100 text-xs uppercase font-medium">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">CodCli</th>
              <th className="px-4 py-2">Conteúdo</th>
              <th className="px-4 py-2">Telefone</th>
              <th className="px-4 py-2">Situação</th>
              <th className="px-4 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr
                key={m.id}
                className="border-b cursor-pointer hover:bg-gray-50"
                onDoubleClick={() => openConversationsModal(m.phone)}
              >
                <td className="px-4 py-2 font-mono">{m.id}</td>
                <td className="px-4 py-2">{m.codCli ?? '-'}</td>
                <td className="px-4 py-2 break-all max-w-[500px]">{m.content}</td>
                <td className="px-4 py-2">{formatPhone(m.phone)}</td>
                <td className="px-4 py-2"><span className={`inline-block px-2 py-0.5 rounded text-xs ${
                  ((m.state||'').toLowerCase()==='delivered')? 'bg-green-500 text-white':
                  ((m.state||'').toLowerCase()==='read')? 'bg-yellow-400 text-black':
                  ((m.state||'').toLowerCase()==='initial')? 'bg-blue-500 text-white':
                  ((m.state||'').toLowerCase()==='failed')? 'bg-red-500 text-white':'bg-gray-200 text-gray-700'
                }`}>{mapState(m.state)}</span></td>
                <td className="px-4 py-2">{new Date(m.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {messages.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center p-4">Nenhuma mensagem</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      <div className="flex justify-between items-center pt-2 gap-4 flex-wrap">
        <button type="button" className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</button>
        <span>
          Página {page + 1} {totalPages ? `de ${totalPages}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-24"
            min={1}
            max={totalPages || undefined}
            value={pageInput}
            disabled={!totalPages}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const raw = Number(pageInput);
                const n = Number.isFinite(raw) ? raw : 1;
                const clamped = Math.max(1, Math.min(n, totalPages || 1));
                setPage(clamped - 1);
              }
            }}
            placeholder="Ir para"
          />
          <button type="button"
            className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50"
            disabled={!totalPages}
            onClick={() => {
              const raw = Number(pageInput);
              const n = Number.isFinite(raw) ? raw : 1;
              const clamped = Math.max(1, Math.min(n, totalPages || 1));
              setPage(clamped - 1);
            }}
          >Ir</button>
        </div>
        <button type="button" className="px-3 py-1.5 border rounded-md text-sm disabled:opacity-50" disabled={totalPages ? page + 1 >= totalPages : false} onClick={() => setPage((p) => p + 1)}>Próxima</button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">Itens por página</span>
          <select className="w-28 h-9 border rounded-md px-2" value={String(pageSize)} onChange={(e)=>{ setPageSize(Number(e.target.value)); setPage(0); }}>
            <option value="7">7</option>
            <option value="14">14</option>
            <option value="21">21</option>
          </select>
        </div>
      </div>

      {/* Chat por telefone */}
      {modalPhone && (
        <ConversationsChat phone={modalPhone} onClose={() => setModalPhone(null)} />
      )}
    </div>
  );
}

