/**
 * Onboarding: /start → share phone (contact) → send name (text) → isActive.
 * Also owns the mini-app entry keyboard shown to onboarded users.
 */
import { InlineKeyboard, Keyboard } from "grammy";
import { getAdmin, getUser, upsertUser } from "../kv.ts";
import type { User } from "../models.ts";
import { bot } from "./client.ts";

export function miniAppKeyboard(isAdmin = false): InlineKeyboard {
  const base = Deno.env.get("MINI_APP_URL") ?? "https://maydon.uz";
  const keyboard = new InlineKeyboard().url("📅 Band qilish", base);
  if (isAdmin) {
    keyboard.row().url("🛠 Boshqaruv paneli", `${base}/app/admin/requests`);
  }
  return keyboard;
}

// Ask for whatever onboarding step the user is currently on.
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

export function registerOnboarding(): void {
  // /start command
  bot.command("start", async (ctx: any, next: () => Promise<void>) => {
    // Deep-link payloads (e.g. /start admin_<token> invites) are handled by other
    // modules; plain /start runs onboarding. No payloads exist until ticket #11.
    if ((ctx.match ?? "").trim()) return await next();

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

    // Regular (non-admin) users must finish onboarding before they can book.
    if (!isAdmin && !user.isActive) {
      await sendOnboardingPrompt(ctx, user);
      return;
    }

    const welcomeText =
      `Assalomu alaykum, ${user.name}! 👋\n\n` +
      `Bu Maydon Booking boti.\n` +
      `Futbol maydonini band qilish uchun Mini App'dan foydalaning.\n\n` +
      (isAdmin ? "✅ Siz adminsiz." : "");

    await ctx.reply(welcomeText, { reply_markup: miniAppKeyboard(isAdmin) });
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

  // Text handler — step 2 of onboarding (full name), then activates the account.
  // Calls next() when it doesn't consume the message so command handlers in other
  // modules still run regardless of registration order.
  bot.on("message:text", async (ctx: any, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    const text = ctx.message?.text?.trim();
    if (!userId || !text || text.startsWith("/")) return await next();

    const user = await getUser(userId);
    if (!user || user.isActive || user.onboardingStep !== "name") {
      return await next();
    }

    user.name = text;
    user.isActive = true;
    user.onboardingStep = undefined;
    await upsertUser(user);

    await ctx.reply(
      `✅ Ro'yxatdan o'tish yakunlandi, ${user.name}!\n\nEndi maydonni band qilishingiz mumkin.`,
      { reply_markup: miniAppKeyboard() },
    );
  });
}
