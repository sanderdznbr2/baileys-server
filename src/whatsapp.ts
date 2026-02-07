import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { Session, WebhookPayload } from './types';

const logger = pino({ level: 'silent' });
const WEBHOOK_URL = process.env.SUPABASE_WEBHOOK_URL || '';
const SESSIONS_DIR = path.join(__dirname, '..', 'sessions');

// Store active sessions
export const sessions: Map<string, Session> = new Map();

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Send webhook to Supabase
async function sendWebhook(payload: WebhookPayload) {
  if (!WEBHOOK_URL) {
    console.log('⚠️ No webhook URL configured');
    return;
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`📤 Webhook sent: ${payload.event} - Status: ${response.status}`);
  } catch (error: any) {
    console.error('❌ Webhook error:', error.message);
  }
}

// Create WhatsApp session
export async function createSession(
  sessionId: string, 
  instanceName: string, 
  webhookSecret: string
): Promise<Session> {
  if (sessions.has(sessionId)) {
    console.log(`Session ${instanceName} already exists`);
    return sessions.get(sessionId)!;
  }

  const sessionPath = path.join(SESSIONS_DIR, instanceName);
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();
  
  console.log(`📱 Creating session: ${instanceName} (Baileys v${version.join('.')})`);

  const session: Session = {
    sessionId,
    instanceName,
    socket: null,
    webhookSecret,
    qrCode: null,
    isConnected: false,
    phoneNumber: null,
    pushName: null
  };

  sessions.set(sessionId, session);

  const socket = makeWASocket({
    version,
    logger,
    printQRInTerminal: true,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: ['Lovable CRM', 'Chrome', '120.0.0']
  });

  session.socket = socket;

  // Save credentials
  socket.ev.on('creds.update', saveCreds);

  // Connection updates
  socket.ev.on('connection.update', async (update) => {
    const { qr, connection, lastDisconnect } = update;

    if (qr) {
      session.qrCode = await QRCode.toDataURL(qr);
      console.log(`📱 QR Code generated for ${instanceName}`);
      
      await sendWebhook({
        event: 'qr.update',
        sessionId,
        instanceName,
        data: { qrCode: session.qrCode }
      });
    }

    if (connection === 'open') {
      session.isConnected = true;
      session.qrCode = null;
      
      const user = socket.user;
      if (user) {
        session.phoneNumber = user.id.split(':')[0].replace('@s.whatsapp.net', '');
        session.pushName = user.name || null;
      }
      
      console.log(`✅ ${instanceName} connected! Phone: ${session.phoneNumber}`);
      
      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: {
          connection: 'open',
          isConnected: true,
          phoneNumber: session.phoneNumber,
          pushName: session.pushName
        }
      });
    }

    if (connection === 'close') {
      session.isConnected = false;
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(`❌ ${instanceName} disconnected. Reconnect: ${shouldReconnect}`);
      
      await sendWebhook({
        event: 'connection.update',
        sessionId,
        instanceName,
        data: { connection: 'close', isConnected: false, statusCode }
      });

      if (shouldReconnect) {
        sessions.delete(sessionId);
        setTimeout(() => createSession(sessionId, instanceName, webhookSecret), 5000);
      } else {
        sessions.delete(sessionId);
      }
    }
  });

  // Incoming messages
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (msg.key.remoteJid === 'status@broadcast') continue;
      
      console.log(`📨 Message from ${msg.key.remoteJid}`);
      
      await sendWebhook({
        event: 'messages.upsert',
        sessionId,
        instanceName,
        data: {
          messages: [{
            key: msg.key,
            message: msg.message,
            messageTimestamp: msg.messageTimestamp,
            pushName: msg.pushName
          }]
        }
      });
    }
  });

  // Message status updates
  socket.ev.on('messages.update', async (updates) => {
    await sendWebhook({
      event: 'messages.update',
      sessionId,
      instanceName,
      data: { updates }
    });
  });

  return session;
}

// Get session
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

// Delete session
export async function deleteSession(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  try {
    if (session.socket) {
      await session.socket.logout();
    }
  } catch (e) {
    console.log('Logout error:', e);
  }
  
  // Delete session files
  const sessionPath = path.join(SESSIONS_DIR, session.instanceName);
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true });
  }
  
  sessions.delete(sessionId);
  return true;
}