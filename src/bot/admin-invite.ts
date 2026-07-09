/**
 * Admin designation — how someone becomes a helper admin.
 * Currently /addadmin <id>; ticket #11 replaces this with a one-time deep-link invite.
 */
import { addAdmin, getAdmin, getUser, isOwner } from "../kv.ts";
import { bot } from "./client.ts";

export function registerAdminInvite(): void {
  // /addadmin <telegram_id> — owner promotes someone to a helper admin
  bot.command("addadmin", async (ctx: any) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!(await isOwner(userId))) {
      await ctx.reply("Faqat asosiy admin (owner) admin qo'sha oladi.");
      return;
    }

    const arg = (ctx.match ?? "").trim();
    const targetId = Number(arg);
    if (!arg || !Number.isInteger(targetId) || targetId <= 0) {
      await ctx.reply(
        "Foydalanish: /addadmin <telegram_id>\n\nMasalan: /addadmin 123456789",
      );
      return;
    }

    const targetUser = await getUser(targetId);
    if (!targetUser) {
      await ctx.reply(
        "Bu foydalanuvchi hali botdan foydalanmagan. Avval u botga /start bosishi kerak.",
      );
      return;
    }

    if (await getAdmin(targetId)) {
      await ctx.reply(`${targetUser.name} allaqachon admin.`);
      return;
    }

    await addAdmin({
      telegramId: targetId,
      name: targetUser.name,
      role: "admin",
      addedAt: new Date().toISOString(),
    });

    await ctx.reply(`✅ ${targetUser.name} endi admin!`);

    try {
      await bot.api.sendMessage(
        targetId,
        "✅ Siz admin etib tayinlandingiz! Mini App orqali boshqaruv panelidan foydalanishingiz mumkin.",
      );
    } catch (e) {
      console.error("Failed to notify new admin:", e);
    }
  });
}
