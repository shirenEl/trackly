
import { database } from "../config/database.js";
import { sendTelegramMessage } from "./telegramservice.js";
import { sendWhatsAppMessage } from "./whatsappservice.js";

export async function notifyUser(
  userId: number,
  message: string
): Promise<void> {
  const [rows] = await database.execute(
    `SELECT platform, platform_user_id
     FROM chat_accounts
     WHERE user_id = ?`,
    [userId]
  );

  const accounts = rows as {
    platform: "telegram" | "whatsapp";
    platform_user_id: string;
  }[];

  for (const account of accounts) {
    if (account.platform === "telegram") {
      await sendTelegramMessage(account.platform_user_id, message);
    } else if (account.platform === "whatsapp") {
      await sendWhatsAppMessage(account.platform_user_id, message);
    }
  }
}
