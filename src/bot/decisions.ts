/**
 * Request decisions — the admin confirm/reject/cancel flow and the notifications
 * that surround a booking request. Ticket #9 adds message-editing on decision;
 * ticket #14 adds alternative slots on reject.
 */
import { getAdmin, getPendingRequests, getUser, kv } from "../kv.ts";
import type { Booking } from "../models.ts";
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

export function registerDecisions(): void {
  // Filtered callback handlers (not a catch-all) so other modules can register
  // their own callback actions without being swallowed by a default branch.
  bot.callbackQuery(/^confirm:(.+)$/, async (ctx: any) => {
    if (!(await ensureAdmin(ctx))) return;
    const bookingId = ctx.match[1];
    const result = await confirmBooking(bookingId);
    if (result.success) {
      await ctx.answerCallbackQuery({ text: "✅ Tasdiqlandi" });
      // TODO(#9): edit the message to show the outcome + who + when, remove buttons
    } else {
      await ctx.answerCallbackQuery({ text: "❌ Xato: " + result.error });
    }
  });

  bot.callbackQuery(/^reject:(.+)$/, async (ctx: any) => {
    if (!(await ensureAdmin(ctx))) return;
    const bookingId = ctx.match[1];
    await rejectBooking(bookingId);
    await ctx.answerCallbackQuery({ text: "❌ Rad etildi" });
    // TODO(#9): edit the message; TODO(#14): send alternative slots to the user
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
