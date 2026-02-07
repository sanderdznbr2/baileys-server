import { getSession } from '../whatsapp';

export async function sendTextMessage(
  sessionId: string, 
  phone: string, 
  message: string
): Promise<{ success: boolean; to: string }> {
  const session = getSession(sessionId);
  
  if (!session || !session.socket || !session.isConnected) {
    throw new Error('Session not connected');
  }

  // Format phone number
  let jid = phone.replace(/\D/g, '');
  if (!jid.includes('@')) {
    jid = jid + '@s.whatsapp.net';
  }

  await session.socket.sendMessage(jid, { text: message });
  
  return { success: true, to: jid };
}