/**
 * Recurring Booking Service
 */

import { ulid } from "ulid";
import {
  addCalendarDays,
  calendarDayOfWeek,
  createBooking,
  tashkentDate,
  validateSettings,
  validateSlot,
} from "./booking.ts";
import {
  getAllRecurring,
  getBookingsByDay,
  getRecurring,
  getSettings,
  keys,
  kv,
} from "../kv.ts";
import type { Booking, Recurring } from "../models.ts";

const recurringGenerationKey = (recurringId: string, date: string) =>
  ["recurring_generated", recurringId, date] as const;

export async function createRecurring(
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  clientName: string,
  phone: string,
): Promise<{ success: boolean; recurring?: Recurring; error?: string }> {
  const settings = await getSettings();
  if (!settings) return { success: false, error: "Sozlamalar topilmadi" };
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return { success: false, error: "Hafta kuni noto'g'ri" };
  }
  const settingsError = validateSettings(settings);
  if (settingsError) return { success: false, error: settingsError };
  const validationDate = tashkentDate();
  const slotError = validateSlot(validationDate, startTime, endTime, settings);
  if (slotError) return { success: false, error: slotError };

  const id = ulid();

  const recurring: Recurring = {
    id,
    dayOfWeek,
    startTime,
    endTime,
    clientName,
    phone,
    active: true,
  };

  await kv.set(keys.recurring(id), recurring);
  return { success: true, recurring };
}

export async function deleteRecurring(
  id: string,
  mode: "week" | "series",
): Promise<void> {
  const recurring = await kv.get<Recurring>(keys.recurring(id));
  if (!recurring.value) return;

  if (mode === "series") {
    await kv.delete(keys.recurring(id));
  } else {
    // Just deactivate
    recurring.value.active = false;
    await kv.set(keys.recurring(id), recurring.value);
  }
}

export async function setRecurringActive(
  id: string,
  active: boolean,
): Promise<{ success: boolean; recurring?: Recurring; error?: string }> {
  const recurring = await getRecurring(id);
  if (!recurring) {
    return { success: false, error: "Recurring booking not found" };
  }

  const updated = { ...recurring, active };
  await kv.set(keys.recurring(id), updated);
  return { success: true, recurring: updated };
}

export async function generateRecurringBookings(): Promise<void> {
  const recurringList = await getAllRecurring();
  const settings = await getSettings();

  if (!settings || validateSettings(settings)) return;

  const localToday = tashkentDate();

  // Generate for next 7 days
  for (let i = 0; i < 7; i++) {
    const dateStr = addCalendarDays(localToday, i);
    const dayOfWeek = calendarDayOfWeek(dateStr);

    // Find matching recurring bookings
    const matching = recurringList.filter(
      (r: Recurring) => r.active && r.dayOfWeek === dayOfWeek,
    );

    for (const rec of matching) {
      // Check if booking already exists for this date
      const dayBookings = await getBookingsByDay(dateStr);
      const exists = dayBookings.some(
        (booking: Booking) =>
          booking.recurringId === rec.id && booking.status !== "cancelled",
      );

      if (!exists) {
        await createBooking(
          null,
          rec.clientName,
          rec.phone,
          dateStr,
          rec.startTime,
          rec.endTime,
          "recurring",
          rec.id,
          `rec-${rec.id}-${dateStr}`,
          recurringGenerationKey(rec.id, dateStr),
        );
      }
    }
  }
}
