import { Template } from '../entities/Template';
import { TemplateId } from '../value-objects/TemplateId';

/**
 * Interface: ITemplateRepository
 * Define o contrato para operações de persistência de Templates
 */
export interface ITemplateRepository {
  /**
   * Busca todos os templates
   */
  findAll(): Promise<Template[]>;

  /**
   * Busca um template específico por ID
   */
  findById(id: TemplateId): Promise<Template | null>;

  /**
   * Busca templates aprovados
   */
  findApproved(): Promise<Template[]>;

  /**
   * Busca templates por nome (filtro)
   */
  searchByName(searchTerm: string): Promise<Template[]>;
}
