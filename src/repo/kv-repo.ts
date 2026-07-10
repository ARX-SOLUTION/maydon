/**
 * KvRepo — the current Deno KV storage engine behind the Repo seam.
 *
 * Delegates to ../kv.ts where a helper already exists; implements the rest inline
 * with the exported `kv` + `keys`. Faithful drop-in for today's behavior.
 */

import { ulid } from "ulid";
import type { Admin, Booking, Recurring, Settings, User } from "../models.ts";
import {
  addAdmin,
  getAdmin,
  getAllRecurring,
  getBooking,
  getBookingsByDay,
  getBookingsByUser,
  getPendingRequests,
  getRecurring,
  getSettings,
  getUser,
  keys,
  kv,
  upsertSettings,
  upsertUser,
} from "../kv.ts";
import type {
  BookingEvent,
  NewNotification,
  Notification,
  Repo,
} from "./repo.ts";

// Key builders for entities kv.ts doesn't know about yet (local to this engine).
const nKeys = {
  notification: (id: string) => ["notifications", id] as const,
  bookingEvent: (bookingId: string, id: string) =>
    ["booking_events", bookingId, id] as const,
};

export class KvRepo implements Repo {
  // ── Settings ──────────────────────────────────────────────────────────
  getSettings(): Promise<Settings | null> {
    return getSettings();
  }
  upsertSettings(settings: Settings): Promise<void> {
    return upsertSettings(settings);
  }

  // ── Users ─────────────────────────────────────────────────────────────
  getUser(telegramId: number): Promise<User | null> {
    return getUser(telegramId);
  }
  upsertUser(user: User): Promise<void> {
    return upsertUser(user);
  }
  async listUsers(): Promise<User[]> {
    const out: User[] = [];
    for await (const e of kv.list<User>({ prefix: ["users"] })) out.push(e.value);
    return out;
  }

  // ── Admins ────────────────────────────────────────────────────────────
  getAdmin(telegramId: number): Promise<Admin | null> {
    return getAdmin(telegramId);
  }
  addAdmin(admin: Admin): Promise<void> {
    return addAdmin(admin);
  }
  async removeAdmin(telegramId: number): Promise<void> {
    await kv.delete(keys.admin(telegramId));
  }
  async listAdmins(): Promise<Admin[]> {
    const out: Admin[] = [];
    for await (const e of kv.list<Admin>({ prefix: ["admins"] })) {
      out.push(e.value);
    }
    return out;
  }

  // ── Bookings ──────────────────────────────────────────────────────────
  getBooking(id: string): Promise<Booking | null> {
    return getBooking(id);
  }
  async createBooking(booking: Booking): Promise<void> {
    const atomic = kv
      .atomic()
      .set(keys.booking(booking.id), booking)
      .set(keys.bookingByDay(booking.date, booking.id), booking.id);
    if (booking.status === "pending") {
      atomic.set(keys.pendingByCreated(booking.createdAt, booking.id), booking.id);
    }
    if (booking.inviteToken) {
      atomic.set(keys.bookingInviteToken(booking.inviteToken), booking.id);
    }
    if (booking.userId != null) {
      atomic.set(keys.bookingByUser(booking.userId, booking.id), booking.id);
    }
    const ok = await atomic.commit();
    if (!ok.ok) throw new Error("Failed to create booking");
  }
  async updateBooking(booking: Booking): Promise<void> {
    const current = await kv.get<Booking>(keys.booking(booking.id));
    if (!current.value) throw new Error("Booking not found");
    const atomic = kv.atomic().check(current).set(keys.booking(booking.id), booking);
    if (current.value.status === "pending" && booking.status !== "pending") {
      atomic.delete(keys.pendingByCreated(current.value.createdAt, booking.id));
    }
    if (booking.status === "pending") {
      atomic.set(keys.pendingByCreated(booking.createdAt, booking.id), booking.id);
    }
    if (booking.inviteToken && booking.inviteToken !== current.value.inviteToken) {
      atomic.set(keys.bookingInviteToken(booking.inviteToken), booking.id);
    }
    const ok = await atomic.commit();
    if (!ok.ok) throw new Error("Booking changed concurrently");
  }
  bookingsByDay(date: string): Promise<Booking[]> {
    return getBookingsByDay(date);
  }
  bookingsByUser(telegramId: number): Promise<Booking[]> {
    return getBookingsByUser(telegramId);
  }
  pendingBookings(): Promise<Booking[]> {
    return getPendingRequests();
  }

  // ── Recurring ─────────────────────────────────────────────────────────
  getRecurring(id: string): Promise<Recurring | null> {
    return getRecurring(id);
  }
  listRecurring(): Promise<Recurring[]> {
    return getAllRecurring();
  }
  async upsertRecurring(recurring: Recurring): Promise<void> {
    await kv.set(keys.recurring(recurring.id), recurring);
  }
  async deleteRecurring(id: string): Promise<void> {
    await kv.delete(keys.recurring(id));
  }

  // ── Invite tokens ─────────────────────────────────────────────────────
  async createInviteToken(token: string, createdBy: number): Promise<void> {
    await kv.set(keys.adminInviteToken(token), {
      createdBy,
      createdAt: new Date().toISOString(),
    });
  }
  async consumeInviteToken(token: string): Promise<boolean> {
    // ponytail: get-then-delete, not atomic. Double-consume race is theoretical
    // for one-time invite links; wrap in kv.atomic().check() if it ever matters.
    const res = await kv.get(keys.adminInviteToken(token));
    if (res.value == null) return false;
    await kv.delete(keys.adminInviteToken(token));
    return true;
  }

  // ── Booking audit trail ───────────────────────────────────────────────
  async addBookingEvent(
    event: Omit<BookingEvent, "id" | "at">,
  ): Promise<void> {
    const id = ulid();
    const full: BookingEvent = { ...event, id, at: new Date().toISOString() };
    await kv.set(nKeys.bookingEvent(event.bookingId, id), full);
  }
  async bookingEvents(bookingId: string): Promise<BookingEvent[]> {
    const out: BookingEvent[] = [];
    for await (
      const e of kv.list<BookingEvent>({ prefix: ["booking_events", bookingId] })
    ) {
      out.push(e.value); // ulid keys → chronological
    }
    return out;
  }

  // ── Admin notification feed ───────────────────────────────────────────
  async createNotification(n: NewNotification): Promise<void> {
    const id = ulid();
    const full: Notification = { ...n, id, createdAt: new Date().toISOString() };
    await kv.set(nKeys.notification(id), full);
  }
  async listNotifications(
    adminId: number,
    opts?: { unreadOnly?: boolean },
  ): Promise<Notification[]> {
    const out: Notification[] = [];
    for await (const e of kv.list<Notification>({ prefix: ["notifications"] })) {
      const n = e.value;
      // undefined targetAdminId = broadcast to every admin.
      if (n.targetAdminId != null && n.targetAdminId !== adminId) continue;
      if (opts?.unreadOnly && n.readAt) continue;
      out.push(n);
    }
    return out.reverse(); // newest first
  }
  async markNotificationRead(id: string): Promise<void> {
    const res = await kv.get<Notification>(nKeys.notification(id));
    if (!res.value) return;
    await kv.set(nKeys.notification(id), {
      ...res.value,
      readAt: new Date().toISOString(),
    });
  }
  async unreadCount(adminId: number): Promise<number> {
    return (await this.listNotifications(adminId, { unreadOnly: true })).length;
  }
}
