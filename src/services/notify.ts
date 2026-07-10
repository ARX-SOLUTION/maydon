/**
 * Notification Service — Bot messages
 */

import type { Booking, User } from "../models.ts";

// Escape user-controlled text so a name/phone containing Markdown metacharacters
// can't break parse_mode:"Markdown" (which would 400 and silently drop the message).
function escapeMd(s: string): string {
  return s.replace(/[_*`\[]/g, "\\$&");
}

interface BotContext {
  sendMessage: (chatId: number, text: string, options?: any) => Promise<void>;
  editMessageText: (
    chatId: number,
    messageId: number,
    text: string,
  ) => Promise<void>;
}

export async function notifyNewRequest(
  bot: BotContext,
  adminChatId: number,
  booking: Booking,
  user: User,
  queuePosition: number,
): Promise<void> {
  const text =
    `🆕 **Yangi so'rov**\n\n` +
    `👤 ${escapeMd(user.name)}\n` +
    `📞 ${escapeMd(user.phone ?? "N/A")}\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n` +
    `🔢 Navbat: #${queuePosition}\n\n` +
    `[Yozish](tg://user?id=${user.telegramId})`;

  await bot.sendMessage(adminChatId, text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Tasdiqlash", callback_data: `confirm:${booking.id}` },
        { text: "❌ Rad etish", callback_data: `reject:${booking.id}` },
      ]],
    },
  });
}

export async function notifyNewUserApproval(
  bot: BotContext,
  adminChatId: number,
  user: User,
): Promise<void> {
  const text =
    `👤 Yangi foydalanuvchi ro'yxatdan o'tdi\n\n` +
    `Ism: ${user.name || "Noma'lum"}\n` +
    `Telefon: ${user.phone || "Noma'lum"}\n\n` +
    "Iltimos, foydalanuvchini tasdiqlang yoki rad eting.";
  await bot.sendMessage(adminChatId, text, {
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Tasdiqlash", callback_data: `approve_user:${user.telegramId}` },
        { text: "❌ Rad etish", callback_data: `reject_user:${user.telegramId}` },
      ]],
    },
  });
}

export async function notifyUserApprovalDecision(
  bot: BotContext,
  user: User,
): Promise<void> {
  if (!user.approvalStatus || !user.approvalDecidedByName) return;
  const approved = user.approvalStatus === "approved";
  const text = approved
    ? `✅ Ro'yxatdan o'tishingiz tasdiqlandi.\n\nAdmin: ${user.approvalDecidedByName}\nEndi maydonni band qilishingiz mumkin.`
    : `❌ Ro'yxatdan o'tishingiz rad etildi.\n\nAdmin: ${user.approvalDecidedByName}\nQo'shimcha ma'lumot uchun administrator bilan bog'laning.`;
  await bot.sendMessage(user.telegramId, text);
}

export async function notifyUserQueued(
  bot: BotContext,
  userId: number,
  booking: Booking,
  queuePosition: number,
): Promise<void> {
  const text =
    `✅ So'rovingiz qabul qilindi!\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n` +
    `🔢 Siz navbatda #${queuePosition}\n\n` +
    `Admin tasdiqlashini kuting.`;

  await bot.sendMessage(userId, text);
}

export async function notifyUserConfirmed(
  bot: BotContext,
  userId: number,
  booking: Booking,
): Promise<void> {
  const text =
    `✅ **Tasdiqlandi!**\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    `Kelishingizni kutamiz!`;

  await bot.sendMessage(userId, text, { parse_mode: "Markdown" });
}

export async function notifyUserRejected(
  bot: BotContext,
  userId: number,
  booking: Booking,
  reason: string,
  alternativeSlots?: Array<{ start: string; end: string }>,
): Promise<void> {
  let text =
    `❌ **Rad etildi**\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    `Sabab: ${reason}`;

  if (alternativeSlots && alternativeSlots.length > 0) {
    text += `\n\n**Shu kundagi bo'sh vaqtlar:**\n`;
    for (const slot of alternativeSlots.slice(0, 5)) {
      text += `• ${slot.start} - ${slot.end}\n`;
    }
    text += `\nBoshqa vaqtga qayta so'rov yuborishingiz mumkin.`;
  } else {
    text += `\n\nAfsuski, bu kun uchun hozircha bo'sh vaqt yo'q. Boshqa kunni tanlab ko'ring.`;
  }

  await bot.sendMessage(userId, text, { parse_mode: "Markdown" });
}

export async function notifyUserExpired(
  bot: BotContext,
  userId: number,
  booking: Booking,
): Promise<void> {
  const text =
    `⏰ **Muddati o'tdi**\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    `Admin javob bermadi. Qayta so'rov yuborishingiz mumkin.`;

  await bot.sendMessage(userId, text);
}

export async function notifySlotAvailable(
  bot: BotContext,
  adminChatId: number,
  booking: Booking,
  pendingCount: number,
): Promise<void> {
  const text =
    `🔓 **Slot bo'shadi!**\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    `Navbatda ${pendingCount} ta so'rov bor.`;

  await bot.sendMessage(adminChatId, text);
}

export async function notifyUserCancelled(
  bot: BotContext,
  userId: number,
  booking: Booking,
): Promise<void> {
  const text =
    `⚠️ **Broningiz bekor qilindi**\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    `Ushbu o'yin vaqti admin tomonidan bekor qilindi.`;

  await bot.sendMessage(userId, text, { parse_mode: "Markdown" });
}
