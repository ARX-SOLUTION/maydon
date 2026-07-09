/**
 * Request decisions — the admin confirm/reject/cancel flow and the notifications
 * that surround a booking request. Ticket #9 adds message-editing on decision;
 * ticket #14 adds alternative slots on reject.
 */
import {
  getAdmin,
  getBooking,
  getPendingRequests,
  getSettings,
  getUser,
  kv,
} from "../kv.ts";
import {
  cancelBooking,
  confirmBooking,
  rejectBooking,
} from "../services/booking.ts";
import {
  findFreeRanges,
  getDayAvailability,
} from "../services/availability.ts";
import {
  notifyNewRequest,
  notifyUserCancelled,
  notifyUserConfirmed,
  notifyUserQueued,
  notifyUserRejected,
} from "../services/notify.ts";
import type { Booking } from "../models.ts";
import { bot, botContext } from "./client.ts";

// Guard: only admins may act on request-decision callbacks. Returns false (and
// answers the callback) for non-admins so the handler can bail early.
async function ensureAdmin(ctx: any): Promise<boolean> {
  const isAdmin = !!(await getAdmin(ctx.from?.id!));
  if (!isAdmin) {
    await ctx.answerCallbackQuery({ text: "Faqat adminlar uchun" });
  }
  return isAdmin;
}

// ── #9 decision-message lifecycle helpers ─────────────────────────────────────
// Small pure-ish builders for the edited inline message shown after a decision.

const ALREADY_DECIDED = "Bu so'rov allaqachon hal qilingan";

function statusHeader(status: Booking["status"]): string {
  switch (status) {
    case "confirmed":
      return "✅ Tasdiqlandi";
    case "rejected":
      return "❌ Rad etildi";
    case "cancelled":
      return "⚠️ Bekor qilindi";
    case "expired":
      return "⏰ Muddati o'tdi";
    case "completed":
      return "✅ Yakunlandi";
    default:
      return "ℹ️ Hal qilindi";
  }
}

// HH:MM in Asia/Tashkent. Falls back to now when the booking has no decidedAt.
function tashkentTime(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Tashkent",
  });
}

async function clientLabel(booking: Booking): Promise<string> {
  if (booking.clientName) return booking.clientName;
  if (booking.userId != null) {
    const u = await getUser(booking.userId);
    if (u) return u.name;
  }
  return "Mijoz";
}

// Outcome header + client + slot + (actor •) time. actor omitted when we didn't
// win the decision (race loser only knows the recorded decidedAt, not who acted).
async function formatDecision(
  header: string,
  booking: Booking,
  actor?: string,
): Promise<string> {
  const name = await clientLabel(booking);
  const when = tashkentTime(booking.decidedAt);
  const footer = actor ? `👮 ${actor} • ${when}` : `👮 ${when}`;
  return (
    `${header}\n\n` +
    `👤 ${name}\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    footer
  );
}

// Best-effort: rewrite the clicked message to its final outcome, drop buttons.
// Omitting reply_markup on editMessageText removes the inline keyboard.
async function editDecided(
  ctx: any,
  booking: Booking,
  header: string,
  actor?: string,
): Promise<void> {
  await ctx
    .editMessageText(await formatDecision(header, booking, actor))
    .catch(() => {}); // stale/old/"not modified" messages: nothing to do
}

// Up to 5 free slot-ranges for a day, to offer as alternatives after a rejection.
async function freeAlternatives(
  date: string,
): Promise<Array<{ start: string; end: string }>> {
  try {
    const settings = await getSettings();
    const { slots } = await getDayAvailability(date);
    const ranges = findFreeRanges(
      slots,
      settings?.minDurMin ?? 60,
      settings?.maxDurMin ?? 180,
    );
    return ranges.slice(0, 5).map((r) => ({ start: r.start, end: r.end }));
  } catch {
    return [];
  }
}

export function registerDecisions(): void {
  // Filtered callback handlers (not a catch-all) so other modules can register
  // their own callback actions without being swallowed by a default branch.
  bot.callbackQuery(/^confirm:(.+)$/, async (ctx: any) => {
    if (!(await ensureAdmin(ctx))) return;
    const bookingId = ctx.match[1];
    const result = await confirmBooking(bookingId);
    const booking = await getBooking(bookingId);

    if (result.success) {
      await ctx.answerCallbackQuery({ text: "✅ Tasdiqlandi" });
      if (booking) {
        await editDecided(ctx, booking, "✅ Tasdiqlandi", ctx.from?.first_name);
      }
      return;
    }

    // Non-pending on read = race/stale (someone already decided, or a slot
    // conflict flipped it to rejected inside confirmBooking).
    const alreadyDecided = booking != null && booking.status !== "pending";
    await ctx.answerCallbackQuery({
      text:
        result.error === "Slot conflict detected"
          ? "Bu vaqt band — boshqa bron tasdiqlangan"
          : alreadyDecided
            ? ALREADY_DECIDED
            : "Xato: " + (result.error ?? "noma'lum"),
    });
    if (alreadyDecided) {
      await editDecided(ctx, booking!, statusHeader(booking!.status));
    }
  });

  bot.callbackQuery(/^reject:(.+)$/, async (ctx: any) => {
    if (!(await ensureAdmin(ctx))) return;
    const bookingId = ctx.match[1];

    // rejectBooking always "succeeds", so guard the race ourselves: if it's no
    // longer pending, the first admin already decided it.
    const existing = await getBooking(bookingId);
    if (existing && existing.status !== "pending") {
      await ctx.answerCallbackQuery({ text: ALREADY_DECIDED });
      await editDecided(ctx, existing, statusHeader(existing.status));
      return;
    }

    await rejectBooking(bookingId);
    await ctx.answerCallbackQuery({ text: "❌ Rad etildi" });
    const booking = await getBooking(bookingId);
    if (booking) {
      await editDecided(ctx, booking, "❌ Rad etildi", ctx.from?.first_name);
      // #14: DM the user their request was rejected, with the day's free slots.
      const alternatives = await freeAlternatives(booking.date);
      await notifyUserRejection(booking, "So'rov tasdiqlanmadi", alternatives);
    }
  });

  bot.callbackQuery(/^cancel:(.+)$/, async (ctx: any) => {
    if (!(await ensureAdmin(ctx))) return;
    const bookingId = ctx.match[1];
    await cancelBooking(bookingId);
    await ctx.answerCallbackQuery({ text: "⚠️ Bekor qilindi" });
  });
}

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

// Notify user about cancellation
export async function notifyUserCancellation(booking: Booking): Promise<void> {
  if (!booking.userId) return;
  await notifyUserCancelled(botContext, booking.userId, booking);
}
