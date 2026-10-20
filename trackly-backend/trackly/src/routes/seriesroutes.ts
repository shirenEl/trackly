import { Router } from "express";

const router = Router();

// GET /api/series
router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Series API berhasil terhubung",
    data: [],
  });
});

export default router;
