/**
 * Availability Service — Get free/busy slots
 */

import {
  addCalendarDays,
  minutesToTime,
  overlaps,
  timeToMinutes,
  validateSettings,
} from "./booking.ts";
import { getBookingsByDay, getSettings } from "../kv.ts";
import type { Booking, Settings } from "../models.ts";

export interface TimeSlot {
  start: string;
  end: string;
  isBusy: boolean;
  bookingId?: string;
  bookedBy?: string;
  userId?: number | null;
  participantCount?: number;
  inviteToken?: string;
}

export async function getDayAvailability(
  date: string,
  preloadedSettings?: Settings,
): Promise<{
  slots: TimeSlot[];
  openTime: string;
  closeTime: string;
}> {
  const settings = preloadedSettings ?? (await getSettings());
  if (!settings) {
    throw new Error("Settings not initialized");
  }
  const settingsError = validateSettings(settings);
  if (settingsError) throw new Error(`Invalid settings: ${settingsError}`);

  const bookings = await getBookingsByDay(date);
  const confirmedBookings = bookings.filter(
    (b: Booking) => b.status === "confirmed",
  );

  const openMin = timeToMinutes(settings.openTime);
  const closeMin = timeToMinutes(settings.closeTime);
  const snap = settings.snapMin;

  const slots: TimeSlot[] = [];

  for (let startMin = openMin; startMin < closeMin; startMin += snap) {
    const endMin = Math.min(startMin + snap, closeMin);
    if (endMin <= startMin) break;
    const startTime = minutesToTime(startMin);
    const endTime = minutesToTime(endMin);

    const overlappingBooking = confirmedBookings.find((b: Booking) =>
      overlaps(startTime, endTime, b.start, b.end),
    );

    slots.push({
      start: startTime,
      end: endTime,
      isBusy: !!overlappingBooking,
      bookingId: overlappingBooking?.id,
      bookedBy: overlappingBooking?.clientName ?? undefined,
      userId: overlappingBooking?.userId,
      participantCount: overlappingBooking?.participantIds?.length ?? 0,
      inviteToken: overlappingBooking?.inviteToken,
    });
  }

  return {
    slots,
    openTime: settings.openTime,
    closeTime: settings.closeTime,
  };
}

export async function getAvailabilityRange(
  fromDate: string,
  toDate: string,
): Promise<Record<string, TimeSlot[]>> {
  const result: Record<string, TimeSlot[]> = {};

  // Read settings once, reuse across the range (was re-read per day).
  const settings = await getSettings();
  if (!settings) {
    throw new Error("Settings not initialized");
  }

  for (let dateStr = fromDate; dateStr <= toDate; dateStr = addCalendarDays(dateStr, 1)) {
    const day = await getDayAvailability(dateStr, settings);
    result[dateStr] = day.slots;
  }

  return result;
}

export function findFreeRanges(
  slots: TimeSlot[],
  minDurationMin: number,
  maxDurationMin: number,
): Array<{
  start: string;
  end: string;
  durationMin: number;
}> {
  const ranges: Array<{ start: string; end: string; durationMin: number }> = [];
  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;

  for (const slot of slots) {
    if (!slot.isBusy) {
      if (!rangeStart) {
        rangeStart = slot.start;
      }
      rangeEnd = slot.end;
    } else {
      if (rangeStart && rangeEnd) {
        const duration = timeToMinutes(rangeEnd) - timeToMinutes(rangeStart);
        if (duration >= minDurationMin) {
          ranges.push({
            start: rangeStart,
            end: rangeEnd,
            durationMin: duration,
          });
        }
        rangeStart = null;
        rangeEnd = null;
      }
    }
  }

  // Handle last range
  if (rangeStart && rangeEnd) {
    const duration = timeToMinutes(rangeEnd) - timeToMinutes(rangeStart);
    if (duration >= minDurationMin) {
      ranges.push({
        start: rangeStart,
        end: rangeEnd,
        durationMin: duration,
      });
    }
  }

  return ranges;
}
