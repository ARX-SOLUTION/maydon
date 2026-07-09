/**
 * Bot command menu (setMyCommands, scoped user vs admin), /help, /cancel.
 * Ticket #15 — the final command set from #10/#11/#12/#13 is reflected here.
 */
import { getBookingsByUser, kv } from "../kv.ts";
import { cancelBooking } from "../services/booking.ts";
import type { Admin, Booking } from "../models.ts";
import { bot } from "./client.ts";

const HELP_TEXT = "ℹ️ *Maydon Booking* — qanday ishlaydi:\n\n" +
  "1. /start bosing va ro'yxatdan o'ting (telefon + ism).\n" +
  "2. Mini App'da bo'sh (yashil) vaqtni tanlab so'rov yuboring.\n" +
  "3. Admin tasdiqlaydi — sizga xabar keladi, joyingiz band bo'ladi.\n\n" +
  "/profil — ma'lumotlaringizni ko'rish/o'zgartirish\n" +
  "/cancel — kutilayotgan so'rovni bekor qilish";

const userCommands = [
  { command: "start", description: "Boshlash / ro'yxatdan o'tish" },
  { command: "help", description: "Yordam" },
  { command: "profil", description: "Ma'lumotlarim" },
  { command: "cancel", description: "So'rovni bekor qilish" },
];

const adminCommands = [
  ...userCommands,
  { command: "admins", description: "Adminlar ro'yxati" },
  { command: "invite", description: "Admin taklif qilish (owner)" },
  { command: "removeadmin", description: "Adminni o'chirish (owner)" },
  { command: "blocked", description: "Bloklangan foydalanuvchilar (owner)" },
];

// Default menu for everyone; the richer admin menu is scoped per admin chat so
// ordinary users never see management commands. New admins pick it up next boot.
async function initCommandMenu(): Promise<void> {
  await bot.api.setMyCommands(userCommands);
  for await (const entry of kv.list<Admin>({ prefix: ["admins"] })) {
    await bot.api
      .setMyCommands(adminCommands, {
        scope: { type: "chat", chat_id: entry.value.telegramId },
      })
      .catch(() => {}); // admin may not have an open chat yet — ignore
  }
}

export function registerCommands(): void {
  bot.command("help", async (ctx: any) => {
    await ctx.reply(HELP_TEXT, { parse_mode: "Markdown" });
  });

  bot.command("cancel", async (ctx: any) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const pending = (await getBookingsByUser(userId)).filter(
      (b: Booking) => b.status === "pending",
    );
    if (pending.length === 0) {
      await ctx.reply("Sizda kutilayotgan so'rov yo'q.");
      return;
    }
    for (const b of pending) await cancelBooking(b.id);
    await ctx.reply(
      `✅ ${pending.length} ta kutilayotgan so'rovingiz bekor qilindi.`,
    );
  });

  // Fire-and-forget: the menu is cosmetic; command handlers work regardless.
  initCommandMenu().catch((e) => console.error("setMyCommands failed:", e));
}
