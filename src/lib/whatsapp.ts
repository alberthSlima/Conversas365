/**
 * Configuração central do WhatsApp (Graph API).
 * Token e versão são únicos para todo o projeto; phoneNumberId e businessId
 * vêm do .env e são usados por rotas específicas.
 */
const DEFAULT_VERSION = 'v24.0';

export type WhatsAppConfig = {
  token: string;
  version: string;
  phoneNumberId: string | undefined;
  businessId: string | undefined;
};

let cached: WhatsAppConfig | null = null;

/**
 * Retorna a configuração do WhatsApp (lê do process.env; cache em memória).
 */
export function getWhatsAppConfig(): WhatsAppConfig {
  if (cached) return cached;
  cached = {
    token: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
    version: process.env.WHATSAPP_API_VERSION || DEFAULT_VERSION,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessId: process.env.WHATSAPP_BUSINESS_ID,
  };
  return cached;
}

/**
 * Exige token. Usado por rotas que só precisam do token (ex.: GET mídia).
 */
export function requireToken(): { token: string; version: string } {
  const { token, version } = getWhatsAppConfig();
  if (!token) {
    throw new Error('WHATSAPP_ACCESS_TOKEN não configurado');
  }
  return { token, version };
}

/**
 * Exige token + phoneNumberId. Usado por envio de mensagem e upload de mídia.
 */
export function requirePhoneNumberId(): WhatsAppConfig {
  const config = getWhatsAppConfig();
  if (!config.token || !config.phoneNumberId) {
    throw new Error(
      'Credenciais WhatsApp não configuradas (WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN)'
    );
  }
  return config;
}

/**
 * Exige token + businessId. Usado por listagem de templates.
 */
export function requireBusinessId(): WhatsAppConfig {
  const config = getWhatsAppConfig();
  if (!config.token || !config.businessId) {
    throw new Error(
      'Credenciais WhatsApp não configuradas (WHATSAPP_BUSINESS_ID e WHATSAPP_ACCESS_TOKEN)'
    );
  }
  return config;
}

/**
 * URL base do Graph API (sem barra final).
 */
export function graphBaseUrl(): string {
  const { version } = getWhatsAppConfig();
  return `https://graph.facebook.com/${version}`;
}

/**
 * Headers de autorização para chamadas ao Graph API.
 */
export function authHeaders(token?: string): { Authorization: string } {
  const t = token ?? getWhatsAppConfig().token;
  return { Authorization: `Bearer ${t}` };
}
