/**
 * Telegram Bot — grammY handlers
 */

import { Bot, InlineKeyboard, Keyboard } from "grammy";
import {
  getAdmin,
  getPendingRequests,
  getUser,
  keys,
  kv,
  upsertUser,
} from "../kv.ts";
import {
  cancelBooking,
  confirmBooking,
  rejectBooking,
} from "../services/booking.ts";
import {
  notifyNewRequest,
  notifyUserConfirmed,
  notifyUserQueued,
  notifyUserRejected,
} from "../services/notify.ts";
import type { Booking, User } from "../models.ts";

const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN not set");
}

export const bot = new Bot(botToken);

// Mock bot context for API notifications
const botContext = {
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

function miniAppKeyboard(): InlineKeyboard {
  return new InlineKeyboard().url(
    "📅 Band qilish",
    Deno.env.get("MINI_APP_URL") ?? "https://maydon.uz",
  );
}

// Ask for whatever onboarding step the user is currently on
async function sendOnboardingPrompt(ctx: any, user: User): Promise<void> {
  if (user.onboardingStep === "name") {
    await ctx.reply(
      "Endi to'liq ismingizni yozib yuboring (masalan: Ali Valiyev):",
      { reply_markup: { remove_keyboard: true } },
    );
    return;
  }

  const keyboard = new Keyboard()
    .requestContact("📞 Telefon raqamni yuborish")
    .resized()
    .oneTime();

  await ctx.reply(
    `Assalomu alaykum, ${user.name}! 👋\n\n` +
      `Bu Maydon Booking boti — futbol maydonini band qilish uchun.\n\n` +
      `Ro'yxatdan o'tish uchun pastdagi tugma orqali telefon raqamingizni yuboring:`,
    { reply_markup: keyboard },
  );
}

// /start command
bot.command("start", async (ctx: any) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  let user = await getUser(userId);
  if (!user) {
    user = {
      telegramId: userId,
      name: ctx.from?.first_name ?? "Unknown",
      username: ctx.from?.username,
      isBlocked: false,
      isActive: false,
      onboardingStep: "phone",
      createdAt: new Date().toISOString(),
    };
    await upsertUser(user);
  }

  const isAdmin = !!(await getAdmin(userId));

  // Regular (non-admin) users must finish onboarding before they can book
  if (!isAdmin && !user.isActive) {
    await sendOnboardingPrompt(ctx, user);
    return;
  }

  const welcomeText =
    `Assalomu alaykum, ${user.name}! 👋\n\n` +
    `Bu Maydon Booking boti.\n` +
    `Futbol maydonini band qilish uchun Mini App'dan foydalaning.\n\n` +
    (isAdmin ? "✅ Siz adminsiz." : "");

  await ctx.reply(welcomeText, { reply_markup: miniAppKeyboard() });
});

// Contact handler — step 1 of onboarding (or a phone update for existing users)
bot.on("message:contact", async (ctx: any) => {
  const userId = ctx.from?.id;
  const contact = ctx.message?.contact;

  if (!userId || !contact) return;

  const user = await getUser(userId);
  if (!user) return;

  user.phone = contact.phone_number;

  if (!user.isActive) {
    user.onboardingStep = "name";
    await upsertUser(user);
    await ctx.reply(
      "✅ Raqam qabul qilindi!\n\nEndi to'liq ismingizni yozib yuboring (masalan: Ali Valiyev):",
      { reply_markup: { remove_keyboard: true } },
    );
    return;
  }

  await upsertUser(user);
  await ctx.reply("✅ Raqamingiz yangilandi!", {
    reply_markup: { remove_keyboard: true },
  });
});

// Text handler — step 2 of onboarding (full name), then activates the account
bot.on("message:text", async (ctx: any) => {
  const userId = ctx.from?.id;
  const text = ctx.message?.text?.trim();
  if (!userId || !text || text.startsWith("/")) return;

  const user = await getUser(userId);
  if (!user || user.isActive || user.onboardingStep !== "name") return;

  user.name = text;
  user.isActive = true;
  user.onboardingStep = undefined;
  await upsertUser(user);

  await ctx.reply(
    `✅ Ro'yxatdan o'tish yakunlandi, ${user.name}!\n\nEndi maydonni band qilishingiz mumkin.`,
    { reply_markup: miniAppKeyboard() },
  );
});

// Callback query handler for inline buttons
bot.on("callback_query:data", async (ctx: any) => {
  const data = ctx.callbackQuery?.data;
  if (!data || typeof data !== "string") return;

  const [action, bookingId] = data.split(":");
  const userId = ctx.from?.id;

  // Check admin
  const isAdmin = !!(await getAdmin(userId!));
  if (!isAdmin) {
    await ctx.answerCallbackQuery({ text: "Faqat adminlar uchun" });
    return;
  }

  switch (action) {
    case "confirm":
      const confirmResult = await confirmBooking(bookingId);
      if (confirmResult.success) {
        await ctx.answerCallbackQuery({ text: "✅ Tasdiqlandi" });
        // TODO: Update message
      } else {
        await ctx.answerCallbackQuery({
          text: "❌ Xato: " + confirmResult.error,
        });
      }
      break;

    case "reject":
      await rejectBooking(bookingId);
      await ctx.answerCallbackQuery({ text: "❌ Rad etildi" });
      // TODO: Update message
      break;

    case "cancel":
      await cancelBooking(bookingId);
      await ctx.answerCallbackQuery({ text: "⚠️ Bekor qilindi" });
      break;

    default:
      await ctx.answerCallbackQuery({ text: "Noma'lum buyruq" });
  }
});

// Notify admins about new booking (called from API)
export async function notifyAdminsNewRequest(booking: Booking): Promise<void> {
  const user = booking.userId ? await getUser(booking.userId) : null;
  if (!user) return;

  const pending = await getPendingRequests();
  const queuePosition =
    pending.findIndex((b: Booking) => b.id === booking.id) + 1;

  // Get all admins
  const admins = await Array.fromAsync(kv.list({ prefix: ["admins"] }));

  for (const entry of admins) {
    const adminId = (entry as any).key[1] as number;
    await notifyNewRequest(botContext, adminId, booking, user, queuePosition);
  }

  // Notify user
  await notifyUserQueued(botContext, user.telegramId, booking, queuePosition);
}

// Notify user about confirmation
export async function notifyUserConfirmation(booking: Booking): Promise<void> {
  if (!booking.userId) return;
  await notifyUserConfirmed(botContext, booking.userId, booking);
}

// Notify user about rejection
export async function notifyUserRejection(
  booking: Booking,
  reason: string,
  alternativeSlots?: Array<{ start: string; end: string }>,
): Promise<void> {
  if (!booking.userId) return;
  await notifyUserRejected(
    botContext,
    booking.userId,
    booking,
    reason,
    alternativeSlots,
  );
}
