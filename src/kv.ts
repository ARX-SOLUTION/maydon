/**
 * KV Client & Key Helpers
 */

import type {
  Admin,
  Booking,
  Recurring,
  Settings,
  User,
  UserApprovalStatus,
} from "./models.ts";
import { roleFor } from "./models.ts";

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
  adminInviteToken: (token: string) => ["admin_invite_tokens", token] as const,
  bookingInviteToken: (token: string) => ["booking_invite_tokens", token] as const,
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

export async function isOwner(telegramId: number): Promise<boolean> {
  const admin = await getAdmin(telegramId);
  return admin?.role === "owner";
}

/**
 * Backfill `role` on every stored admin from the single ownerRole rule. Idempotent:
 * only writes when the role actually changes. Handles both admins created before the
 * role field existed and ownership moving when ADMIN_TELEGRAM_ID changes.
 */
export async function migrateAdminRoles(ownerId: number | null): Promise<void> {
  const entries = kv.list<Admin>({ prefix: ["admins"] });
  for await (const entry of entries) {
    const admin = entry.value;
    const role = roleFor(admin.telegramId, ownerId);
    if (admin.role !== role) {
      await kv.set(keys.admin(admin.telegramId), { ...admin, role });
    }
  }
}

export async function getUser(telegramId: number): Promise<User | null> {
  const res = await kv.get<User>(keys.user(telegramId));
  return res.value;
}

export async function upsertUser(user: User): Promise<void> {
  await kv.set(keys.user(user.telegramId), user);
}

export async function getAllUsers(): Promise<User[]> {
  const users: User[] = [];
  for await (const entry of kv.list<User>({ prefix: ["users"] })) {
    users.push(entry.value);
  }
  return users;
}

export function userApprovalStatus(user: User): UserApprovalStatus {
  // Users created before approval existed were already allowed to book.
  return user.approvalStatus ?? (user.isActive ? "approved" : "pending");
}

export async function decideUserApproval(
  telegramId: number,
  status: Exclude<UserApprovalStatus, "pending">,
  actor: { id: number; name: string },
): Promise<{ success: boolean; user?: User; error?: string }> {
  const entry = await kv.get<User>(keys.user(telegramId));
  if (!entry.value) return { success: false, error: "Foydalanuvchi topilmadi" };

  const current = userApprovalStatus(entry.value);
  if (current !== "pending") {
    return { success: false, user: entry.value, error: "Bu foydalanuvchi allaqachon hal qilingan" };
  }

  const updated: User = {
    ...entry.value,
    approvalStatus: status,
    approvalDecidedBy: actor.id,
    approvalDecidedByName: actor.name,
    approvalDecidedAt: new Date().toISOString(),
  };
  const committed = await kv.atomic()
    .check(entry)
    .set(keys.user(telegramId), updated)
    .commit();

  if (!committed.ok) {
    return { success: false, error: "Qaror parallel o'zgartirildi, qayta urinib ko'ring" };
  }
  return { success: true, user: updated };
}

export async function getBooking(id: string): Promise<Booking | null> {
  const res = await kv.get<Booking>(keys.booking(id));
  return res.value;
}

// ponytail: Deno KV getMany caps at 10 keys/call — chunk larger id lists.
const GETMANY_MAX = 10;

// Batch-fetch bookings by id, skipping missing. Replaces per-id N+1 kv.get loops.
async function getBookingsByIds(ids: string[]): Promise<Booking[]> {
  const bookings: Booking[] = [];
  for (let i = 0; i < ids.length; i += GETMANY_MAX) {
    const chunk = ids.slice(i, i + GETMANY_MAX).map((id) => keys.booking(id));
    const entries = await kv.getMany<Booking[]>(chunk);
    for (const entry of entries) {
      if (entry.value) bookings.push(entry.value);
    }
  }
  return bookings;
}

export async function getBookingsByDay(date: string): Promise<Booking[]> {
  // Note: prefix must NOT include a trailing "" placeholder for the id —
  // Deno KV prefix matching requires exact equality on every given
  // component, so a "" component matches nothing (not "starts with").
  const entries = kv.list<Booking>({
    prefix: ["bookings_by_day", date],
  });
  const ids: string[] = [];
  for await (const entry of entries) {
    ids.push(entry.key[2] as string);
  }
  return getBookingsByIds(ids);
}

export async function getBookingsByUser(
  telegramId: number,
): Promise<Booking[]> {
  const entries = kv.list<string>({
    prefix: ["bookings_by_user", telegramId],
  });
  const ids: string[] = [];
  for await (const entry of entries) {
    ids.push(entry.value);
  }
  return getBookingsByIds(ids);
}

export async function getPendingRequests(): Promise<Booking[]> {
  const entries = kv.list<string>({
    prefix: ["pending_by_created"],
  });
  const ids: string[] = [];
  for await (const entry of entries) {
    ids.push(entry.value);
  }
  const bookings = await getBookingsByIds(ids);
  return bookings.filter((b) => b.status === "pending");
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
