import { Router } from "express";
import { indexService } from "../services/index.service";

const router = Router();

router.get("/health/extended", (_req, res) => {
  const stats = indexService.getStats();
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    index: stats,
  });
});

export default router;
