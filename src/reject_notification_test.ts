Deno.env.set("KV_PATH", `maydon_kv_reject_notify_test_${Date.now()}`);
Deno.env.set("TELEGRAM_BOT_TOKEN", "test-token-for-reject-notify-spec");
import { bot } from "./bot/client.ts";

const sentMsgs: { chatId: number; text: string; options?: any }[] = [];
bot.api.sendMessage = (chatId: number, text: string, options?: any) => {
  sentMsgs.push({ chatId, text, options });
  return Promise.resolve({} as any);
};
bot.api.setMyCommands = () => Promise.resolve(true);
bot.api.getMe = () => Promise.resolve({ id: 12345, first_name: "TestBot", username: "test_bot", is_bot: true } as any);
bot.api.editMessageText = () => Promise.resolve({} as any);

import { assertEquals, assertStringIncludes } from "@std/assert";

const { kv, addAdmin, getBooking, initDefaultSettings, upsertSettings, upsertUser } = await import("./kv.ts");
const { addCalendarDays, createBooking, tashkentDate } = await import("./services/booking.ts");
const { default: app } = await import("./main.ts");

async function clearKv() {
  for await (const entry of kv.list({ prefix: [] })) await kv.delete(entry.key);
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
  params.set("auth_date", String(Math.floor(Date.now() / 1000)));
  params.set("hash", await signInitData(params));
  return "Bearer " + params.toString();
}

Deno.test(
  "POST /api/admin/bookings/:id/reject notifies the user with the day's free slots (issue #14 also applies to the Mini App, not just the bot inline buttons)",
  async () => {
    await clearKv();
    await initDefaultSettings();
    await upsertSettings({
      openTime: "08:00",
      closeTime: "23:00",
      horizonDays: 7,
      minDurMin: 60,
      maxDurMin: 180,
      snapMin: 30,
    });

    const adminId = 777001;
    await addAdmin({
      telegramId: adminId,
      name: "Admin",
      role: "owner",
      addedAt: new Date().toISOString(),
    });
    const userId = 777002;
    await upsertUser({
      telegramId: userId,
      name: "Client",
      isActive: true,
      isBlocked: false,
      approvalStatus: "approved",
      createdAt: new Date().toISOString(),
    });

    const createResult = await createBooking(
      userId,
      "Client",
      "+998900000000",
      addCalendarDays(tashkentDate(), 1),
      "12:00",
      "13:00",
      "user",
    );
    if (!createResult.success || !createResult.booking) {
      throw new Error("setup: booking creation failed");
    }

    const adminAuth = await getAuthHeader(adminId, "Admin");
    const res = await app.request(`/api/admin/bookings/${createResult.booking.id}/reject`, {
      method: "POST",
      headers: { Authorization: adminAuth },
    });

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.success, true);

    assertEquals(sentMsgs.length, 1);
    assertEquals(sentMsgs[0].chatId, userId);
    assertStringIncludes(sentMsgs[0].text, "Rad etildi");
    assertStringIncludes(sentMsgs[0].text, "bo'sh vaqtlar");
  },
);

Deno.test(
  "POST /api/admin/bookings/:id/reject with a body reason stores it on the booking and uses it in the notification",
  async () => {
    await clearKv();
    await initDefaultSettings();
    await upsertSettings({
      openTime: "08:00",
      closeTime: "23:00",
      horizonDays: 7,
      minDurMin: 60,
      maxDurMin: 180,
      snapMin: 30,
    });

    const adminId = 777003;
    await addAdmin({
      telegramId: adminId,
      name: "Admin",
      role: "owner",
      addedAt: new Date().toISOString(),
    });
    const userId = 777004;
    await upsertUser({
      telegramId: userId,
      name: "Client",
      isActive: true,
      isBlocked: false,
      approvalStatus: "approved",
      createdAt: new Date().toISOString(),
    });

    const createResult = await createBooking(
      userId,
      "Client",
      "+998900000001",
      addCalendarDays(tashkentDate(), 1),
      "14:00",
      "15:00",
      "user",
    );
    if (!createResult.success || !createResult.booking) {
      throw new Error("setup: booking creation failed");
    }

    sentMsgs.length = 0;
    const adminAuth = await getAuthHeader(adminId, "Admin");
    const res = await app.request(`/api/admin/bookings/${createResult.booking.id}/reject`, {
      method: "POST",
      headers: { Authorization: adminAuth, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Vaqt mavjud emas" }),
    });

    assertEquals(res.status, 200);
    assertEquals((await res.json()).success, true);

    const stored = await getBooking(createResult.booking.id);
    assertEquals(stored?.status, "rejected");
    assertEquals(stored?.rejectionReason, "Vaqt mavjud emas");

    assertEquals(sentMsgs.length, 1);
    assertStringIncludes(sentMsgs[0].text, "Vaqt mavjud emas");
  },
);
