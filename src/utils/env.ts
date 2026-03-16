import { z } from 'zod';

/**
 * Schema de validação para variáveis de ambiente
 * Baseado em T3 Env pattern
 */
const envSchema = z.object({
  // API Externa (Medeiros)
  EXTERNAL_API_BASE_URL: z.string().url(),
  EXTERNAL_API_USERNAME: z.string().min(1),
  EXTERNAL_API_PASSWORD: z.string().min(1),
  ALLOW_INSECURE_TLS: z.string().transform(val => val === 'true'),

  // SignalR Hub
  HUB_URL: z.string().url(),
  NEXT_PUBLIC_HUB_LOGS: z.string().transform(val => val === 'true').optional(),

  // WhatsApp Business API
  WHATSAPP_API_VERSION: z.string().default('v24.0'),
  WHATSAPP_BUSINESS_ID: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),

  // Vercel Blob Storage
  BLOB_READ_WRITE_TOKEN: z.string().min(1),

  // Logging (opcional, padrão: false)
  ENABLE_LOGS: z.string().optional().default('false'),

  // Ambiente
  VERCEL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Valida e exporta variáveis de ambiente tipadas
 * Lança erro em build time se variáveis inválidas
 */
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Erro nas variáveis de ambiente:');
    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Variáveis de ambiente inválidas');
  }
};

export const env = parseEnv();

/**
 * Helper para verificar se está em produção (Vercel)
 */
export const isProduction = env.VERCEL === '1';

/**
 * Helper para verificar se está em desenvolvimento
 */
export const isDevelopment = env.NODE_ENV === 'development';
