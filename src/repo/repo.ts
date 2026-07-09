/**
 * Storage repository — the seam that hides the storage engine.
 *
 * The whole app talks to this interface only. Swapping Deno KV → Postgres is then
 * one line (which implementation you construct), not the ~140 direct kv.ts call
 * sites scattered across the codebase. This is the deep module that makes the
 * KV→Postgres migration a strangler-fig swap instead of a big-bang rewrite.
 *
 * Domain types (User, Admin, Booking, Settings, Recurring) come from ../models.ts.
 * The two new scaling entities (Notification, BookingEvent) live here for now.
 */
import type { Admin, Booking, Recurring, Settings, User } from "../models.ts";

// In-app admin notification feed (bot DMs are separate; this powers a "notifications tab").
export interface Notification {
  id: string;
  type: string; // "new_request" | "cancelled" | "confirmed" | "rejected" | ...
  title: string;
  body?: string;
  bookingId?: string;
  targetAdminId?: number; // undefined = broadcast to all admins
  createdAt: string; // ISO
  readAt?: string; // ISO, undefined = unread
}

export interface NewNotification {
  type: string;
  title: string;
  body?: string;
  bookingId?: string;
  targetAdminId?: number;
}

// Audit trail of a booking's status transitions — powers user history + "who decided when".
export interface BookingEvent {
  id: string;
  bookingId: string;
  fromStatus?: Booking["status"];
  toStatus: Booking["status"];
  actorId?: number; // admin telegramId who acted; undefined for system/user
  at: string; // ISO
}

export interface Repo {
  // ── Settings (singleton) ─────────────────────────────────────────────
  getSettings(): Promise<Settings | null>;
  upsertSettings(settings: Settings): Promise<void>;

  // ── Users ────────────────────────────────────────────────────────────
  getUser(telegramId: number): Promise<User | null>;
  upsertUser(user: User): Promise<void>;
  listUsers(): Promise<User[]>;

  // ── Admins ───────────────────────────────────────────────────────────
  getAdmin(telegramId: number): Promise<Admin | null>;
  addAdmin(admin: Admin): Promise<void>;
  removeAdmin(telegramId: number): Promise<void>;
  listAdmins(): Promise<Admin[]>;

  // ── Bookings ─────────────────────────────────────────────────────────
  getBooking(id: string): Promise<Booking | null>;
  createBooking(booking: Booking): Promise<void>;
  updateBooking(booking: Booking): Promise<void>;
  bookingsByDay(date: string): Promise<Booking[]>;
  bookingsByUser(telegramId: number): Promise<Booking[]>;
  pendingBookings(): Promise<Booking[]>;

  // ── Recurring ────────────────────────────────────────────────────────
  getRecurring(id: string): Promise<Recurring | null>;
  listRecurring(): Promise<Recurring[]>;
  upsertRecurring(recurring: Recurring): Promise<void>;
  deleteRecurring(id: string): Promise<void>;

  // ── One-time admin invite tokens ─────────────────────────────────────
  createInviteToken(token: string, createdBy: number): Promise<void>;
  /** Returns true if the token existed and was consumed; false if missing/used. */
  consumeInviteToken(token: string): Promise<boolean>;

  // ── Booking audit / user history ─────────────────────────────────────
  addBookingEvent(event: Omit<BookingEvent, "id" | "at">): Promise<void>;
  bookingEvents(bookingId: string): Promise<BookingEvent[]>;

  // ── Admin notification feed ──────────────────────────────────────────
  createNotification(n: NewNotification): Promise<void>;
  listNotifications(
    adminId: number,
    opts?: { unreadOnly?: boolean },
  ): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  unreadCount(adminId: number): Promise<number>;
}
