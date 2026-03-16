export type ConversationState = 'initial' | 'received' | 'sent' | 'delivered' | 'read' | 'failed';
export type ConversationInitiator = 'SYSTEM' | 'CLIENT';


export type Conversation = {
  id: number;
  phone?: string;
  codCli?: number;
  waId?: string;
  waConvId?: string;
  state?: string;
  context?: unknown;
  initiatedBy?: ConversationInitiator | string;
  createdAt: string;
  updatedAt?: string;
};

/**
 * ConversationRequest (C#)
 */
export type ConversationRequest = {
  phone?: string;
  waId?: string;
  state?: string;
  context?: unknown;
  initiatedBy?: ConversationInitiator | string;
};

export type ConversationMessage = {
  id: number;
  state?: string;
  initiatedBy?: string;
  context?: string;
  createdAt: string;
  updatedAt?: string;
};

export type ParsedMessage = {
  text: string;
  buttons: string[];
  images: string[];
  carouselCards: CarouselCard[];
};

export type CarouselCard = {
  imageId: string;
  buttons: CarouselButton[];
};

export type CarouselButton = {
  text: string;
  type: 'QUICK_REPLY' | 'URL';
  url?: string;
};
