"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Template } from '@/domain/entities/Template';
import { TemplateRepository } from '@/infrastructure/repositories/TemplateRepository';
import {
  GetApprovedTemplatesUseCase,
  SearchTemplatesUseCase,
} from '@/application/use-cases/GetTemplatesUseCase';

/**
 * Hook: useTemplates
 * Gerencia o estado e carregamento de templates
 */
export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => new TemplateRepository(), []);
  const getApprovedTemplatesUseCase = useMemo(
    () => new GetApprovedTemplatesUseCase(repository),
    [repository]
  );

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getApprovedTemplatesUseCase.execute();
      setTemplates(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar templates');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  }, [getApprovedTemplatesUseCase]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const searchTemplates = useCallback(async (searchTerm: string) => {
    try {
      setLoading(true);
      setError(null);
      const searchUseCase = new SearchTemplatesUseCase(repository);
      const result = await searchUseCase.execute(searchTerm);
      setTemplates(result.filter((t) => t.isApproved()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar templates');
      console.error('Error searching templates:', err);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  return {
    templates,
    loading,
    error,
    reload: loadTemplates,
    search: searchTemplates,
  };
}
