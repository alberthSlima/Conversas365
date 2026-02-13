"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Message } from '@/domain/entities/Message';
import { MessageRepository } from '@/infrastructure/repositories/MessageRepository';
import { GetMessagesUseCase } from '@/application/use-cases/GetMessagesUseCase';

/**
 * Hook: useMessages
 * Gerencia o carregamento de mensagens de uma conversa
 */
export function useMessages(phone: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => new MessageRepository(), []);
  const getMessagesUseCase = useMemo(
    () => new GetMessagesUseCase(repository),
    [repository]
  );

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMessagesUseCase.execute(phone);
      setMessages(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens');
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  }, [phone, getMessagesUseCase]);

  useEffect(() => {
    if (phone) {
      loadMessages();
    }
  }, [phone, loadMessages]);

  return {
    messages,
    loading,
    error,
    reload: loadMessages,
  };
}
