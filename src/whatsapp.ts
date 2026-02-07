import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { InstanceMap } from "./types";
import axios from "axios";

export const instances: InstanceMap = {};

export async function createInstance(instanceId: string) {
  const { state, saveCreds } = await useMultiFileAuthState(`sessions/${instanceId}`);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      instances[instanceId].qr = qr;
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        createInstance(instanceId);
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    if (process.env.SUPABASE_WEBHOOK_URL) {
      await axios.post(process.env.SUPABASE_WEBHOOK_URL, msg).catch(() => {});
    }
  });

  instances[instanceId] = { sock, qr: null };
}
