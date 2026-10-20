
import { Router } from "express";
import { testNotification } from "../controllers/bot.controller.js";
import { authenticateToken } from "../middleware/authmiddleware.js";

const router = Router();

router.post("/test", authenticateToken, testNotification);

export default router;

export async function testNotification(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = Number((req as any).user?.id);
    const { message } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Silakan login terlebih dahulu."
      });
      return;
    }

    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({
        success: false,
        message: "Pesan tidak boleh kosong."
      });
      return;
    }

    await notifyUser(userId, message.trim());

    res.status(200).json({
      success: true,
      message: "Notifikasi berhasil diproses."
    });
  } catch (error) {
    console.error("Bot notification error:", error);

    res.status(500).json({
      success: false,
      message: "Gagal mengirim notifikasi."
    });
  }
}
