import { assertEquals } from "@std/assert";
import { MemoryRepo } from "./memory-repo.ts";
import { repo, setRepo } from "./index.ts";
import type { Booking, Settings, User } from "../models.ts";

Deno.test("Storage Seam — MemoryRepo enforces contract parity", async () => {
  const mem = new MemoryRepo();
  setRepo(mem);

  // Settings
  const settings: Settings = {
    openTime: "08:00",
    closeTime: "23:00",
    minDurMin: 60,
    maxDurMin: 120,
    snapMin: 30,
    horizonDays: 14,
  };
  await repo.upsertSettings(settings);
  const loadedSettings = await repo.getSettings();
  assertEquals(loadedSettings, settings);

  // Users
  const user: User = {
    telegramId: 1001,
    name: "Ali Valiyev",
    phone: "+998901234567",
    isBlocked: false,
    isActive: true,
    approvalStatus: "approved",
    createdAt: new Date().toISOString(),
  };
  await repo.upsertUser(user);
  const loadedUser = await repo.getUser(1001);
  assertEquals(loadedUser?.name, "Ali Valiyev");

  // Bookings
  const booking: Booking = {
    id: "test-booking-1",
    userId: 1001,
    clientName: "Ali Valiyev",
    clientPhone: "+998901234567",
    date: "2026-08-01",
    start: "18:00",
    end: "19:00",
    status: "confirmed",
    source: "user",
    createdAt: new Date().toISOString(),
  };
  await repo.createBooking(booking);
  const loadedBooking = await repo.getBooking("test-booking-1");
  assertEquals(loadedBooking?.clientName, "Ali Valiyev");

  const dayBookings = await repo.bookingsByDay("2026-08-01");
  assertEquals(dayBookings.length, 1);
  assertEquals(dayBookings[0].id, "test-booking-1");
});
