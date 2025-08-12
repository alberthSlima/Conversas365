"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Conversation {
  id: number;
  state?: string;
  createdAt: string;
  updatedAt: string;
  initiatedBy?: string;
  waId?: string | null;
  waConvId?: string | null;
}

export function ConversationsModal({ phone, onClose }: { phone: string; onClose: () => void }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/conversations?phone=${encodeURIComponent(phone)}`);
      if (active) {
        if (res.ok) {
          const { data } = await res.json();
          setConversations(data || []);
        }
        setLoading(false);
      }
    })();
    return () => { active = false };
  }, [phone]);

  function stateBadge(state?: string) {
    const s = (state || '').toLowerCase();
    const label = s === 'read' ? 'Lida' : s === 'delivered' ? 'Entregue' : s === 'failed' ? 'Não entregue' : 'Enviando';
    if (s === 'delivered') return <Badge className="bg-green-500 text-white border-transparent">{label}</Badge>;
    if (s === 'read') return <Badge className="bg-yellow-400 text-black border-transparent">{label}</Badge>;
    if (s === 'initial') return <Badge className="bg-blue-500 text-white border-transparent">{label}</Badge>;
    if (s === 'failed') return <Badge className="bg-red-500 text-white border-transparent">{label}</Badge>;
    return <Badge variant="secondary">{label}</Badge>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">Conversas para {phone}</h3>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </div>
        <div className="p-4 space-y-3">
          {loading && <p>Carregando...</p>}
          {!loading && conversations.map((c) => (
            <div key={c.id} className="border rounded-md p-3 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono">#{c.id}</span>
                {stateBadge(c.state)}
                <span className="text-gray-500 ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-xs text-gray-500 flex gap-4">
                <span>initiatedBy: {c.initiatedBy ?? '-'}</span>
                <span>waId: {c.waId ?? '-'}</span>
                <span>waConvId: {c.waConvId ?? '-'}</span>
              </div>
            </div>
          ))}
          {!loading && conversations.length === 0 && (
            <p className="text-sm text-gray-600">Nenhuma conversa encontrada.</p>
          )}
        </div>
      </div>
    </div>
  );
}


