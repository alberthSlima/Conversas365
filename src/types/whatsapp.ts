/**
 * Tipos para WhatsApp Business API
 */

export type WhatsAppMediaType = 'image' | 'video' | 'document';

export type WhatsAppMediaInfo = {
  id: string;
  messaging_product: string;
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
};

export type WhatsAppTemplateComponent = {
  type: string;
  sub_type?: string;
  parameters?: Array<{
    type: string;
    text?: string;
    image?: { link?: string; id?: string };
    video?: { link?: string; id?: string };
    document?: { link?: string; id?: string };
  }>;
  index?: number;
};

export type WhatsAppTemplate = {
  id: string;
  name: string;
  language: string;
  status: string;
  category: string;
  components: WhatsAppTemplateComponent[];
};

export type WhatsAppSendTemplateRequest = {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: WhatsAppTemplateComponent[];
  };
};

export type WhatsAppResponse = {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
};

// Tipos para templates do WhatsApp (front-end)
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

export type Templates = {
  data: Template[];
  paging?: {
    next?: string;
    cursors?: { before?: string; after?: string };
  };
};

// Tipos do template renderizado (C# RenderedResponse)
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

