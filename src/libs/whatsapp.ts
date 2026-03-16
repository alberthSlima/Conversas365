import { env } from '@/utils/env';

/**
 * Cliente WhatsApp Business API
 * Centraliza toda a lógica de comunicação com o Graph API
 */

export type WhatsAppConfig = {
  token: string;
  version: string;
  phoneNumberId: string;
  businessId: string;
};

/**
 * Retorna configuração do WhatsApp
 */
export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    token: env.WHATSAPP_ACCESS_TOKEN,
    version: env.WHATSAPP_API_VERSION,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    businessId: env.WHATSAPP_BUSINESS_ID,
  };
}

/**
 * URL base do Graph API
 */
export function getGraphBaseUrl(): string {
  return `https://graph.facebook.com/${env.WHATSAPP_API_VERSION}`;
}

/**
 * Headers de autorização
 */
export function getAuthHeaders(token?: string): HeadersInit {
  const t = token ?? env.WHATSAPP_ACCESS_TOKEN;
  return {
    Authorization: `Bearer ${t}`,
  };
}

/**
 * Buscar informações de uma mídia
 */
export async function getMediaInfo(mediaId: string): Promise<{
  url: string;
  mime_type: string;
  file_size: number;
}> {
  const baseUrl = getGraphBaseUrl();
  const response = await fetch(`${baseUrl}/${mediaId}`, {
    headers: getAuthHeaders(),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao buscar mídia ${mediaId}: ${response.status} - ${errorText}`);
  }

  return response.json();
}

/**
 * Baixar mídia do WhatsApp
 */
export async function downloadMedia(mediaUrl: string): Promise<Buffer> {
  const response = await fetch(mediaUrl, {
    headers: getAuthHeaders(),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Erro ao baixar mídia: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Enviar template do WhatsApp
 */
export async function sendTemplate(params: {
  to: string;
  templateName: string;
  languageCode: string;
  components?: unknown[];
}): Promise<{ messageId: string }> {
  const config = getWhatsAppConfig();
  const baseUrl = getGraphBaseUrl();

  const response = await fetch(`${baseUrl}/${config.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.languageCode },
        components: params.components || [],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao enviar template: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return { messageId: data.messages?.[0]?.id };
}

/**
 * Listar templates do WhatsApp
 */
export async function listTemplates(): Promise<unknown[]> {
  const config = getWhatsAppConfig();
  const baseUrl = getGraphBaseUrl();

  const response = await fetch(
    `${baseUrl}/${config.businessId}/message_templates?limit=100`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao listar templates: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.data || [];
}
