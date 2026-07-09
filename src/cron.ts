/**
 * Cron Jobs — Scheduled tasks
 */

import { getBookingsByDay, keys, kv } from "./kv.ts";
import type { Booking } from "./models.ts";
import { addCalendarDays, tashkentDate, tashkentDateTimeKey } from "./services/booking.ts";
import { generateRecurringBookings } from "./services/recurring.ts";

// Run every 15 minutes
export async function expirePending(): Promise<void> {
  const localNowKey = tashkentDateTimeKey();

  const pending = await kv.list<string>({
    prefix: ["pending_by_created"],
  });

  for await (const entry of pending) {
    const booking = await kv.get<Booking>(keys.booking(entry.value));
    if (!booking.value || booking.value.status !== "pending") {
      await kv.delete(entry.key);
      continue;
    }

    const b = booking.value;
    if (`${b.date}T${b.start}` < localNowKey) {
      await kv.atomic()
        .check(booking)
        .set(keys.booking(b.id), {
          ...b,
          status: "expired",
          decidedAt: new Date().toISOString(),
        })
        .delete(keys.pendingByCreated(b.createdAt, b.id))
        .commit();
      // TODO: Send notification to user
    }
  }
}

// Run every 15 minutes
export async function completeBookings(): Promise<void> {
  const localNowKey = tashkentDateTimeKey();
  const today = tashkentDate();

  // Check last 7 days
  for (let i = 0; i < 7; i++) {
    const dateStr = addCalendarDays(today, -i);

    const bookings = await getBookingsByDay(dateStr);

    for (const b of bookings) {
      if (b.status === "confirmed") {
        if (`${b.date}T${b.end}` < localNowKey) {
          const current = await kv.get<Booking>(keys.booking(b.id));
          if (!current.value || current.value.status !== "confirmed") continue;
          const dayVersion = await kv.get<number>(keys.dayVersion(b.date));
          await kv.atomic()
            .check(current)
            .check(dayVersion)
            .set(keys.booking(b.id), {
              ...current.value,
              status: "completed",
              decidedAt: new Date().toISOString(),
            })
            .set(keys.dayVersion(b.date), (dayVersion.value ?? 0) + 1)
            .commit();
        }
      }
    }
  }
}

// Run daily at 03:00
export async function generateRecurring(): Promise<void> {
  await generateRecurringBookings();
}

// Register cron jobs
export function registerCronJobs(): void {
  Deno.cron("expire-pending", "*/15 * * * *", () => {
    expirePending().catch(console.error);
  });

  Deno.cron("complete-bookings", "*/15 * * * *", () => {
    completeBookings().catch(console.error);
  });

  Deno.cron("generate-recurring", "0 3 * * *", () => {
    generateRecurring().catch(console.error);
  });
}
