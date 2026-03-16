'use client';

import { useState } from 'react';

/**
 * Hook para enviar templates do WhatsApp
 */

type SendTemplateParams = {
  to: string;
  templateName: string;
  languageCode: string;
  components?: unknown[];
};

type SendTemplateResult = {
  success: boolean;
  phone: string;
  messageId?: string;
  error?: string;
};

export function useSendTemplate() {
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<SendTemplateResult[]>([]);

  const sendToSingle = async (params: SendTemplateParams): Promise<SendTemplateResult> => {
    setSending(true);
    try {
      const response = await fetch('/api/whatsapp/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      const result: SendTemplateResult = {
        success: response.ok,
        phone: params.to,
        messageId: data.messageId,
        error: data.error,
      };

      setResults([result]);
      return result;
    } catch (err) {
      const result: SendTemplateResult = {
        success: false,
        phone: params.to,
        error: err instanceof Error ? err.message : 'Erro ao enviar template',
      };
      setResults([result]);
      return result;
    } finally {
      setSending(false);
    }
  };

  const sendToMultiple = async (
    templateData: Omit<SendTemplateParams, 'to'>,
    phones: string[]
  ): Promise<SendTemplateResult[]> => {
    setSending(true);
    try {
      const promises = phones.map(phone =>
        sendToSingle({ ...templateData, to: phone })
      );
      const results = await Promise.all(promises);
      setResults(results);
      return results;
    } finally {
      setSending(false);
    }
  };

  const validatePhones = (phones: string[]): { valid: string[]; invalid: string[] } => {
    const valid: string[] = [];
    const invalid: string[] = [];

    phones.forEach(phone => {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length >= 10 && cleaned.length <= 15) {
        valid.push(cleaned);
      } else {
        invalid.push(phone);
      }
    });

    return { valid, invalid };
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
