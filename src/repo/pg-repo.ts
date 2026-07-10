/**
 * Postgres-backed Repo (Prisma). Mirrors kv-repo.ts behind the same interface.
 * Conversions: BigInt columns <-> number domain ids; DateTime <-> ISO string;
 * SQL null <-> undefined for optional domain fields.
 */
import type { Admin, Booking, Recurring, Settings, User } from "../models.ts";
import type {
  BookingEvent,
  NewNotification,
  Notification,
  Repo,
} from "./repo.ts";
import { prisma } from "../../lib/prisma.ts";
import type {
  AdminModel,
  BookingEventModel,
  BookingModel,
  NotificationModel,
  RecurringModel,
  UserModel,
} from "../../generated/prisma/models.ts";

const toBig = (n: number | null | undefined): bigint | null =>
  n == null ? null : BigInt(n);
const fromBig = (b: bigint | null): number | undefined =>
  b == null ? undefined : Number(b);

const toUser = (r: UserModel): User => ({
  telegramId: Number(r.telegramId),
  name: r.name,
  username: r.username ?? undefined,
  phone: r.phone ?? undefined,
  isBlocked: r.isBlocked,
  isActive: r.isActive,
  onboardingStep: (r.onboardingStep ?? undefined) as User["onboardingStep"],
  approvalStatus: r.approvalStatus,
  approvalDecidedBy: r.approvalDecidedBy == null ? undefined : Number(r.approvalDecidedBy),
  approvalDecidedByName: r.approvalDecidedByName ?? undefined,
  approvalDecidedAt: r.approvalDecidedAt?.toISOString(),
  createdAt: r.createdAt.toISOString(),
});

const toAdmin = (r: AdminModel): Admin => ({
  telegramId: Number(r.telegramId),
  name: r.name,
  role: r.role,
  addedAt: r.addedAt.toISOString(),
});

const toBooking = (r: BookingModel): Booking => ({
  id: r.id,
  userId: r.userId == null ? null : Number(r.userId),
  clientName: r.clientName ?? undefined,
  clientPhone: r.clientPhone ?? undefined,
  date: r.date,
  start: r.start,
  end: r.end,
  status: r.status,
  source: r.source,
  recurringId: r.recurringId ?? undefined,
  createdAt: r.createdAt.toISOString(),
  decidedAt: r.decidedAt?.toISOString(),
  decidedBy: fromBig(r.decidedBy),
  decidedByName: r.decidedByName ?? undefined,
  inviteToken: r.inviteToken ?? undefined,
  participantIds: r.participantIds.map(Number),
});

const bookingData = (b: Booking) => ({
  id: b.id,
  userId: toBig(b.userId),
  clientName: b.clientName ?? null,
  clientPhone: b.clientPhone ?? null,
  date: b.date,
  start: b.start,
  end: b.end,
  status: b.status,
  source: b.source,
  recurringId: b.recurringId ?? null,
  createdAt: new Date(b.createdAt),
  decidedAt: b.decidedAt ? new Date(b.decidedAt) : null,
  decidedBy: toBig(b.decidedBy),
  decidedByName: b.decidedByName ?? null,
  inviteToken: b.inviteToken ?? null,
  participantIds: (b.participantIds ?? []).map((id) => BigInt(id)),
});

const toRecurring = (r: RecurringModel): Recurring => ({
  id: r.id,
  dayOfWeek: r.dayOfWeek,
  startTime: r.startTime,
  endTime: r.endTime,
  clientName: r.clientName,
  phone: r.phone ?? undefined,
  active: r.active,
});

const toNotification = (r: NotificationModel): Notification => ({
  id: r.id,
  type: r.type,
  title: r.title,
  body: r.body ?? undefined,
  bookingId: r.bookingId ?? undefined,
  targetAdminId: fromBig(r.targetAdminId),
  createdAt: r.createdAt.toISOString(),
  readAt: r.readAt?.toISOString(),
});

const toBookingEvent = (r: BookingEventModel): BookingEvent => ({
  id: r.id,
  bookingId: r.bookingId,
  fromStatus: r.fromStatus ?? undefined,
  toStatus: r.toStatus,
  actorId: fromBig(r.actorId),
  at: r.at.toISOString(),
});

export class PgRepo implements Repo {
  // ── Settings (singleton id=1) ──
  async getSettings(): Promise<Settings | null> {
    const r = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!r) return null;
    const { id: _id, ...s } = r;
    return s;
  }
  async upsertSettings(s: Settings): Promise<void> {
    await prisma.settings.upsert({
      where: { id: 1 },
      create: { id: 1, ...s },
      update: { ...s },
    });
  }

  // ── Users ──
  async getUser(telegramId: number): Promise<User | null> {
    const r = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    return r ? toUser(r) : null;
  }
  async upsertUser(u: User): Promise<void> {
    const data = {
      name: u.name,
      username: u.username ?? null,
      phone: u.phone ?? null,
      isBlocked: u.isBlocked,
      isActive: u.isActive,
      onboardingStep: u.onboardingStep ?? null,
      approvalStatus: u.approvalStatus ?? "pending",
      approvalDecidedBy: toBig(u.approvalDecidedBy),
      approvalDecidedByName: u.approvalDecidedByName ?? null,
      approvalDecidedAt: u.approvalDecidedAt ? new Date(u.approvalDecidedAt) : null,
      createdAt: new Date(u.createdAt),
    };
    await prisma.user.upsert({
      where: { telegramId: BigInt(u.telegramId) },
      create: { telegramId: BigInt(u.telegramId), ...data },
      update: data,
    });
  }
  async listUsers(): Promise<User[]> {
    return (await prisma.user.findMany()).map(toUser);
  }

  // ── Admins ──
  async getAdmin(telegramId: number): Promise<Admin | null> {
    const r = await prisma.admin.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    return r ? toAdmin(r) : null;
  }
  async addAdmin(a: Admin): Promise<void> {
    const data = { name: a.name, role: a.role, addedAt: new Date(a.addedAt) };
    await prisma.admin.upsert({
      where: { telegramId: BigInt(a.telegramId) },
      create: { telegramId: BigInt(a.telegramId), ...data },
      update: data,
    });
  }
  async removeAdmin(telegramId: number): Promise<void> {
    try {
      await prisma.admin.delete({ where: { telegramId: BigInt(telegramId) } });
    } catch { /* not found */ }
  }
  async listAdmins(): Promise<Admin[]> {
    return (await prisma.admin.findMany()).map(toAdmin);
  }

  // ── Bookings ──
  async getBooking(id: string): Promise<Booking | null> {
    const r = await prisma.booking.findUnique({ where: { id } });
    return r ? toBooking(r) : null;
  }
  async createBooking(b: Booking): Promise<void> {
    await prisma.booking.create({ data: bookingData(b) });
  }
  async updateBooking(b: Booking): Promise<void> {
    await prisma.booking.update({ where: { id: b.id }, data: bookingData(b) });
  }
  async bookingsByDay(date: string): Promise<Booking[]> {
    return (await prisma.booking.findMany({ where: { date } })).map(toBooking);
  }
  async bookingsByUser(telegramId: number): Promise<Booking[]> {
    return (await prisma.booking.findMany({
      where: { userId: BigInt(telegramId) },
    })).map(toBooking);
  }
  async pendingBookings(): Promise<Booking[]> {
    return (await prisma.booking.findMany({ where: { status: "pending" } }))
      .map(toBooking);
  }

  // ── Recurring ──
  async getRecurring(id: string): Promise<Recurring | null> {
    const r = await prisma.recurring.findUnique({ where: { id } });
    return r ? toRecurring(r) : null;
  }
  async listRecurring(): Promise<Recurring[]> {
    return (await prisma.recurring.findMany()).map(toRecurring);
  }
  async upsertRecurring(rec: Recurring): Promise<void> {
    const data = {
      dayOfWeek: rec.dayOfWeek,
      startTime: rec.startTime,
      endTime: rec.endTime,
      clientName: rec.clientName,
      phone: rec.phone ?? null,
      active: rec.active,
    };
    await prisma.recurring.upsert({
      where: { id: rec.id },
      create: { id: rec.id, ...data },
      update: data,
    });
  }
  async deleteRecurring(id: string): Promise<void> {
    try {
      await prisma.recurring.delete({ where: { id } });
    } catch { /* not found */ }
  }

  // ── Invite tokens ──
  async createInviteToken(token: string, createdBy: number): Promise<void> {
    await prisma.inviteToken.create({
      data: { token, createdBy: BigInt(createdBy) },
    });
  }
  async consumeInviteToken(token: string): Promise<boolean> {
    try {
      await prisma.inviteToken.delete({ where: { token } });
      return true;
    } catch {
      return false; // missing/already used (P2025)
    }
  }

  // ── Booking audit ──
  async addBookingEvent(e: Omit<BookingEvent, "id" | "at">): Promise<void> {
    await prisma.bookingEvent.create({
      data: {
        bookingId: e.bookingId,
        fromStatus: e.fromStatus ?? null,
        toStatus: e.toStatus,
        actorId: toBig(e.actorId),
      },
    });
  }
  async bookingEvents(bookingId: string): Promise<BookingEvent[]> {
    return (await prisma.bookingEvent.findMany({
      where: { bookingId },
      orderBy: { at: "asc" },
    })).map(toBookingEvent);
  }

  // ── Notification feed ──
  async createNotification(n: NewNotification): Promise<void> {
    await prisma.notification.create({
      data: {
        type: n.type,
        title: n.title,
        body: n.body ?? null,
        bookingId: n.bookingId ?? null,
        targetAdminId: toBig(n.targetAdminId),
      },
    });
  }
  async listNotifications(
    adminId: number,
    opts?: { unreadOnly?: boolean },
  ): Promise<Notification[]> {
    return (await prisma.notification.findMany({
      where: {
        OR: [{ targetAdminId: BigInt(adminId) }, { targetAdminId: null }],
        ...(opts?.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
    })).map(toNotification);
  }
  async markNotificationRead(id: string): Promise<void> {
    try {
      await prisma.notification.update({
        where: { id },
        data: { readAt: new Date() },
      });
    } catch { /* not found */ }
  }
  async unreadCount(adminId: number): Promise<number> {
    return await prisma.notification.count({
      where: {
        readAt: null,
        OR: [{ targetAdminId: BigInt(adminId) }, { targetAdminId: null }],
      },
    });
  }
}
