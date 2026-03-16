'use client';

import { useState, useEffect, useCallback } from 'react';
import { Template } from '@/types/whatsapp';
import { logger } from '@/utils/logger';

/**
 * Hook para gerenciar templates do WhatsApp
 * Simplificado sem camada DDD
 */

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/whatsapp/templates', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Erro ao carregar templates: ${response.status}`);
      }

      const data = await response.json();
      const templateList = Array.isArray(data.data) ? data.data : [];
      
      // Filtrar apenas aprovados
      const approved = templateList.filter((t: Template) => t.status === 'APPROVED');
      setTemplates(approved);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar templates';
      setError(message);
      logger.error('HOOK:TEMPLATES', 'Erro ao buscar templates', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const searchTemplates = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      await loadTemplates();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/whatsapp/templates', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar templates: ${response.status}`);
      }

      const data = await response.json();
      const templateList = Array.isArray(data.data) ? data.data : [];
      
      // Filtrar por termo de busca
      const filtered = templateList.filter((t: Template) => 
        t.status === 'APPROVED' &&
        (t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         t.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      setTemplates(filtered);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar templates';
      setError(message);
      logger.error('HOOK:TEMPLATES', 'Erro ao buscar templates', err);
    } finally {
      setLoading(false);
    }
  }, [loadTemplates]);

  return {
    templates,
    loading,
    error,
    reload: loadTemplates,
    search: searchTemplates,
  };
}
