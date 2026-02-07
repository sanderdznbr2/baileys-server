import { Router } from "express";
import { instances } from "../whatsapp";

const router = Router();

router.post("/send", async (req, res) => {
  const { instanceId, to, message } = req.body;

  const instance = instances[instanceId];
  if (!instance) {
    return res.status(404).json({ error: "Instance not found" });
  }

  await instance.sock.sendMessage(`${to}@s.whatsapp.net`, { text: message });

  res.json({ success: true });
});

export default router;
