import { z } from 'zod';

/**
 * Schema para componente renderizado de template
 */
export const renderedComponentSchema = z.object({
  Type: z.string(),
  SubType: z.string().optional(),
  Text: z.string(),
  Index: z.number().optional(),
  Url: z.string().optional(),
  Parameters: z.array(z.object({
    Type: z.string(),
    Text: z.string(),
  })).nullable(),
});

export type RenderedComponent = z.infer<typeof renderedComponentSchema>;

/**
 * Schema para resposta renderizada de template
 */
export const renderedResponseSchema = z.object({
  Components: z.array(renderedComponentSchema),
});

export type RenderedResponse = z.infer<typeof renderedResponseSchema>;

/**
 * Schema para card de carousel
 */
export const carouselCardSchema = z.object({
  imageId: z.string(),
  buttons: z.array(z.object({
    text: z.string(),
    type: z.enum(['QUICK_REPLY', 'URL']),
    url: z.string().optional(),
  })),
});

export type CarouselCard = z.infer<typeof carouselCardSchema>;
