/**
 * Tipos compartilhados para templates do WhatsApp
 */

export type TemplateComponent = {
  type: string;
  text?: string;
  format?: string;
  buttons?: Array<{
    type: string;
    text: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export type Template = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components?: TemplateComponent[];
  [key: string]: unknown;
};

export type WhatsAppResponse = {
  data: Template[];
  paging?: {
    next?: string;
    cursors?: { before?: string; after?: string };
  };
};

// Tipo do template renderizado (igual ao C# RenderedResponse)
export type RenderedComponent = {
  Type: string;
  SubType?: string;
  Text: string;
  Index?: number;
  Url?: string;
  Parameters: Array<{
    Type: string;
    Text: string;
  }> | null;
};

export type RenderedResponse = {
  Components: RenderedComponent[];
};
