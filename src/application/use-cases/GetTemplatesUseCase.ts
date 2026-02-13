import { ITemplateRepository } from '@/domain/repositories/ITemplateRepository';
import { Template } from '@/domain/entities/Template';

/**
 * Use Case: GetTemplates
 * Busca todos os templates disponíveis
 */
export class GetTemplatesUseCase {
  constructor(private templateRepository: ITemplateRepository) {}

  async execute(): Promise<Template[]> {
    return this.templateRepository.findAll();
  }
}

/**
 * Use Case: GetApprovedTemplates
 * Busca apenas templates aprovados
 */
export class GetApprovedTemplatesUseCase {
  constructor(private templateRepository: ITemplateRepository) {}

  async execute(): Promise<Template[]> {
    return this.templateRepository.findApproved();
  }
}

/**
 * Use Case: SearchTemplates
 * Busca templates por nome
 */
export class SearchTemplatesUseCase {
  constructor(private templateRepository: ITemplateRepository) {}

  async execute(searchTerm: string): Promise<Template[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return this.templateRepository.findAll();
    }
    
    return this.templateRepository.searchByName(searchTerm);
  }
}
