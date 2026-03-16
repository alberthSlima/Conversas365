import { z } from 'zod';

/**
 * Schema de validação para variáveis de ambiente
 * Baseado em T3 Env pattern
 * 
 * IMPORTANTE: Este arquivo só deve ser importado em código SERVER-SIDE
 * Para variáveis client-side, use NEXT_PUBLIC_ prefix
 */
const envSchema = z.object({
  // API Externa (Medeiros) - SERVER ONLY
  EXTERNAL_API_BASE_URL: z.string().url(),
  EXTERNAL_API_USERNAME: z.string().min(1),
  EXTERNAL_API_PASSWORD: z.string().min(1),
  ALLOW_INSECURE_TLS: z.string().transform(val => val === 'true'),

  // SignalR Hub - SERVER ONLY
  HUB_URL: z.string().url(),

  // WhatsApp Business API - SERVER ONLY
  WHATSAPP_API_VERSION: z.string().default('v24.0'),
  WHATSAPP_BUSINESS_ID: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),

  // Vercel Blob Storage - SERVER ONLY
  BLOB_READ_WRITE_TOKEN: z.string().min(1),

  // Logging (opcional, padrão: false) - SERVER ONLY
  ENABLE_LOGS: z.string().optional().default('false'),

  // Ambiente
  VERCEL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Schema para variáveis de ambiente CLIENT-SIDE (NEXT_PUBLIC_*)
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_HUB_LOGS: z.string().transform(val => val === 'true').optional(),
});

/**
 * Valida variáveis de ambiente SERVER-SIDE
 * ATENÇÃO: Só chamar em código server-side (API routes, Server Components, etc)
 */
const parseServerEnv = () => {
  // Verificar se está no servidor
  if (typeof window !== 'undefined') {
    throw new Error('env.ts: Tentativa de acessar variáveis server-side no client-side. Use getServerSideEnv() apenas em código server.');
  }

  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Erro nas variáveis de ambiente (SERVER):');
    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Variáveis de ambiente inválidas');
  }
};

/**
 * Valida variáveis de ambiente CLIENT-SIDE
 */
const parseClientEnv = () => {
  try {
    return clientEnvSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Erro nas variáveis de ambiente (CLIENT):');
    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Variáveis de ambiente inválidas');
  }
};

// Exportar apenas no servidor
export const env = typeof window === 'undefined' ? parseServerEnv() : {} as ReturnType<typeof parseServerEnv>;

// Exportar para cliente (sempre disponível)
export const clientEnv = parseClientEnv();

/**
 * Helper para verificar se está em produção (Vercel)
 */
export const isProduction = typeof window === 'undefined' && process.env.VERCEL === '1';

/**
 * Helper para verificar se está em desenvolvimento
 */
export const isDevelopment = typeof window === 'undefined' && process.env.NODE_ENV === 'development';
