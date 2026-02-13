import { ITemplateRepository } from '@/domain/repositories/ITemplateRepository';
import { Template, TemplateComponent } from '@/domain/entities/Template';
import { TemplateId } from '@/domain/value-objects/TemplateId';
import { ApiClient } from '../http/ApiClient';

/**
 * Infrastructure: TemplateRepository
 * Implementação concreta do repositório de Templates
 */
export class TemplateRepository implements ITemplateRepository {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient('/api/whatsapp');
  }

  async findAll(): Promise<Template[]> {
    try {
      const response = await this.apiClient.get<{ data: unknown[] }>('/templates');
      
      return response.data.map((item: unknown) => {
        const record = item as Record<string, unknown>;
        return Template.fromPrimitives({
          id: record.id as string,
          name: record.name as string,
          language: record.language as string,
          status: record.status as string,
          category: record.category as string,
          components: (record.components as TemplateComponent[]) || [],
        });
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
      throw new Error('Falha ao buscar templates');
    }
  }

  async findById(id: TemplateId): Promise<Template | null> {
    try {
      const templates = await this.findAll();
      return templates.find((t) => t.getId().equals(id)) || null;
    } catch (error) {
      console.error('Error fetching template by ID:', error);
      return null;
    }
  }

  async findApproved(): Promise<Template[]> {
    try {
      const templates = await this.findAll();
      return templates.filter((t) => t.isApproved());
    } catch (error) {
      console.error('Error fetching approved templates:', error);
      throw new Error('Falha ao buscar templates aprovados');
    }
  }

  async searchByName(searchTerm: string): Promise<Template[]> {
    try {
      const templates = await this.findAll();
      const lowerSearch = searchTerm.toLowerCase();
      
      return templates.filter((t) =>
        t.getName().toLowerCase().includes(lowerSearch)
      );
    } catch (error) {
      console.error('Error searching templates:', error);
      throw new Error('Falha ao buscar templates');
    }
  }
}
