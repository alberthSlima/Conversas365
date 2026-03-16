import { z } from 'zod';

/**
 * Schema para request de download de mídia
 */
export const mediaDownloadSchema = z.object({
  mediaId: z.string().min(1, 'mediaId é obrigatório'),
  type: z.enum(['image', 'video', 'document']).default('image'),
});

export type MediaDownloadRequest = z.infer<typeof mediaDownloadSchema>;

/**
 * Schema para response de download de mídia
 */
export const mediaDownloadResponseSchema = z.object({
  success: z.boolean(),
  url: z.string(),
  mediaId: z.string(),
  size: z.number(),
  mimeType: z.string().optional(),
  cached: z.boolean(),
  cdn: z.boolean(),
  blob: z.boolean(),
  private: z.boolean().optional(),
  blobUrl: z.string().optional(),
});

export type MediaDownloadResponse = z.infer<typeof mediaDownloadResponseSchema>;

/**
 * Schema para informações de mídia do WhatsApp
 */
export const whatsappMediaInfoSchema = z.object({
  id: z.string(),
  messaging_product: z.string(),
  url: z.string().url(),
  mime_type: z.string(),
  sha256: z.string(),
  file_size: z.number(),
});

export type WhatsAppMediaInfo = z.infer<typeof whatsappMediaInfoSchema>;
