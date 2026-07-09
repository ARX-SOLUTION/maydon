/**
 * KV Client & Key Helpers
 */

import type { Admin, Booking, Recurring, Settings, User } from "./models.ts";

const KV_PATH = Deno.env.get("KV_PATH") ?? "maydon_kv";

// Named openKv() on Deno Deploy requires a dashboard-provisioned KV db. openKv()
// itself resolves lazily and never rejects for a bad name — the "metadata NOT_FOUND"
// error only surfaces on the first real operation. So we can't just .catch() the
// open call; we have to probe with an actual read and fall back if THAT fails.
async function openHealthyKv(path: string): Promise<Deno.Kv> {
  const candidate = await Deno.openKv(path);
  try {
    await candidate.get(["__kv_healthcheck__"]);
    return candidate;
  } catch (e) {
    console.error(`openKv("${path}") failed on first use, falling back to the default KV:`, e);
    try {
      candidate.close();
    } catch {
      // ignore — best-effort cleanup of the unusable handle
    }
    return await Deno.openKv();
  }
}

export const kv = await openHealthyKv(KV_PATH);

// ========== Key Builders ==========

export const keys = {
  settings: ["settings"] as const,
  admin: (telegramId: number) => ["admins", telegramId] as const,
  user: (telegramId: number) => ["users", telegramId] as const,
  booking: (id: string) => ["bookings", id] as const,
  bookingByDay: (date: string, id: string) =>
    ["bookings_by_day", date, id] as const,
  bookingByUser: (telegramId: number, id: string) =>
    ["bookings_by_user", telegramId, id] as const,
  pendingByCreated: (createdAt: string, id: string) =>
    ["pending_by_created", createdAt, id] as const,
  dayVersion: (date: string) => ["day_version", date] as const,
  recurring: (id: string) => ["recurring", id] as const,
};

// ========== CRUD Helpers ==========

export async function getSettings(): Promise<Settings | null> {
  const res = await kv.get<Settings>(keys.settings);
  return res.value;
}

export async function upsertSettings(settings: Settings): Promise<void> {
  await kv.set(keys.settings, settings);
}

export async function getAdmin(telegramId: number): Promise<Admin | null> {
  const res = await kv.get<Admin>(keys.admin(telegramId));
  return res.value;
}

export async function addAdmin(admin: Admin): Promise<void> {
  await kv.set(keys.admin(admin.telegramId), admin);
}

export async function getUser(telegramId: number): Promise<User | null> {
  const res = await kv.get<User>(keys.user(telegramId));
  return res.value;
}

export async function upsertUser(user: User): Promise<void> {
  await kv.set(keys.user(user.telegramId), user);
}

export async function getBooking(id: string): Promise<Booking | null> {
  const res = await kv.get<Booking>(keys.booking(id));
  return res.value;
}

export async function getBookingsByDay(date: string): Promise<Booking[]> {
  // Note: prefix must NOT include a trailing "" placeholder for the id —
  // Deno KV prefix matching requires exact equality on every given
  // component, so a "" component matches nothing (not "starts with").
  const entries = await kv.list<Booking>({
    prefix: ["bookings_by_day", date],
  });
  const bookings: Booking[] = [];
  for await (const entry of entries) {
    const booking = await getBooking(entry.key[2] as string);
    if (booking) bookings.push(booking);
  }
  return bookings;
}

export async function getBookingsByUser(
  telegramId: number,
): Promise<Booking[]> {
  const entries = await kv.list<string>({
    prefix: ["bookings_by_user", telegramId],
  });
  const bookings: Booking[] = [];
  for await (const entry of entries) {
    const booking = await getBooking(entry.value);
    if (booking) bookings.push(booking);
  }
  return bookings;
}

export async function getPendingRequests(): Promise<Booking[]> {
  const entries = await kv.list<string>({
    prefix: ["pending_by_created"],
  });
  const bookings: Booking[] = [];
  for await (const entry of entries) {
    const booking = await getBooking(entry.value);
    if (booking && booking.status === "pending") {
      bookings.push(booking);
    }
  }
  return bookings;
}

export async function getRecurring(id: string): Promise<Recurring | null> {
  const res = await kv.get<Recurring>(keys.recurring(id));
  return res.value;
}

export async function getAllRecurring(): Promise<Recurring[]> {
  const entries = await kv.list<Recurring>({ prefix: ["recurring"] });
  const recurring: Recurring[] = [];
  for await (const entry of entries) {
    recurring.push(entry.value);
  }
  return recurring;
}

// ========== Utility ==========

export async function initDefaultSettings(): Promise<void> {
  const existing = await getSettings();
  if (!existing) {
    await upsertSettings({
      openTime: "08:00",
      closeTime: "23:00",
      horizonDays: 7,
      minDurMin: 60,
      maxDurMin: 180,
      snapMin: 30,
    });
  }
}
