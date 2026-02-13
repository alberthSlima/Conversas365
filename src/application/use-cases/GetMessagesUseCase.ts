import { IMessageRepository } from '@/domain/repositories/IMessageRepository';
import { Message } from '@/domain/entities/Message';
import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';

/**
 * Use Case: GetMessages
 * Busca mensagens de uma conversa
 */
export class GetMessagesUseCase {
  constructor(private messageRepository: IMessageRepository) {}

  async execute(phone: string): Promise<Message[]> {
    const phoneNumber = PhoneNumber.create(phone);
    return this.messageRepository.findByPhone(phoneNumber);
  }
}
