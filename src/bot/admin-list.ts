/**
 * Admin listing & removal — /admins, /removeadmin, inline "O'chirish" (owner-only).
 * Ticket #12.
 */
import { InlineKeyboard } from "grammy";
import { getAdmin, isOwner, keys, kv } from "../kv.ts";
import type { Admin, AdminRole } from "../models.ts";
import { bot } from "./client.ts";

function roleLabel(role: AdminRole): string {
  return role === "owner" ? "owner" : "yordamchi";
}

// Builds the list text + (owner-only) removal keyboard. Reused by the /admins
// command and by the callback that edits the message after a removal.
async function buildAdminList(
  showButtons: boolean,
  callerId: number,
): Promise<{ text: string; reply_markup?: InlineKeyboard }> {
  const entries = await Array.fromAsync(kv.list<Admin>({ prefix: ["admins"] }));
  const admins = entries
    .map((e) => e.value)
    // owner(lar) ro'yxat boshida
    .sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner"));

  if (admins.length === 0) return { text: "Hozircha adminlar yo'q." };

  const lines = admins.map(
    (a, i) => `${i + 1}. ${a.name} — ${roleLabel(a.role)}`,
  );
  const text = "📋 Adminlar ro'yxati:\n\n" + lines.join("\n");

  if (showButtons) {
    const removable = admins.filter(
      (a) => a.role !== "owner" && a.telegramId !== callerId,
    );
    if (removable.length > 0) {
      const kb = new InlineKeyboard();
      for (const a of removable) {
        kb.text(`❌ ${a.name}`, `removeadmin:${a.telegramId}`).row();
      }
      return { text, reply_markup: kb };
    }
  }
  return { text };
}

// Shared removal guard + delete. Owner-only is enforced by the callers.
async function removeAdmin(
  callerId: number,
  targetId: number,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const target = await getAdmin(targetId);
  if (!target) return { ok: false, error: "Bunday admin topilmadi." };
  if (target.role === "owner") {
    return { ok: false, error: "Asosiy adminni (owner) o'chirib bo'lmaydi." };
  }
  if (targetId === callerId) {
    return { ok: false, error: "O'zingizni o'chira olmaysiz." };
  }
  await kv.delete(keys.admin(targetId));
  return { ok: true, name: target.name };
}

async function notifyRemoved(targetId: number): Promise<void> {
  try {
    await bot.api.sendMessage(
      targetId,
      "⚠️ Sizning adminlik huquqingiz bekor qilindi.",
    );
  } catch (e) {
    console.error("Failed to notify removed admin:", e);
  }
}

export function registerAdminList(): void {
  // /admins — hamma admin ko'ra oladi; owner uchun o'chirish tugmalari qo'shiladi.
  bot.command("admins", async (ctx: any) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    const { text, reply_markup } = await buildAdminList(
      await isOwner(userId),
      userId,
    );
    await ctx.reply(text, reply_markup ? { reply_markup } : undefined);
  });

  // Inline o'chirish tugmasi — faqat owner uchun.
  bot.callbackQuery(/^removeadmin:(.+)$/, async (ctx: any) => {
    const userId = ctx.from?.id;
    if (!userId || !(await isOwner(userId))) {
      await ctx.answerCallbackQuery({ text: "Faqat asosiy admin uchun" });
      return;
    }
    const targetId = Number(ctx.match[1]);
    if (!Number.isInteger(targetId)) {
      await ctx.answerCallbackQuery({ text: "Noto'g'ri ID" });
      return;
    }
    const res = await removeAdmin(userId, targetId);
    if (!res.ok) {
      await ctx.answerCallbackQuery({ text: res.error });
      return;
    }
    await ctx.answerCallbackQuery({ text: `🗑 ${res.name} o'chirildi` });
    // Xabarni yangilangan ro'yxat bilan qayta chizamiz (best-effort).
    try {
      const { text, reply_markup } = await buildAdminList(true, userId);
      await ctx.editMessageText(text, { reply_markup });
    } catch {
      // xabarni tahrirlab bo'lmadi — muhim emas
    }
    await notifyRemoved(targetId);
  });

  // /removeadmin <id> — inline tugma bilan bir xil mantiq, owner-only.
  bot.command("removeadmin", async (ctx: any) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    if (!(await isOwner(userId))) {
      await ctx.reply("Faqat asosiy admin (owner) adminni o'chira oladi.");
      return;
    }
    const arg = (ctx.match ?? "").trim();
    const targetId = Number(arg);
    if (!arg || !Number.isInteger(targetId) || targetId <= 0) {
      await ctx.reply(
        "Foydalanish: /removeadmin <telegram_id>\n\nMasalan: /removeadmin 123456789",
      );
      return;
    }
    const res = await removeAdmin(userId, targetId);
    if (!res.ok) {
      await ctx.reply("❌ " + res.error);
      return;
    }
    await ctx.reply(`✅ ${res.name} adminlikdan olib tashlandi.`);
    await notifyRemoved(targetId);
  });
}
