import { z } from 'zod';

/**
 * Schema para conversa
 */
export const conversationSchema = z.object({
  id: z.number(),
  state: z.string().optional(),
  initiatedBy: z.string().optional(),
  context: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type Conversation = z.infer<typeof conversationSchema>;

/**
 * Schema para request de criação de conversa
 */
export const createConversationSchema = z.object({
  phone: z.string().min(1, 'Telefone é obrigatório'),
  templateId: z.string().min(1, 'Template ID é obrigatório'),
  components: z.array(z.any()).optional(),
});

export type CreateConversationRequest = z.infer<typeof createConversationSchema>;

/**
 * Schema para mensagem parseada (UI)
 */
export const parsedMessageSchema = z.object({
  text: z.string(),
  buttons: z.array(z.string()),
  images: z.array(z.string()),
  carouselCards: z.array(z.object({
    imageId: z.string(),
    buttons: z.array(z.object({
      text: z.string(),
      type: z.enum(['QUICK_REPLY', 'URL']),
      url: z.string().optional(),
    })),
  })),
});

export type ParsedMessage = z.infer<typeof parsedMessageSchema>;
