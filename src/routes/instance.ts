import { Router } from "express";
import { createInstance, instances } from "../whatsapp";

const router = Router();

router.post("/connect", async (req, res) => {
  const { instanceId } = req.body;

  if (!instanceId) {
    return res.status(400).json({ error: "instanceId is required" });
  }

  if (!instances[instanceId]) {
    await createInstance(instanceId);
  }

  res.json({ status: "starting", instanceId });
});

router.get("/qr/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  const instance = instances[instanceId];

  if (!instance || !instance.qr) {
    return res.status(404).json({ error: "QR not ready" });
  }

  res.json({ qr: instance.qr });
});

export default router;
