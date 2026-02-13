"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Template } from '@/domain/entities/Template';
import { TemplateId } from '@/domain/value-objects/TemplateId';
import { TemplateRepository } from '@/infrastructure/repositories/TemplateRepository';

/**
 * Hook: useTemplate
 * Gerencia o carregamento de um template específico
 */
export function useTemplate(templateId: string) {
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => new TemplateRepository(), []);

  const loadTemplate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const id = TemplateId.create(templateId);
      const result = await repository.findById(id);
      
      if (!result) {
        setError('Template não encontrado');
      }
      
      setTemplate(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar template');
      console.error('Error loading template:', err);
    } finally {
      setLoading(false);
    }
  }, [templateId, repository]);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId, loadTemplate]);

  return {
    template,
    loading,
    error,
    reload: loadTemplate,
  };
}
