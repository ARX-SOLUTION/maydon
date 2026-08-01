/**
 * MemoryRepo — In-memory implementation of the Repo seam for ultra-fast tests.
 */

import { ulid } from "ulid";
import type { Admin, Booking, Recurring, Settings, User } from "../models.ts";
import type {
  BookingEvent,
  NewNotification,
  Notification,
  Repo,
} from "./repo.ts";

export class MemoryRepo implements Repo {
  private settings: Settings | null = null;
  private users = new Map<number, User>();
  private admins = new Map<number, Admin>();
  private bookings = new Map<string, Booking>();
  private recurring = new Map<string, Recurring>();
  private inviteTokens = new Map<string, { createdBy: number; createdAt: string }>();
  private events: BookingEvent[] = [];
  private notifications = new Map<string, Notification>();

  // Settings
  async getSettings(): Promise<Settings | null> {
    return this.settings;
  }
  async upsertSettings(settings: Settings): Promise<void> {
    this.settings = { ...settings };
  }

  // Users
  async getUser(telegramId: number): Promise<User | null> {
    return this.users.get(telegramId) ? { ...this.users.get(telegramId)! } : null;
  }
  async upsertUser(user: User): Promise<void> {
    this.users.set(user.telegramId, { ...user });
  }
  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values()).map((u) => ({ ...u }));
  }

  // Admins
  async getAdmin(telegramId: number): Promise<Admin | null> {
    return this.admins.get(telegramId) ? { ...this.admins.get(telegramId)! } : null;
  }
  async addAdmin(admin: Admin): Promise<void> {
    this.admins.set(admin.telegramId, { ...admin });
  }
  async removeAdmin(telegramId: number): Promise<void> {
    this.admins.delete(telegramId);
  }
  async listAdmins(): Promise<Admin[]> {
    return Array.from(this.admins.values()).map((a) => ({ ...a }));
  }

  // Bookings
  async getBooking(id: string): Promise<Booking | null> {
    return this.bookings.get(id) ? { ...this.bookings.get(id)! } : null;
  }
  async createBooking(booking: Booking): Promise<void> {
    if (this.bookings.has(booking.id)) {
      throw new Error(`Booking ${booking.id} already exists`);
    }
    this.bookings.set(booking.id, { ...booking });
  }
  async updateBooking(booking: Booking): Promise<void> {
    if (!this.bookings.has(booking.id)) {
      throw new Error(`Booking ${booking.id} not found`);
    }
    this.bookings.set(booking.id, { ...booking });
  }
  async bookingsByDay(date: string): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter((b) => b.date === date)
      .map((b) => ({ ...b }));
  }
  async bookingsByUser(telegramId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter((b) => b.userId === telegramId)
      .map((b) => ({ ...b }));
  }
  async pendingBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values())
      .filter((b) => b.status === "pending")
      .map((b) => ({ ...b }));
  }

  // Recurring
  async getRecurring(id: string): Promise<Recurring | null> {
    return this.recurring.get(id) ? { ...this.recurring.get(id)! } : null;
  }
  async listRecurring(): Promise<Recurring[]> {
    return Array.from(this.recurring.values()).map((r) => ({ ...r }));
  }
  async upsertRecurring(recurring: Recurring): Promise<void> {
    this.recurring.set(recurring.id, { ...recurring });
  }
  async deleteRecurring(id: string): Promise<void> {
    this.recurring.delete(id);
  }

  // Invite Tokens
  async createInviteToken(token: string, createdBy: number): Promise<void> {
    this.inviteTokens.set(token, {
      createdBy,
      createdAt: new Date().toISOString(),
    });
  }
  async consumeInviteToken(token: string): Promise<boolean> {
    if (!this.inviteTokens.has(token)) return false;
    this.inviteTokens.delete(token);
    return true;
  }

  // Booking Audit Trail
  async addBookingEvent(event: Omit<BookingEvent, "id" | "at">): Promise<void> {
    const id = ulid();
    this.events.push({ ...event, id, at: new Date().toISOString() });
  }
  async bookingEvents(bookingId: string): Promise<BookingEvent[]> {
    return this.events.filter((e) => e.bookingId === bookingId).map((e) => ({ ...e }));
  }

  // Notifications
  async createNotification(n: NewNotification): Promise<void> {
    const id = ulid();
    this.notifications.set(id, { ...n, id, createdAt: new Date().toISOString() });
  }
  async listNotifications(
    adminId: number,
    opts?: { unreadOnly?: boolean },
  ): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.targetAdminId == null || n.targetAdminId === adminId)
      .filter((n) => !opts?.unreadOnly || !n.readAt)
      .reverse();
  }
  async markNotificationRead(id: string): Promise<void> {
    const n = this.notifications.get(id);
    if (n) {
      n.readAt = new Date().toISOString();
    }
  }
  async unreadCount(adminId: number): Promise<number> {
    return (await this.listNotifications(adminId, { unreadOnly: true })).length;
  }

  // Helper to clear state between test runs
  clear(): void {
    this.settings = null;
    this.users.clear();
    this.admins.clear();
    this.bookings.clear();
    this.recurring.clear();
    this.inviteTokens.clear();
    this.events = [];
    this.notifications.clear();
  }
}
