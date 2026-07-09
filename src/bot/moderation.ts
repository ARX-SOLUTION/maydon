/**
 * User moderation — block by forwarding a user's message to the bot, /blocked list
 * with unblock buttons. Owner-only. Ticket #13.
 */
import { InlineKeyboard } from "grammy";
import { getUser, isOwner, kv, upsertUser } from "../kv.ts";
import type { User } from "../models.ts";
import { bot } from "./client.ts";

export function registerModeration(): void {
  // Block-by-forward. Only intercepts when the owner forwards a message; every
  // other message (non-owner, or not a forward) falls through via next() so
  // onboarding and the rest of the pipeline still run.
  bot.on("message", async (ctx: any, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    if (!userId || !(await isOwner(userId))) return await next();

    const origin = ctx.message?.forward_origin;
    const isForward = !!(origin || ctx.message?.forward_from ||
      ctx.message?.forward_date);
    if (!isForward) return await next();

    const targetId = origin?.sender_user?.id ?? ctx.message?.forward_from?.id;
    if (!targetId) {
      await ctx.reply(
        "Bu foydalanuvchi profilini yashirgan, shuning uchun uni forward orqali bloklab bo'lmaydi. " +
          "Telegram ID orqali qo'lda bloklashingiz kerak.",
      );
      return;
    }

    const target = await getUser(targetId);
    if (!target) {
      await ctx.reply("Bu foydalanuvchi hali botdan foydalanmagan.");
      return;
    }

    if (target.isBlocked) {
      await ctx.reply(`${target.name} allaqachon bloklangan.`);
      return;
    }

    target.isBlocked = true;
    await upsertUser(target);
    await ctx.reply(`🚫 ${target.name} bloklandi. Endi u bron qila olmaydi.`);
  });

  // /blocked — owner-only list of blocked users, each with an unblock button.
  bot.command("blocked", async (ctx: any) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    if (!(await isOwner(userId))) {
      await ctx.reply("Faqat asosiy admin (owner) uchun.");
      return;
    }

    const keyboard = new InlineKeyboard();
    let count = 0;
    for await (const entry of kv.list<User>({ prefix: ["users"] })) {
      const u = entry.value;
      if (!u.isBlocked) continue;
      keyboard.text(`❌ ${u.name} — blokdan chiqarish`, `unblock:${u.telegramId}`)
        .row();
      count++;
    }

    if (count === 0) {
      await ctx.reply("Bloklangan foydalanuvchilar yo'q.");
      return;
    }
    await ctx.reply("🚫 Bloklangan foydalanuvchilar:", {
      reply_markup: keyboard,
    });
  });

  // Unblock button. Owner-only; filtered callback so it composes with decisions.ts.
  bot.callbackQuery(/^unblock:(.+)$/, async (ctx: any) => {
    if (!(await isOwner(ctx.from?.id))) {
      await ctx.answerCallbackQuery({ text: "Faqat owner uchun" });
      return;
    }

    const target = await getUser(Number(ctx.match[1]));
    if (!target) {
      await ctx.answerCallbackQuery({ text: "Foydalanuvchi topilmadi" });
      return;
    }

    target.isBlocked = false;
    await upsertUser(target);
    await ctx.answerCallbackQuery({ text: `✅ ${target.name} blokdan chiqarildi` });
    // Best-effort: drop the button so the list can't be double-clicked.
    try {
      await ctx.editMessageText(`✅ ${target.name} blokdan chiqarildi.`);
    } catch {
      // message may be too old to edit — the callback answer already confirmed it
    }
  });
}
