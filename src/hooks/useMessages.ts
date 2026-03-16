'use client';

import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/types/message';
import { logger } from '@/utils/logger';

/**
 * Hook para gerenciar mensagens de uma conversa
 */

export function useMessages(phone: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!phone) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/messages?phone=${encodeURIComponent(phone)}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar mensagens: ${response.status}`);
      }

      const data = await response.json();
      const messageList = Array.isArray(data.data) ? data.data : [];
      setMessages(messageList);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar mensagens';
      setError(message);
      logger.error('HOOK:MESSAGES', 'Erro ao buscar mensagens', err);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  return {
    messages,
    loading,
    error,
    reload: loadMessages,
  };
}
