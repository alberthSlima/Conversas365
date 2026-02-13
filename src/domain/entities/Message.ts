import { PhoneNumber } from '../value-objects/PhoneNumber';

/**
 * Entity: Message
 * Representa uma mensagem em uma conversa
 */

export type MessageState = 'initial' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageInitiator = 'SYSTEM' | 'CLIENT';

export class Message {
  constructor(
    private readonly id: number,
    private readonly phoneNumber: PhoneNumber,
    private readonly state: MessageState,
    private readonly initiatedBy: MessageInitiator,
    private readonly context: string,
    private readonly createdAt: Date,
    private readonly updatedAt?: Date
  ) {}

  static fromPrimitives(data: {
    id: number;
    phone: string;
    state?: string;
    initiatedBy?: string;
    context?: string;
    createdAt: string;
    updatedAt?: string;
  }): Message {
    return new Message(
      data.id,
      PhoneNumber.create(data.phone),
      (data.state as MessageState) || 'initial',
      (data.initiatedBy as MessageInitiator) || 'CLIENT',
      data.context || '',
      new Date(data.createdAt),
      data.updatedAt ? new Date(data.updatedAt) : undefined
    );
  }

  getId(): number {
    return this.id;
  }

  getPhoneNumber(): PhoneNumber {
    return this.phoneNumber;
  }

  getState(): MessageState {
    return this.state;
  }

  getInitiatedBy(): MessageInitiator {
    return this.initiatedBy;
  }

  getContext(): string {
    return this.context;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date | undefined {
    return this.updatedAt;
  }

  isFromSystem(): boolean {
    return this.initiatedBy === 'SYSTEM';
  }

  isFromClient(): boolean {
    return this.initiatedBy === 'CLIENT';
  }

  isFailed(): boolean {
    return this.state === 'failed';
  }

  isRead(): boolean {
    return this.state === 'read';
  }

  /**
   * Converte para formato primitivo (para APIs, UI, etc)
   */
  toPrimitives(): {
    id: number;
    phone: string;
    state: string;
    initiatedBy: string;
    context: string;
    createdAt: string;
    updatedAt?: string;
  } {
    return {
      id: this.id,
      phone: this.phoneNumber.getValue(),
      state: this.state,
      initiatedBy: this.initiatedBy,
      context: this.context,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt?.toISOString(),
    };
  }
}
