import { assertEquals } from "@std/assert";
import { Hono } from "hono";
import { authMiddleware } from "./auth.ts";

// Isolated from the real bot token — this test signs its own initData.
Deno.env.set("TELEGRAM_BOT_TOKEN", "test-token-for-auth-spec");

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

function testApp() {
  const app = new Hono();
  app.use("/*", authMiddleware());
  app.get("/ping", (c) => c.json({ ok: true }));
  return app;
}

Deno.test("authMiddleware — missing Authorization header returns 401, not 500", async () => {
  const res = await testApp().request("/ping");
  assertEquals(res.status, 401);
});

Deno.test("authMiddleware — invalid signature returns 401, not 500", async () => {
  const res = await testApp().request("/ping", {
    headers: { Authorization: "Bearer user=%7B%22id%22%3A1%7D&auth_date=1&hash=deadbeef" },
  });
  assertEquals(res.status, 401);
});

Deno.test("authMiddleware — correctly signed initData returns 200", async () => {
  const params = new URLSearchParams();
  params.set("user", JSON.stringify({ id: 42, first_name: "Test" }));
  params.set("auth_date", "1700000000");
  params.set("hash", await signInitData(params));

  const res = await testApp().request("/ping", {
    headers: { Authorization: "Bearer " + params.toString() },
  });
  assertEquals(res.status, 200);
});
