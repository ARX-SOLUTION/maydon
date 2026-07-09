/**
 * Booking Service — Core business logic
 */

import { ulid } from "ulid";
import {
  getBookingsByDay,
  getBookingsByUser,
  getSettings,
  getUser,
  keys,
  kv,
} from "../kv.ts";
import type { Booking } from "../models.ts";

// ========== Time Helpers ==========

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const aStartMin = timeToMinutes(aStart);
  const aEndMin = timeToMinutes(aEnd);
  const bStartMin = timeToMinutes(bStart);
  const bEndMin = timeToMinutes(bEnd);
  return aStartMin < bEndMin && aEndMin > bStartMin;
}

// ========== Validation ==========

export async function validateBookingRequest(
  userId: number,
  date: string,
  start: string,
  end: string,
): Promise<{ valid: boolean; error?: string }> {
  const settings = await getSettings();
  if (!settings) {
    return { valid: false, error: "Sozlamalar topilmadi" };
  }

  const user = await getUser(userId);
  if (user?.isBlocked) {
    return { valid: false, error: "Siz bloklangansiz" };
  }
  if (!user?.isActive) {
    return {
      valid: false,
      error: "Avval botda ro'yxatdan o'tishni yakunlang (/start bosing)",
    };
  }

  // Snap validation
  const snap = settings.snapMin;
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);

  if (startMin % snap !== 0 || endMin % snap !== 0) {
    return { valid: false, error: `Vaqt ${snap} daqiqalik qadamda bo'lishi kerak` };
  }

  // Duration validation
  const duration = endMin - startMin;
  if (duration < settings.minDurMin) {
    return {
      valid: false,
      error: `Minimal davomiylik ${settings.minDurMin} daqiqa`,
    };
  }
  if (duration > settings.maxDurMin) {
    return {
      valid: false,
      error: `Maksimal davomiylik ${settings.maxDurMin} daqiqa`,
    };
  }

  // Working hours validation
  const openMin = timeToMinutes(settings.openTime);
  const closeMin = timeToMinutes(settings.closeTime);
  if (startMin < openMin || endMin > closeMin) {
    return {
      valid: false,
      error: `Ish vaqti tashqarisida (${settings.openTime}-${settings.closeTime})`,
    };
  }

  // Horizon validation
  const today = new Date();
  const tzOffset = 5 * 60 * 60 * 1000; // UTC+5
  const localToday = new Date(today.getTime() + tzOffset);
  localToday.setHours(0, 0, 0, 0);

  const bookingDate = new Date(date + "T00:00:00");
  const daysDiff = Math.floor(
    (bookingDate.getTime() - localToday.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysDiff < 0 || daysDiff >= settings.horizonDays) {
    return {
      valid: false,
      error: `Bron qilish gorizonti ${settings.horizonDays} kun`,
    };
  }

  // Pending limit validation (max 3 active pending, across all days)
  const ownPendingBookings = (await getBookingsByUser(userId)).filter(
    (b: Booking) => b.status === "pending",
  );

  if (ownPendingBookings.length >= 3) {
    return { valid: false, error: "Maksimal 3 ta kutilayotgan so'rov" };
  }

  // Duplicate request validation (same slot, same user)
  const duplicate = ownPendingBookings.find(
    (b: Booking) => b.date === date && b.start === start && b.end === end,
  );

  if (duplicate) {
    return {
      valid: false,
      error: "Bu vaqt uchun so'rovingiz allaqachon yuborilgan",
    };
  }

  return { valid: true };
}

// ========== Atomic Confirm (Critical Path) ==========

async function checkOverlapWithConfirmed(
  bookings: Booking[],
  start: string,
  end: string,
  excludeId: string,
): Promise<boolean> {
  // Exclude the booking being confirmed — otherwise a concurrent confirm/confirm
  // race sees this booking already flipped to "confirmed" on retry and treats it
  // as a conflict against itself, rejecting a booking that was just confirmed.
  return bookings.some(
    (b: Booking) =>
      b.id !== excludeId &&
      b.status === "confirmed" &&
      overlaps(start, end, b.start, b.end),
  );
}

export async function confirmBooking(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const booking = await kv.get<Booking>(keys.booking(id));
  if (!booking.value) {
    return { success: false, error: "Booking not found" };
  }

  const b = booking.value;
  if (b.status !== "pending") {
    return { success: false, error: "Booking is not pending" };
  }

  const date = b.date;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // 1. Read all bookings for the day
    const dayBookings = await getBookingsByDay(date);

    // 2. Check overlap with confirmed bookings (other than this one)
    if (await checkOverlapWithConfirmed(dayBookings, b.start, b.end, id)) {
      // Overlap detected → reject
      await rejectBooking(id);
      return { success: false, error: "Slot conflict detected" };
    }

    // 3. Get day version for atomic commit
    const dayVer = await kv.get<number>(keys.dayVersion(date));

    // 4. Atomic commit
    const ok = await kv
      .atomic()
      .check(dayVer)
      .set(keys.booking(id), {
        ...b,
        status: "confirmed",
        decidedAt: new Date().toISOString(),
      })
      .set(keys.dayVersion(date), (dayVer.value ?? 0) + 1)
      .commit();

    if (ok.ok) {
      // 5. Reject overlapping pending requests
      await rejectOverlappingPending(date, b.start, b.end, id);
      return { success: true };
    }

    // Retry loop
  }

  return { success: false, error: "Failed to confirm after retries" };
}

async function rejectOverlappingPending(
  date: string,
  start: string,
  end: string,
  excludeId: string,
): Promise<void> {
  const dayBookings = await getBookingsByDay(date);
  for (const b of dayBookings) {
    if (
      b.id !== excludeId &&
      b.status === "pending" &&
      overlaps(start, end, b.start, b.end)
    ) {
      await rejectBooking(b.id);
    }
  }
}

export async function rejectBooking(id: string): Promise<void> {
  const booking = await kv.get<Booking>(keys.booking(id));
  if (!booking.value) return;

  const b = booking.value;
  await kv.set(keys.booking(id), {
    ...b,
    status: "rejected",
    decidedAt: new Date().toISOString(),
  });
}

export async function cancelBooking(
  id: string,
): Promise<{ success: boolean; error?: string; booking?: Booking }> {
  const booking = await kv.get<Booking>(keys.booking(id));
  if (!booking.value) {
    return { success: false, error: "Booking not found" };
  }

  const b = booking.value;
  if (b.status === "cancelled") {
    return { success: false, error: "Booking is already cancelled" };
  }
  if (b.status === "completed") {
    return { success: false, error: "Cannot cancel completed bookings" };
  }

  const updated: Booking = {
    ...b,
    status: "cancelled",
    decidedAt: new Date().toISOString(),
  };

  const ok = await kv.atomic()
    .check(booking)
    .set(keys.booking(id), updated)
    .commit();

  if (!ok.ok) {
    return { success: false, error: "Failed to cancel due to concurrent update" };
  }

  return { success: true, booking: updated };
}

// ========== Create Booking ==========

export async function createBooking(
  userId: number | null,
  clientName: string | undefined,
  clientPhone: string | undefined,
  date: string,
  start: string,
  end: string,
  source: "user" | "admin" | "recurring" = "user",
  recurringId?: string,
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const validation =
    source === "user"
      ? await validateBookingRequest(userId!, date, start, end)
      : { valid: true };

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const id = ulid();
  const createdAt = new Date().toISOString();

  const token = ulid();

  const booking: Booking = {
    id,
    userId,
    clientName,
    clientPhone,
    date,
    start,
    end,
    status: source === "admin" ? "confirmed" : "pending",
    source,
    recurringId,
    createdAt,
    inviteToken: token,
    participantIds: [],
  };

  // Atomic write with indexes
  const atomic = kv
    .atomic()
    .set(keys.booking(id), booking)
    .set(keys.bookingByDay(date, id), id)
    .set(keys.pendingByCreated(createdAt, id), id)
    .set(keys.inviteToken(token), id);
  if (userId != null) {
    atomic.set(keys.bookingByUser(userId, id), id);
  }
  const ok = await atomic.commit();

  if (!ok.ok) {
    return { success: false, error: "Failed to create booking" };
  }

  return { success: true, booking };
}

// ========== Squad Invitations ==========

export async function joinBooking(
  token: string,
  userId: number,
): Promise<{ success: boolean; error?: string }> {
  // 1. Get the booking ID from the token
  const idEntry = await kv.get<string>(keys.inviteToken(token));
  if (!idEntry.value) {
    return { success: false, error: "Taklifnoma topilmadi" };
  }
  const bookingId = idEntry.value;

  // 2. Get the booking
  const bookingEntry = await kv.get<Booking>(keys.booking(bookingId));
  if (!bookingEntry.value) {
    return { success: false, error: "O'yin topilmadi" };
  }

  const booking = bookingEntry.value;
  if (booking.status !== "confirmed" && booking.status !== "pending") {
    return { success: false, error: "Bu o'yin faol emas" };
  }

  const participants = booking.participantIds || [];
  if (participants.includes(userId)) {
    return { success: false, error: "Siz allaqachon qo'shilgansiz" };
  }

  // 3. Atomic append
  // Since participants array can grow, we use atomic check to ensure no overwrites
  const newParticipants = [...participants, userId];
  
  const ok = await kv.atomic()
    .check(bookingEntry)
    .set(keys.booking(bookingId), { ...booking, participantIds: newParticipants })
    .commit();
    
  if (!ok.ok) {
    return { success: false, error: "Xatolik yuz berdi, qayta urinib ko'ring" };
  }

  return { success: true };
}
