'use client';

import { useState, useEffect, useCallback } from 'react';
import { Template } from '@/types/whatsapp';
import { logger } from '@/utils/logger';

/**
 * Hook para gerenciar um template específico
 */

export function useTemplate(templateId: string) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplate = useCallback(async () => {
    if (!templateId) {
      setTemplate(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/whatsapp/templates', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar template: ${response.status}`);
      }

      const data = await response.json();
      const templateList = Array.isArray(data.data) ? data.data : [];
      
      const found = templateList.find((t: Template) => t.id === templateId);
      
      if (!found) {
        setError('Template não encontrado');
        setTemplate(null);
      } else {
        setTemplate(found);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar template';
      setError(message);
      logger.error('HOOK:TEMPLATE', 'Erro ao buscar template', err);
    } finally {
      setLoading(false);
    }
  }, [templateId]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  return {
    template,
    loading,
    error,
    reload: loadTemplate,
  };
}
