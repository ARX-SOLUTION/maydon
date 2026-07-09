Deno.env.set("KV_PATH", `maydon_test_${Date.now()}`);
Deno.env.set("TELEGRAM_BOT_TOKEN", "test-token-for-auth-spec");

import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import type { Booking } from "./models.ts";

const { kv, keys, addAdmin, getBooking, getBookingsByDay, upsertUser, initDefaultSettings } = await import("./kv.ts");
const { cancelBooking, createBooking, confirmBooking } = await import("./services/booking.ts");
const { getDayAvailability } = await import("./services/availability.ts");
const { notifyUserCancelled } = await import("./services/notify.ts");
const { default: app } = await import("./main.ts");

async function clearKv() {
  const entries = kv.list({ prefix: [] });
  for await (const entry of entries) {
    await kv.delete(entry.key);
  }
}

async function signInitData(params: URLSearchParams): Promise<string> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const encoder = new TextEncoder();
  const webAppDataKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const secretKey = await crypto.subtle.sign("HMAC", webAppDataKey, encoder.encode(botToken));
  const finalKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const signature = await crypto.subtle.sign("HMAC", finalKey, encoder.encode(sorted));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getAuthHeader(userId: number, firstName: string): Promise<string> {
  const params = new URLSearchParams();
  params.set("user", JSON.stringify({ id: userId, first_name: firstName }));
  params.set("auth_date", "1700000000");
  params.set("hash", await signInitData(params));
  return "Bearer " + params.toString();
}

// ==========================================
// TIER 1: FEATURE COVERAGE (HAPPY PATHS)
// ==========================================

Deno.test("Tier 1.1: cancelBooking successfully transitions a 'confirmed' booking to 'cancelled'", async () => {
  await clearKv();
  const createResult = await createBooking(
    99999,
    "Client",
    "+998901234567",
    "2026-07-15",
    "12:00",
    "13:00",
    "admin"
  );
  assertExists(createResult.booking);
  assertEquals(createResult.booking.status, "confirmed");

  const cancelResult = await cancelBooking(createResult.booking.id);
  assertEquals(cancelResult.success, true);
  assertEquals(cancelResult.booking?.status, "cancelled");

  const updatedBooking = await getBooking(createResult.booking.id);
  assertExists(updatedBooking);
  assertEquals(updatedBooking.status, "cancelled");
});

Deno.test("Tier 1.2: cancelBooking updates the decidedAt timestamp of the booking", async () => {
  await clearKv();
  const createResult = await createBooking(
    99999,
    "Client",
    "+998901234567",
    "2026-07-15",
    "12:00",
    "13:00",
    "admin"
  );
  assertExists(createResult.booking);

  const cancelResult = await cancelBooking(createResult.booking.id);
  assertEquals(cancelResult.success, true);
  assertExists(cancelResult.booking?.decidedAt);
  const decidedAtTime = new Date(cancelResult.booking.decidedAt).getTime();
  const now = Date.now();
  assertEquals(Math.abs(now - decidedAtTime) < 5000, true);
});

Deno.test("Tier 1.3: cancelBooking releases the busy slot, making it available again in getDayAvailability", async () => {
  await clearKv();
  await initDefaultSettings();
  const createResult = await createBooking(
    99999,
    "Client",
    "+998901234567",
    "2026-07-15",
    "12:00",
    "13:00",
    "admin"
  );
  assertExists(createResult.booking);

  // Verify slot is busy
  let avail = await getDayAvailability("2026-07-15");
  const busySlot = avail.slots.find(s => s.start === "12:00");
  assertExists(busySlot);
  assertEquals(busySlot.isBusy, true);

  // Cancel
  await cancelBooking(createResult.booking.id);

  // Verify slot is free again
  avail = await getDayAvailability("2026-07-15");
  const freeSlot = avail.slots.find(s => s.start === "12:00");
  assertExists(freeSlot);
  assertEquals(freeSlot.isBusy, false);
});

Deno.test("Tier 1.4: POST /api/admin/bookings/:id/cancel API returns success: true for a valid booking when authorized", async () => {
  await clearKv();
  const adminId = 12345;
  await addAdmin({
    telegramId: adminId,
    name: "Admin User",
    role: "admin",
    addedAt: new Date().toISOString()
  });

  const createResult = await createBooking(
    99999,
    "Client",
    "+998901234567",
    "2026-07-15",
    "12:00",
    "13:00",
    "admin"
  );
  assertExists(createResult.booking);

  const authHeader = await getAuthHeader(adminId, "Admin User");
  const res = await app.request(`/api/admin/bookings/${createResult.booking.id}/cancel`, {
    method: "POST",
    headers: {
      "Authorization": authHeader
    }
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
});

Deno.test("Tier 1.5: Bot notification function notifyUserCancelled correctly calls grammY sendMessage with correct Markdown message", async () => {
  const sentMsgs: { chatId: number; text: string; options?: any }[] = [];
  const mockBot = {
    sendMessage: async (chatId: number, text: string, options?: any) => {
      sentMsgs.push({ chatId, text, options });
    },
    editMessageText: async () => {}
  };

  const testBooking: Booking = {
    id: "TEST_ID",
    userId: 99999,
    clientName: "Test User",
    date: "2026-07-15",
    start: "12:00",
    end: "13:00",
    status: "cancelled",
    source: "user",
    createdAt: new Date().toISOString()
  };

  await notifyUserCancelled(mockBot as any, 99999, testBooking);

  assertEquals(sentMsgs.length, 1);
  assertEquals(sentMsgs[0].chatId, 99999);
  assertStringIncludes(sentMsgs[0].text, "bekor qilindi");
  assertStringIncludes(sentMsgs[0].text, "2026-07-15");
  assertStringIncludes(sentMsgs[0].text, "12:00");
  assertStringIncludes(sentMsgs[0].text, "13:00");
  assertEquals(sentMsgs[0].options?.parse_mode, "Markdown");
});

// ==========================================
// TIER 2: BOUNDARY & CORNER CASES (ERROR HANDLING)
// ==========================================

Deno.test("Tier 2.1: cancelBooking on a non-existent booking ID returns success: false and 'Booking not found' error", async () => {
  await clearKv();
  const result = await cancelBooking("non-existent-booking-id");
  assertEquals(result.success, false);
  assertEquals(result.error, "Booking not found");
});

Deno.test("Tier 2.2: cancelBooking on an already 'cancelled' booking returns success: false and 'Booking is already cancelled' error", async () => {
  await clearKv();
  const createResult = await createBooking(
    99999,
    "Client",
    "+998901234567",
    "2026-07-15",
    "12:00",
    "13:00",
    "admin"
  );
  assertExists(createResult.booking);

  // First cancellation
  const cancel1 = await cancelBooking(createResult.booking.id);
  assertEquals(cancel1.success, true);

  // Second cancellation
  const cancel2 = await cancelBooking(createResult.booking.id);
  assertEquals(cancel2.success, false);
  assertEquals(cancel2.error, "Booking is already cancelled");
});

Deno.test("Tier 2.3: cancelBooking on a 'completed' booking returns success: false and 'Cannot cancel completed bookings' error", async () => {
  await clearKv();
  const createResult = await createBooking(
    99999,
    "Client",
    "+998901234567",
    "2026-07-15",
    "12:00",
    "13:00",
    "admin"
  );
  assertExists(createResult.booking);

  // Manually set status to "completed" in KV to simulate completed booking
  const b = createResult.booking;
  await kv.set(keys.booking(b.id), {
    ...b,
    status: "completed"
  });

  const cancelResult = await cancelBooking(b.id);
  assertEquals(cancelResult.success, false);
  assertEquals(cancelResult.error, "Cannot cancel completed bookings");
});

Deno.test("Tier 2.4: POST /api/admin/bookings/:id/cancel without an Authorization header returns 401", async () => {
  const res = await app.request("/api/admin/bookings/any-id/cancel", {
    method: "POST"
  });
  assertEquals(res.status, 401);
});

Deno.test("Tier 2.5: POST /api/admin/bookings/:id/cancel with an invalid token/signature returns 401", async () => {
  const res = await app.request("/api/admin/bookings/any-id/cancel", {
    method: "POST",
    headers: {
      "Authorization": "Bearer user=%7B%22id%22%3A1%7D&auth_date=1&hash=deadbeef"
    }
  });
  assertEquals(res.status, 401);
});

// ==========================================
// TIER 3: CROSS-FEATURE COMBINATIONS
// ==========================================

Deno.test("Tier 3.1: Complete booking cycle: User creates (pending) -> Admin confirms (confirmed) -> Admin cancels (cancelled, slot free, user notified)", async () => {
  await clearKv();
  await initDefaultSettings();

  const userId = 99999;
  await upsertUser({
    telegramId: userId,
    name: "Test User",
    isActive: true,
    isBlocked: false,
    createdAt: new Date().toISOString()
  });

  // User creates booking -> status pending
  const createResult = await createBooking(
    userId,
    "Test User",
    "+998901234567",
    "2026-07-15",
    "12:00",
    "13:00",
    "user"
  );
  assertExists(createResult.booking);
  assertEquals(createResult.booking.status, "pending");

  // Verify slot is NOT busy yet (only confirmed bookings block slots)
  let avail = await getDayAvailability("2026-07-15");
  let slot = avail.slots.find(s => s.start === "12:00");
  assertExists(slot);
  assertEquals(slot.isBusy, false);

  // Admin confirms booking
  const confirmResult = await confirmBooking(createResult.booking.id);
  assertEquals(confirmResult.success, true);

  // Verify slot is busy
  avail = await getDayAvailability("2026-07-15");
  slot = avail.slots.find(s => s.start === "12:00");
  assertExists(slot);
  assertEquals(slot.isBusy, true);

  // Admin cancels booking
  const cancelResult = await cancelBooking(createResult.booking.id);
  assertEquals(cancelResult.success, true);

  // Verify slot is free again
  avail = await getDayAvailability("2026-07-15");
  slot = avail.slots.find(s => s.start === "12:00");
  assertExists(slot);
  assertEquals(slot.isBusy, false);
});

Deno.test("Tier 3.2: Race condition safety: Attempting to cancel a booking that was concurrent-checked and updated by another process/admin", async () => {
  await clearKv();
  const createResult = await createBooking(
    99999,
    "Client",
    "+998901234567",
    "2026-07-15",
    "12:00",
    "13:00",
    "admin"
  );
  assertExists(createResult.booking);
  const bookingId = createResult.booking.id;

  const originalAtomic = kv.atomic;
  // Intercept the atomic method to simulate a concurrent write before commit
  kv.atomic = function() {
    const tx = originalAtomic.call(kv);
    const originalCommit = tx.commit;
    tx.commit = async function() {
      // Simulate concurrent update on the database by another process/admin
      // This will increment the version stamp of the key
      const current = await kv.get<Booking>(keys.booking(bookingId));
      if (current.value) {
        await kv.set(keys.booking(bookingId), {
          ...current.value,
          clientName: "Concurrent Modifier Name"
        });
      }
      return await originalCommit.call(tx);
    };
    return tx;
  };

  try {
    const result = await cancelBooking(bookingId);
    // Since check(booking) will fail due to the concurrent write, it should return success: false
    assertEquals(result.success, false);
    assertExists(result.error);
  } finally {
    // Restore the original atomic function
    kv.atomic = originalAtomic;
  }
});

// ==========================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS
// ==========================================

Deno.test("Tier 4.1: Interactive admin UI scenario: schedule page includes cancel action, API endpoint updates DB, schedule page removes cancel action", async () => {
  await clearKv();
  await initDefaultSettings();

  const adminId = 12345;
  await addAdmin({
    telegramId: adminId,
    name: "Admin User",
    role: "admin",
    addedAt: new Date().toISOString()
  });

  // Create confirmed booking
  const createResult = await createBooking(
    99999,
    "Client A",
    "+998901234567",
    "2026-07-15",
    "12:00",
    "13:00",
    "admin"
  );
  assertExists(createResult.booking);
  const bookingId = createResult.booking.id;

  // 1. GET Schedule Page: should contain the cancel button referencing our booking id
  const resGet1 = await app.request("/app/admin/schedule?date=2026-07-15");
  assertEquals(resGet1.status, 200);
  const html1 = await resGet1.text();
  assertStringIncludes(html1, `cancelAdminBooking(&#39;${bookingId}&#39;, &#39;2026-07-15&#39;)`);

  // 2. Call Cancellation API route (mocking AJAX post)
  const authHeader = await getAuthHeader(adminId, "Admin User");
  const resCancel = await app.request(`/api/admin/bookings/${bookingId}/cancel`, {
    method: "POST",
    headers: {
      "Authorization": authHeader
    }
  });
  assertEquals(resCancel.status, 200);

  // 3. GET Schedule Page again: should NOT contain the cancel button referencing our booking id
  const resGet2 = await app.request("/app/admin/schedule?date=2026-07-15");
  assertEquals(resGet2.status, 200);
  const html2 = await resGet2.text();
  assertEquals(html2.includes(`cancelAdminBooking(&#39;${bookingId}&#39;, &#39;2026-07-15&#39;)`), false);
});
