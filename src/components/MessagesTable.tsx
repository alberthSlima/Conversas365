"use client";

import { useEffect, useState } from "react";
// Consome a rota interna que faz proxy para a API do backend (sem acesso direto ao banco)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConversationsChat } from "./ConversationsChat";
import { Button } from "@/components/ui/button";

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

  function renderState(state?: string) {
    const label = mapState(state);
    const s = (state || '').toLowerCase();
    if (s === 'delivered') return <Badge className="bg-green-500 text-white border-transparent">{label}</Badge>;
    if (s === 'read') return <Badge className="bg-yellow-400 text-black border-transparent">{label}</Badge>;
    if (s === 'initial') return <Badge className="bg-blue-500 text-white border-transparent">{label}</Badge>;
    if (s === 'failed') return <Badge className="bg-red-500 text-white border-transparent">{label}</Badge>;
    return <Badge variant="secondary">{label}</Badge>;
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
          <Input
            placeholder="codCli"
            value={codCliInput}
            onChange={(e)=> setCodCliInput(e.target.value)}
            onKeyDown={(e)=>{ if(e.key === 'Enter'){ applyCodCliFilter(); } }}
          />
        </div>
        <div className="w-64">
          <Input
            placeholder="telefone"
            value={phoneInput}
            onChange={(e)=> setPhoneInput(e.target.value)}
            onKeyDown={(e)=>{ if(e.key === 'Enter'){ applyPhoneFilter(); } }}
          />
        </div>
        <div className="w-40">
          <Select value={filterStatus || undefined} onValueChange={(v: string)=>{setPage(0); setFilterStatus(v === 'all' ? '' : v)}}>
            <SelectTrigger className="w-40"><SelectValue placeholder="status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="initial">Enviando</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="read">Lida</SelectItem>
              <SelectItem value="failed">Não entregue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Canal (opções dinâmicas com fallback) */}
        <div className="w-40">
          <Select value={filterChannel || undefined} onValueChange={(v: string)=>{setPage(0); setFilterChannel(v === 'all' ? '' : v)}}>
            <SelectTrigger className="w-40"><SelectValue placeholder="canal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              {/* Opções dinâmicas a partir da página atual */}
              {Array.from(new Set(messages.map((m: Message) => m.channel).filter((c): c is string => Boolean(c)))).map((c) => (
                <SelectItem key={String(c)} value={String(c)}>{String(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Select value={filterOrigin || undefined} onValueChange={(v: string)=>{setPage(0); setFilterOrigin(v === 'all' ? '' : v)}}>
            <SelectTrigger className="w-40"><SelectValue placeholder="origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="Oferta">Oferta</SelectItem>
              <SelectItem value="Nps">Nps</SelectItem>
              <SelectItem value="Pedido">Pedido</SelectItem>
              <SelectItem value="Corte">Corte</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Input type="date" value={filterDate} onChange={(e)=>{setPage(0); setFilterDate(e.target.value)}} />
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
                <td className="px-4 py-2">{renderState(m.state)}</td>
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
        <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
        <span>
          Página {page + 1} {totalPages ? `de ${totalPages}` : ""}
        </span>
        <div className="flex items-center gap-2">
          <Input
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
          <Button
            variant="outline"
            disabled={!totalPages}
            onClick={() => {
              const raw = Number(pageInput);
              const n = Number.isFinite(raw) ? raw : 1;
              const clamped = Math.max(1, Math.min(n, totalPages || 1));
              setPage(clamped - 1);
            }}
          >Ir</Button>
        </div>
        <Button variant="outline" disabled={totalPages ? page + 1 >= totalPages : false} onClick={() => setPage((p) => p + 1)}>Próxima</Button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">Itens por página</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v: string) => {
              const n = Number(v);
              setPageSize(n);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7</SelectItem>
              <SelectItem value="14">14</SelectItem>
              <SelectItem value="21">21</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chat por telefone */}
      {modalPhone && (
        <ConversationsChat phone={modalPhone} onClose={() => setModalPhone(null)} />
      )}
    </div>
  );
} 