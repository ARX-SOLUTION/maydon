/**
 * Request decisions — the admin confirm/reject/cancel flow and the notifications
 * that surround a booking request. Ticket #9 adds message-editing on decision;
 * ticket #14 adds alternative slots on reject.
 */
import { getAdmin, getPendingRequests, getUser, kv } from "../kv.ts";
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
import type { Booking } from "../models.ts";
import { bot, botContext } from "./client.ts";

export function registerDecisions(): void {
  // Callback query handler for inline confirm/reject/cancel buttons
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
      case "confirm": {
        const confirmResult = await confirmBooking(bookingId);
        if (confirmResult.success) {
          await ctx.answerCallbackQuery({ text: "✅ Tasdiqlandi" });
          // TODO(#9): Update message
        } else {
          await ctx.answerCallbackQuery({
            text: "❌ Xato: " + confirmResult.error,
          });
        }
        break;
      }

      case "reject":
        await rejectBooking(bookingId);
        await ctx.answerCallbackQuery({ text: "❌ Rad etildi" });
        // TODO(#9): Update message
        break;

      case "cancel":
        await cancelBooking(bookingId);
        await ctx.answerCallbackQuery({ text: "⚠️ Bekor qilindi" });
        break;

      default:
        await ctx.answerCallbackQuery({ text: "Noma'lum buyruq" });
    }
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
