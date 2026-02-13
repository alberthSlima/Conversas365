"use client";

import { useState } from 'react';
import {
  SendTemplateUseCase,
  SendTemplateDTO,
  SendTemplateResult,
} from '@/application/use-cases/SendTemplateUseCase';

/**
 * Hook: useSendTemplate
 * Gerencia o envio de templates do WhatsApp
 */
export function useSendTemplate() {
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendTemplateResult[]>([]);

  const sendTemplateUseCase = new SendTemplateUseCase();

  const sendToSingle = async (dto: SendTemplateDTO): Promise<SendTemplateResult> => {
    setSending(true);
    try {
      const result = await sendTemplateUseCase.executeSingle(dto);
      setResults([result]);
      return result;
    } finally {
      setSending(false);
    }
  };

  const sendToMultiple = async (
    templateData: Omit<SendTemplateDTO, 'to'>,
    phones: string[]
  ): Promise<SendTemplateResult[]> => {
    setSending(true);
    try {
      const results = await sendTemplateUseCase.executeMultiple(templateData, phones);
      setResults(results);
      return results;
    } finally {
      setSending(false);
    }
  };

  const validatePhones = (phones: string[]) => {
    return sendTemplateUseCase.validatePhones(phones);
  };

  const clearResults = () => {
    setResults([]);
  };

  return {
    sending,
    results,
    sendToSingle,
    sendToMultiple,
    validatePhones,
    clearResults,
  };
}
