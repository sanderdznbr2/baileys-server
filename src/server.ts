import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createSession, getSession, deleteSession, sessions } from './whatsapp';
import { sendTextMessage } from './routes/message';

dotenv.config();

const VERSION = "v1.0.0";
const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  console.log(`[${VERSION}] Health check requested`);
  res.json({ 
    status: 'ok', 
    version: VERSION,
    sessions: sessions.size,
    timestamp: new Date().toISOString()
  });
});

// Create instance
app.post('/api/instance/create', async (req, res) => {
  try {
    const { sessionId, instanceName, webhookSecret } = req.body;
    
    if (!sessionId || !instanceName) {
      return res.status(400).json({ error: 'sessionId and instanceName required' });
    }

    console.log(`[${VERSION}] Creating instance: ${instanceName}`);
    const session = await createSession(sessionId, instanceName, webhookSecret || '');
    
    res.json({
      success: true,
      version: VERSION,
      sessionId: session.sessionId,
      instanceName: session.instanceName,
      isConnected: session.isConnected
    });
  } catch (error: any) {
    console.error('Create instance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get QR Code
app.get('/api/instance/:sessionId/qr', (req, res) => {
  const session = getSession(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json({
    qrCode: session.qrCode,
    isConnected: session.isConnected,
    phoneNumber: session.phoneNumber,
    pushName: session.pushName
  });
});

// Get status
app.get('/api/instance/:sessionId/status', (req, res) => {
  const session = getSession(req.params.sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found', status: 'not_found' });
  }
  
  res.json({
    status: session.isConnected ? 'connected' : (session.qrCode ? 'waiting_qr' : 'connecting'),
    isConnected: session.isConnected,
    phoneNumber: session.phoneNumber,
    pushName: session.pushName
  });
});

// List sessions
app.get('/api/instance/list', (req, res) => {
  const list: any[] = [];
  for (const [id, session] of sessions) {
    list.push({
      sessionId: id,
      instanceName: session.instanceName,
      isConnected: session.isConnected,
      phoneNumber: session.phoneNumber
    });
  }
  res.json({ sessions: list });
});

// Delete session
app.delete('/api/instance/:sessionId', async (req, res) => {
  const success = await deleteSession(req.params.sessionId);
  if (!success) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ success: true });
});

// Send text message
app.post('/api/message/send-text', async (req, res) => {
  try {
    const { sessionId, phone, message } = req.body;
    const result = await sendTextMessage(sessionId, phone, message);
    res.json(result);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`🚀 [${VERSION}] Baileys Server running on port ${PORT}`);
  console.log(`📡 Webhook URL: ${process.env.SUPABASE_WEBHOOK_URL || 'Not configured'}`);
});