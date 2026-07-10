/**
 * Admin designation via one-time deep-link invite (ticket #11).
 * Owner runs /invite → gets a t.me/...?start=admin_<token> link. Whoever opens it
 * becomes a helper admin; the token is single-use.
 */
import { addAdmin, getAdmin, isOwner, keys, kv } from "../kv.ts";
import { bot } from "./client.ts";

interface InviteToken {
  createdBy: number;
  createdAt: string; // ISO
}

export function registerAdminInvite(): void {
  // /invite — owner generates a one-time invite link
  bot.command("invite", async (ctx: any) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!(await isOwner(userId))) {
      await ctx.reply("Faqat owner taklif qila oladi.");
      return;
    }

    const token = crypto.randomUUID();
    const record: InviteToken = {
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
    await kv.set(keys.adminInviteToken(token), record);

    const link = `https://t.me/${ctx.me.username}?start=admin_${token}`;
    await ctx.reply(
      `🔗 Yordamchi admin taklif havolasi (bir martalik):\n\n${link}\n\n` +
        "Havolani yubormoqchi bo'lgan odamingizga bering. U ochgach admin bo'ladi.",
    );
  });

  // /start admin_<token> — consume an invite and promote the caller. Onboarding's
  // /start handler delegates payloads to us via next(), and we're registered after it.
  bot.command("start", async (ctx: any, next: () => Promise<void>) => {
    const payload = (ctx.match ?? "").trim();
    if (!payload.startsWith("admin_")) return await next();

    const userId = ctx.from?.id;
    if (!userId) return;

    const token = payload.slice("admin_".length);
    const res = await kv.get<InviteToken>(keys.adminInviteToken(token));
    if (!res.value) {
      await ctx.reply("Bu taklif havolasi yaroqsiz yoki ishlatilgan.");
      return;
    }

    // Consume the token first — one-time regardless of outcome.
    await kv.delete(keys.adminInviteToken(token));

    if (await getAdmin(userId)) {
      await ctx.reply("Siz allaqachon adminsiz.");
      return;
    }

    await addAdmin({
      telegramId: userId,
      name: ctx.from?.first_name ?? "Unknown",
      role: "admin",
      addedAt: new Date().toISOString(),
    });

    await ctx.reply(
      "✅ Tabriklaymiz! Siz yordamchi admin bo'ldingiz. Mini App orqali boshqaruv panelidan foydalanishingiz mumkin.",
    );
  });
}
