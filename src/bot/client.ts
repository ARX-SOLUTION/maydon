/**
 * Shared bot client + a thin send/edit context for service-layer notifications.
 * Every bot module registers its handlers on this single `bot` instance.
 */
import { Bot } from "grammy";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN not set");
}

export const bot = new Bot(botToken);

// Minimal context passed to notify.ts service functions (which stay grammY-agnostic).
export const botContext = {
  sendMessage: async (chatId: number, text: string, options?: any) => {
    try {
      await bot.api.sendMessage(chatId, text, options);
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  },
  editMessageText: async (chatId: number, messageId: number, text: string) => {
    try {
      await bot.api.editMessageText(chatId, messageId, text);
    } catch (e) {
      console.error("Failed to edit message:", e);
    }
  },
};
