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

export interface Admin {
  telegramId: number;
  name: string;
  addedAt: string; // ISO
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
