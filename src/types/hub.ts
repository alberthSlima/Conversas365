/**
 * Tipos para SignalR Hub
 */

import * as signalR from '@microsoft/signalr';

export type ConversationUpdatedPayload = {
  id?: number | string;
  state?: string;
  json?: unknown;
};

export type ConversationCreatedPayload = {
  id?: number | string;
  state?: string;
  json?: unknown;
};

export type WhatsappEnvelope = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          id?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
          button?: { text?: string; payload?: string };
          interactive?: {
            type?: string;
            button_reply?: { id?: string; title?: string };
            list_reply?: { id?: string; title?: string; description?: string };
          };
        }>;
        contacts?: Array<{
          wa_id?: string;
        }>;
        statuses?: Array<{
          id?: string;
          status?: string;
          timestamp?: string;
          recipient_id?: string;
        }>;
      };
    }>;
  }>;
};

export type HubAPI = {
  state: signalR.HubConnectionState | 'none';
  joinConversation: (id: number | string) => Promise<void>;
  leaveConversation: (id: number | string) => Promise<void>;
  sendMessage: (conversationId: number | string, content: string) => Promise<void>;
};
