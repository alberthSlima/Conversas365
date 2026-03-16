import { Conversation } from './conversation';

export type Message = {
  id: number;
  conversationId: number;
  conversation?: Conversation;
  channel?: string | null;
  content?: string;
  origin?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type MessageRequest = {
  conversationId: number;
  channel?: string;
  content?: string;
  origin?: string;
};
