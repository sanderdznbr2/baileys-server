import { WASocket } from '@whiskeysockets/baileys';

export interface Session {
  sessionId: string;
  instanceName: string;
  socket: WASocket | null;
  webhookSecret: string;
  qrCode: string | null;
  isConnected: boolean;
  phoneNumber: string | null;
  pushName: string | null;
}

export interface WebhookPayload {
  event: string;
  sessionId: string;
  instanceName: string;
  data: any;
}