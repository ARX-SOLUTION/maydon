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
  userApprovalStatus,
} from "../kv.ts";
import type { Booking, Settings } from "../models.ts";

export interface BookingDecisionActor {
  id?: number;
  name?: string;
}

// ========== Time Helpers ==========

export const TASHKENT_TIME_ZONE = "Asia/Tashkent";
const MINUTES_PER_DAY = 24 * 60;

function formatTashkentParts(now: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TASHKENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
}

export function tashkentDate(now = new Date()): string {
  const parts = formatTashkentParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function tashkentDateTimeKey(now = new Date()): string {
  const parts = formatTashkentParts(now);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function addCalendarDays(date: string, days: number): string {
  const parsed = parseYmd(date);
  if (!parsed) throw new Error(`Invalid calendar date: ${date}`);
  const value = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function calendarDayOfWeek(date: string): number {
  const parsed = parseYmd(date);
  if (!parsed) throw new Error(`Invalid calendar date: ${date}`);
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
}

function parseYmd(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) return null;
  return { year, month, day };
}

function calendarDayDifference(from: string, to: string): number {
  const fromParts = parseYmd(from);
  const toParts = parseYmd(to);
  if (!fromParts || !toParts) return Number.NaN;
  const fromMs = Date.UTC(fromParts.year, fromParts.month - 1, fromParts.day);
  const toMs = Date.UTC(toParts.year, toParts.month - 1, toParts.day);
  return Math.round((toMs - fromMs) / (24 * 60 * 60 * 1000));
}

function isValidTime(time: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60;
}

export function validateSettings(settings: {
  openTime: string;
  closeTime: string;
  horizonDays: number;
  minDurMin: number;
  maxDurMin: number;
  snapMin: number;
}): string | null {
  if (!isValidTime(settings.openTime) || !isValidTime(settings.closeTime)) {
    return "Ish vaqti noto'g'ri";
  }
  const openMin = timeToMinutes(settings.openTime);
  const closeMin = timeToMinutes(settings.closeTime);
  if (openMin >= closeMin) return "Ish vaqti oralig'i noto'g'ri";
  if (!Number.isInteger(settings.horizonDays) || settings.horizonDays <= 0) {
    return "Gorizont musbat butun son bo'lishi kerak";
  }
  if (!Number.isInteger(settings.minDurMin) || settings.minDurMin <= 0) {
    return "Minimal davomiylik noto'g'ri";
  }
  if (!Number.isInteger(settings.maxDurMin) || settings.maxDurMin < settings.minDurMin) {
    return "Maksimal davomiylik noto'g'ri";
  }
  if (!Number.isInteger(settings.snapMin) || settings.snapMin <= 0 || settings.snapMin > MINUTES_PER_DAY) {
    return "Vaqt qadami 1-1440 daqiqa bo'lishi kerak";
  }
  return null;
}

export function validateSlot(
  date: string,
  start: string,
  end: string,
  settings: {
    openTime: string;
    closeTime: string;
    horizonDays: number;
    minDurMin: number;
    maxDurMin: number;
    snapMin: number;
  },
  now = new Date(),
): string | null {
  const settingsError = validateSettings(settings);
  if (settingsError) return settingsError;
  if (!parseYmd(date)) return "Sana noto'g'ri";
  if (!isValidTime(start) || !isValidTime(end)) return "Vaqt noto'g'ri";

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin >= endMin) return "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak";
  const openMin = timeToMinutes(settings.openTime);
  if (
    (startMin - openMin) % settings.snapMin !== 0 ||
    (endMin - openMin) % settings.snapMin !== 0
  ) {
    return `Vaqt ${settings.snapMin} daqiqalik qadamda bo'lishi kerak`;
  }
  const duration = endMin - startMin;
  if (duration < settings.minDurMin) return `Minimal davomiylik ${settings.minDurMin} daqiqa`;
  if (duration > settings.maxDurMin) return `Maksimal davomiylik ${settings.maxDurMin} daqiqa`;

  const closeMin = timeToMinutes(settings.closeTime);
  if (startMin < openMin || endMin > closeMin) {
    return `Ish vaqti tashqarisida (${settings.openTime}-${settings.closeTime})`;
  }

  const daysDiff = calendarDayDifference(tashkentDate(now), date);
  if (!Number.isFinite(daysDiff) || daysDiff < 0 || daysDiff >= settings.horizonDays) {
    return `Bron qilish gorizonti ${settings.horizonDays} kun`;
  }
  return null;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutesToTime(start: string, durationMin: number): string | null {
  if (!isValidTime(start) || !Number.isInteger(durationMin) || durationMin <= 0) {
    return null;
  }
  const total = timeToMinutes(start) + durationMin;
  if (total > 23 * 60 + 59) return null;
  return minutesToTime(total);
}

export function getBookableDurations(
  start: string,
  settings: Pick<Settings, "openTime" | "closeTime" | "minDurMin" | "maxDurMin" | "snapMin">,
): number[] {
  if (!isValidTime(start) || validateSettings({ ...settings, horizonDays: 1 })) return [];

  const startMin = timeToMinutes(start);
  const closeMin = timeToMinutes(settings.closeTime);
  const firstDuration = Math.ceil(settings.minDurMin / settings.snapMin) * settings.snapMin;
  const maxDuration = Math.min(settings.maxDurMin, closeMin - startMin);
  const durations: number[] = [];

  for (let duration = firstDuration; duration <= maxDuration; duration += settings.snapMin) {
    if (addMinutesToTime(start, duration)) durations.push(duration);
  }
  return durations;
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
  if (userApprovalStatus(user) !== "approved") {
    return { valid: false, error: "Admin tasdiqlashini kuting" };
  }

  const slotError = validateSlot(date, start, end, settings);
  if (slotError) return { valid: false, error: slotError };

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
  actor?: BookingDecisionActor,
): Promise<{ success: boolean; error?: string }> {
  const booking = await kv.get<Booking>(keys.booking(id));
  if (!booking.value) {
    return { success: false, error: "Booking not found" };
  }

  if (booking.value.status !== "pending") {
    return { success: false, error: "Booking is not pending" };
  }

  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const current = await kv.get<Booking>(keys.booking(id));
    if (!current.value) return { success: false, error: "Booking not found" };
    if (current.value.status !== "pending") {
      return { success: false, error: "Booking is not pending" };
    }
    const b = current.value;
    const date = b.date;

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
      .check(current)
      .check(dayVer)
      .set(keys.booking(id), {
        ...b,
        status: "confirmed",
        decidedAt: new Date().toISOString(),
        decidedBy: actor?.id,
        decidedByName: actor?.name,
      })
      .set(keys.dayVersion(date), (dayVer.value ?? 0) + 1)
      .delete(keys.pendingByCreated(b.createdAt, id))
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

export async function rejectBooking(
  id: string,
  actor?: BookingDecisionActor,
): Promise<{ success: boolean; error?: string; booking?: Booking }> {
  const booking = await kv.get<Booking>(keys.booking(id));
  if (!booking.value) return { success: false, error: "Booking not found" };

  const b = booking.value;
  if (b.status !== "pending") {
    return { success: false, error: "Booking is not pending", booking: b };
  }
  const updated: Booking = {
    ...b,
    status: "rejected",
    decidedAt: new Date().toISOString(),
    decidedBy: actor?.id,
    decidedByName: actor?.name,
  };
  const committed = await kv.atomic()
    .check(booking)
    .set(keys.booking(id), updated)
    .delete(keys.pendingByCreated(b.createdAt, id))
    .commit();
  if (!committed.ok) {
    return { success: false, error: "Booking parallel o'zgartirildi" };
  }
  return { success: true, booking: updated };
}

export async function cancelBooking(
  id: string,
  actor?: BookingDecisionActor,
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
  if (b.status === "rejected" || b.status === "expired") {
    return { success: false, error: `Cannot cancel ${b.status} bookings` };
  }

  const updated: Booking = {
    ...b,
    status: "cancelled",
    decidedAt: new Date().toISOString(),
    decidedBy: actor?.id,
    decidedByName: actor?.name,
  };

  const dayVersion = b.status === "confirmed"
    ? await kv.get<number>(keys.dayVersion(b.date))
    : null;
  const atomic = kv.atomic()
    .check(booking)
    .set(keys.booking(id), updated);
  if (b.status === "pending") {
    atomic.delete(keys.pendingByCreated(b.createdAt, b.id));
  }
  if (dayVersion) {
    atomic.check(dayVersion).set(keys.dayVersion(b.date), (dayVersion.value ?? 0) + 1);
  }
  const ok = await atomic.commit();

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
  bookingId?: string,
  dedupeKey?: Deno.KvKey,
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const settings = await getSettings() ?? {
    openTime: "08:00",
    closeTime: "23:00",
    horizonDays: 7,
    minDurMin: 60,
    maxDurMin: 180,
    snapMin: 30,
  };
  const slotError = validateSlot(date, start, end, settings);
  const validation = source === "user"
    ? await validateBookingRequest(userId!, date, start, end)
    : { valid: !slotError, error: slotError ?? undefined };

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const id = bookingId ?? ulid();
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
    status: source === "user" ? "pending" : "confirmed",
    source,
    recurringId,
    createdAt,
    inviteToken: token,
    participantIds: [],
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const dayBookings = await getBookingsByDay(date);
    if (
      booking.status === "confirmed" &&
      dayBookings.some((existing) =>
        existing.status === "confirmed" && overlaps(start, end, existing.start, existing.end)
      )
    ) {
      return { success: false, error: "Slot conflict detected" };
    }

    const dayVersion = await kv.get<number>(keys.dayVersion(date));
    const atomic = kv
      .atomic()
      .check(dayVersion)
      .set(keys.booking(id), booking)
      .set(keys.bookingByDay(date, id), id)
      .set(keys.bookingInviteToken(token), id)
      .set(keys.dayVersion(date), (dayVersion.value ?? 0) + 1);
    if (booking.status === "pending") {
      atomic.set(keys.pendingByCreated(createdAt, id), id);
    }
    if (dedupeKey) {
      atomic.check(await kv.get(dedupeKey)).set(dedupeKey, id);
    }
    if (userId != null) {
      atomic.set(keys.bookingByUser(userId, id), id);
    }
    const ok = await atomic.commit();
    if (ok.ok) return { success: true, booking };
  }
  return { success: false, error: "Failed to create booking" };
}

// ========== Squad Invitations ==========

export async function joinBooking(
  token: string,
  userId: number,
): Promise<{ success: boolean; error?: string }> {
  // 1. Get the booking ID from the token
  const idEntry = await kv.get<string>(keys.bookingInviteToken(token));
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
