import { PhoneNumber } from '@/domain/value-objects/PhoneNumber';
import { ApiClient } from '@/infrastructure/http/ApiClient';

/**
 * DTO para envio de template
 */
export type SendTemplateDTO = {
  to: string;
  template: {
    name: string;
    language: {
      code: string;
    };
    components: Array<{
      type: string;
      parameters: Array<{
        type: string;
        text?: string;
      }>;
      sub_type?: string;
      index?: number;
    }>;
  };
};

/**
 * Resultado do envio
 */
export type SendTemplateResult = {
  success: boolean;
  phone: string;
  messageId?: string;
  error?: string;
};

/**
 * Use Case: SendTemplate
 * Envia um template de mensagem do WhatsApp
 */
export class SendTemplateUseCase {
  private apiClient: ApiClient;

  constructor(apiClient?: ApiClient) {
    this.apiClient = apiClient || new ApiClient('/api/whatsapp');
  }

  /**
   * Envia um template para um único número
   */
  async executeSingle(dto: SendTemplateDTO): Promise<SendTemplateResult> {
    try {
      // Validar número de telefone
      const phoneNumber = PhoneNumber.create(dto.to);

      const response = await this.apiClient.post<{ messages?: { id: string }[] }>(
        '/send-template',
        { ...dto, to: phoneNumber.getValue() }
      );

      return {
        success: true,
        phone: phoneNumber.getValue(),
        messageId: response.messages?.[0]?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      return {
        success: false,
        phone: dto.to,
        error: errorMessage,
      };
    }
  }

  /**
   * Envia um template para múltiplos números
   */
  async executeMultiple(
    templateData: Omit<SendTemplateDTO, 'to'>,
    phones: string[]
  ): Promise<SendTemplateResult[]> {
    const results: SendTemplateResult[] = [];

    for (const phone of phones) {
      const result = await this.executeSingle({
        ...templateData,
        to: phone,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Valida se todos os números são válidos antes de enviar
   */
  validatePhones(phones: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const phone of phones) {
      const phoneNumber = PhoneNumber.createOrNull(phone);
      if (phoneNumber) {
        valid.push(phoneNumber.getValue());
      } else {
        invalid.push(phone);
      }
    }

    return { valid, invalid };
  }
}
