Deno.env.set("KV_PATH", `maydon_kv_tzanchor_test_${Date.now()}`);
Deno.env.set("TELEGRAM_BOT_TOKEN", "test-token-for-tzanchor-spec");
import { bot } from "./bot/client.ts";

bot.api.sendMessage = () => Promise.resolve({} as any);
bot.api.setMyCommands = () => Promise.resolve(true);
bot.api.getMe = () => Promise.resolve({ id: 12345, first_name: "TestBot", username: "test_bot", is_bot: true } as any);

import { assertEquals, assertStringIncludes } from "@std/assert";

const { addAdmin, initDefaultSettings } = await import("./kv.ts");
const { tashkentDate } = await import("./services/booking.ts");
const { default: app } = await import("./main.ts");

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
  "Week/Schedule 'today' anchor uses Tashkent time, not the server process's local timezone",
  async () => {
    // 21:30 UTC on the 12th is already 02:30 on the 13th in Tashkent (UTC+5).
    // A server whose local clock is UTC (as Deno Deploy's is) must not treat
    // the 12th as "today" — but toYmd(new Date()) used to do exactly that.
    const frozenIso = "2026-07-12T21:30:00.000Z";
    const tashkentToday = "2026-07-13";
    const staleUtcToday = "2026-07-12";

    const RealDate = Date;
    // deno-lint-ignore no-explicit-any
    function FrozenDate(...args: any[]): Date {
      return Reflect.construct(RealDate, args.length === 0 ? [frozenIso] : args, FrozenDate);
    }
    FrozenDate.prototype = RealDate.prototype;
    // Date's statics are non-enumerable, so Object.assign won't copy them — list explicitly.
    FrozenDate.UTC = RealDate.UTC;
    FrozenDate.parse = RealDate.parse;
    FrozenDate.now = () => new RealDate(frozenIso).getTime();
    const originalTz = Deno.env.get("TZ");
    Deno.env.set("TZ", "UTC");
    // deno-lint-ignore no-global-assign
    Date = FrozenDate as unknown as DateConstructor;

    try {
      assertEquals(tashkentDate(), tashkentToday);

      await initDefaultSettings();
      const adminId = 555001;
      await addAdmin({
        telegramId: adminId,
        name: "Admin",
        role: "owner",
        addedAt: new RealDate().toISOString(),
      });

      const adminAuth = await getAuthHeader(adminId, "Admin");
      const scheduleRes = await app.request("/app/admin/schedule", {
        headers: { Authorization: adminAuth },
      });
      assertEquals(scheduleRes.status, 200);
      const scheduleHtml = await scheduleRes.text();
      assertStringIncludes(scheduleHtml, `value="${tashkentToday}"`);
      assertEquals(scheduleHtml.includes(staleUtcToday), false);

      const userAuth = await getAuthHeader(555002, "User");
      const weekRes = await app.request("/app/user/week", {
        headers: { Authorization: userAuth },
      });
      assertEquals(weekRes.status, 200);
      const weekHtml = await weekRes.text();
      assertStringIncludes(weekHtml, `week?date=${tashkentToday}`);
      assertEquals(weekHtml.includes(staleUtcToday), false);
    } finally {
      // deno-lint-ignore no-global-assign
      Date = RealDate;
      if (originalTz === undefined) Deno.env.delete("TZ");
      else Deno.env.set("TZ", originalTz);
    }
  },
);
