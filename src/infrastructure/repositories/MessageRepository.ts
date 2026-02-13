import { IMessageRepository } from '@/domain/repositories/IMessageRepository';
import { Message } from '@/domain/entities/Message';
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';
import { ApiClient } from '../http/ApiClient';

/**
 * Infrastructure: MessageRepository
 * Implementação concreta do repositório de Mensagens
 */
export class MessageRepository implements IMessageRepository {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient('/api');
  }

  async findByPhone(phone: PhoneNumber): Promise<Message[]> {
    try {
      const response = await this.apiClient.get<{ data: unknown[] }>(
        `/conversations?phone=${encodeURIComponent(phone.getValue())}`
      );

      return response.data.map((item: unknown) => {
        const record = item as Record<string, unknown>;
        return Message.fromPrimitives({
          id: record.id as number,
          phone: phone.getValue(),
          state: record.state as string,
          initiatedBy: record.initiatedBy as string,
          context: record.context as string,
          createdAt: record.createdAt as string,
          updatedAt: record.updatedAt as string | undefined,
        });
      });
    } catch (error) {
      console.error('Error fetching messages by phone:', error);
      throw new Error('Falha ao buscar mensagens');
    }
  }

  async findById(): Promise<Message | null> {
    // Nota: A API atual não possui endpoint para buscar mensagem por ID
    // Isso seria implementado quando a API backend tiver esse recurso
    console.warn('findById not implemented in current API');
    return null;
  }
}
