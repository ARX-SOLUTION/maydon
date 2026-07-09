export interface User {
  telegramId: number;
  name: string;
  username?: string;
  phone?: string;
  isBlocked: boolean;
  isActive: boolean; // true once onboarding (phone + name) is complete
  onboardingStep?: "phone" | "name"; // what the bot is waiting for next
  createdAt: string; // ISO
}

export interface Settings {
  openTime: string; // "08:00"
  closeTime: string; // "23:00"
  horizonDays: number;
  minDurMin: number;
  maxDurMin: number;
  snapMin: number;
}

export type AdminRole = "owner" | "admin";

export interface Admin {
  telegramId: number;
  name: string;
  role: AdminRole; // "owner" = bootstrap admin, manages admins; "admin" = helper
  addedAt: string; // ISO
}

/**
 * The single rule that classifies an admin's role: whoever matches the configured
 * ADMIN_TELEGRAM_ID is the owner; every other admin is a helper. Kept pure (no KV)
 * so both bootstrap and the migration share it and it stays trivially testable.
 */
export function roleFor(
  telegramId: number,
  ownerId: number | null,
): AdminRole {
  return ownerId !== null && telegramId === ownerId ? "owner" : "admin";
}

export type BookingStatus = "pending" | "confirmed" | "rejected" | "expired" | "cancelled" | "completed";
export type BookingSource = "user" | "admin" | "recurring";

export interface Booking {
  id: string; // ulid
  userId: number | null; // null if admin created
  clientName?: string;
  clientPhone?: string;
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  status: BookingStatus;
  source: BookingSource;
  recurringId?: string;
  createdAt: string; // ISO
  decidedAt?: string; // ISO
  decidedBy?: number; // Admin Telegram ID for an admin decision
  decidedByName?: string; // Snapshot for audit visibility if the admin is renamed/removed
  inviteToken?: string; // For squad invitations
  participantIds?: number[]; // Array of user IDs who joined
}

export interface Recurring {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  clientName: string;
  phone?: string;
  active: boolean;
}
