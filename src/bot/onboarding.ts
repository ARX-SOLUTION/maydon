/**
 * Onboarding: /start → share phone (contact) → send name (text) → isActive.
 * Also owns the mini-app entry keyboard shown to onboarded users.
 */
import { InlineKeyboard, Keyboard } from "grammy";
import { getAdmin, getUser, kv, upsertUser, userApprovalStatus } from "../kv.ts";
import type { User } from "../models.ts";
import { bot, botContext } from "./client.ts";
import { notifyNewUserApproval } from "../services/notify.ts";

// Local (module-owned) edit state for /profil name changes. Phone edits reuse the
// existing contact-share flow, so only the name needs a pending-edit marker.
// ponytail: a tiny KV key beats adding a field to the shared User model.
const profileEditKey = (id: number) => ["profil_edit", id] as const;

// Onboarding/profile name rule: 2–60 chars after trimming. Returns an Uzbek
// error string to re-prompt with, or null when the name is acceptable.
function nameError(name: string): string | null {
  const len = name.trim().length;
  if (len < 2) {
    return "Ism juda qisqa. Iltimos, to'liq ismingizni yozing (kamida 2 ta belgi):";
  }
  if (len > 60) {
    return "Ism juda uzun (60 belgidan oshmasligi kerak). Iltimos, qaytadan yuboring:";
  }
  return null;
}

export function miniAppKeyboard(isAdmin = false): InlineKeyboard {
  // web_app buttons open the Mini App inside Telegram (not an external browser);
  // available in private chats, which is where the bot DMs users.
  const base = (Deno.env.get("MINI_APP_URL") ?? "https://maydon.uz").replace(
    /\/$/,
    "",
  );
  const keyboard = new InlineKeyboard().webApp(
    "📅 Band qilish",
    `${base}/app/user/week`,
  );
  if (isAdmin) {
    keyboard.row().webApp("🛠 Boshqaruv paneli", `${base}/app/admin/requests`);
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

async function notifyAdminsNewUser(user: User): Promise<void> {
  for await (const entry of kv.list({ prefix: ["admins"] })) {
    const adminId = entry.key[1];
    if (typeof adminId === "number") {
      await notifyNewUserApproval(botContext, adminId, user);
    }
  }
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
        approvalStatus: "pending",
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

    if (!isAdmin && user.isActive && userApprovalStatus(user) === "pending") {
      await ctx.reply(
        "✅ Ma'lumotlaringiz qabul qilindi.\n\nAdmin tasdiqlashini kuting. Tasdiqlangandan keyin maydonni band qilishingiz mumkin.",
      );
      return;
    }
    if (!isAdmin && user.isActive && userApprovalStatus(user) === "rejected") {
      await ctx.reply(
        `❌ Ro'yxatdan o'tishingiz rad etilgan.\nAdmin: ${user.approvalDecidedByName ?? "Noma'lum"}`,
      );
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

    const rawPhone = contact.phone_number.trim();
    user.phone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;

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
    if (!user) return await next();

    // /profil name-edit flow (active users route through here, not onboarding).
    const editing = (await kv.get<string>(profileEditKey(userId))).value;
    if (editing === "name") {
      const err = nameError(text);
      if (err) {
        await ctx.reply(err); // keep the edit state — try again
        return;
      }
      user.name = text;
      await upsertUser(user);
      await kv.delete(profileEditKey(userId));
      await ctx.reply(`✅ Ism yangilandi: ${user.name}`);
      return;
    }

    // Onboarding step 2: the full name.
    if (user.isActive || user.onboardingStep !== "name") return await next();

    const err = nameError(text);
    if (err) {
      await ctx.reply(err); // invalid → re-prompt, DO NOT change state
      return;
    }

    user.name = text;
    user.isActive = true;
    user.approvalStatus = "pending";
    user.approvalDecidedBy = undefined;
    user.approvalDecidedByName = undefined;
    user.approvalDecidedAt = undefined;
    user.onboardingStep = undefined;
    await upsertUser(user);

    await notifyAdminsNewUser(user);

    await ctx.reply(
      `✅ Ro'yxatdan o'tish yakunlandi, ${user.name}!\n\nMa'lumotlaringiz adminga yuborildi. Admin tasdiqlashini kuting.`,
      { reply_markup: { remove_keyboard: true } },
    );
  });

  // Non-text message while we're waiting for the name (photo/sticker/voice/…, but
  // NOT contact — that has its own handler). Politely re-prompt and consume it.
  // Calls next() whenever it doesn't apply so other modules' handlers still run.
  bot.on("message", async (ctx: any, next: () => Promise<void>) => {
    const msg = ctx.message;
    if (msg?.text !== undefined || msg?.contact !== undefined) {
      return await next();
    }

    const userId = ctx.from?.id;
    if (!userId) return await next();

    const user = await getUser(userId);
    if (!user || user.isActive || user.onboardingStep !== "name") {
      return await next();
    }

    await ctx.reply("Iltimos, ismingizni MATN ko'rinishida yuboring 🙏");
    // consume — the name step stays put until a valid text arrives
  });

  // /profil — show current name + phone with inline edit buttons.
  bot.command("profil", async (ctx: any, next: () => Promise<void>) => {
    const userId = ctx.from?.id;
    if (!userId) return await next();

    const user = await getUser(userId);
    if (!user) {
      await ctx.reply("Sizni topa olmadim. Iltimos, avval /start bosing.");
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("✏️ Ismni o'zgartirish", "profil:name")
      .row()
      .text("📞 Telefonni o'zgartirish", "profil:phone");

    await ctx.reply(
      `👤 Profilingiz:\n\n` +
        `Ism: ${user.name ?? "—"}\n` +
        `Telefon: ${user.phone ?? "—"}`,
      { reply_markup: keyboard },
    );
  });

  // "Ismni o'zgartirish" → mark a pending name edit; the text handler finishes it.
  bot.callbackQuery("profil:name", async (ctx: any) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await kv.set(profileEditKey(userId), "name");
    await ctx.answerCallbackQuery();
    await ctx.reply("Yangi ismingizni yozib yuboring:");
  });

  // "Telefonni o'zgartirish" → reuse the contact-share; the contact handler saves it.
  bot.callbackQuery("profil:phone", async (ctx: any) => {
    const userId = ctx.from?.id;
    if (!userId) return;
    await ctx.answerCallbackQuery();
    const keyboard = new Keyboard()
      .requestContact("📞 Telefon raqamni yuborish")
      .resized()
      .oneTime();
    await ctx.reply("Yangi telefon raqamingizni yuboring:", {
      reply_markup: keyboard,
    });
  });
}

// ponytail: smallest guard on the name rule (acceptance-criteria core). Runs only
// when this file is executed directly, never on import by the bot.
if (import.meta.main) {
  console.assert(nameError("A") !== null, "1 char must fail");
  console.assert(nameError("Al") === null, "2 chars must pass");
  console.assert(nameError("  Al  ") === null, "trim then pass");
  console.assert(nameError("x".repeat(60)) === null, "60 chars must pass");
  console.assert(nameError("x".repeat(61)) !== null, "61 chars must fail");
  console.log("onboarding nameError self-check ok");
}
