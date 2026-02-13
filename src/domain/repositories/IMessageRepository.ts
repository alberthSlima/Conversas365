import { Message } from '../entities/Message';
import { PhoneNumber } from '../value-objects/PhoneNumber';

/**
 * Interface: IMessageRepository
 * Define o contrato para operações de persistência de Mensagens
 */
export interface IMessageRepository {
  /**
   * Busca todas as mensagens de um telefone específico
   */
  findByPhone(phone: PhoneNumber): Promise<Message[]>;

  /**
   * Busca uma mensagem por ID
   */
  findById(id: number): Promise<Message | null>;
}
