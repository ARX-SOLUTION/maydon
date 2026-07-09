/**
 * Main Application — Hono + grammY webhook + cron
 */

import { Hono } from "hono";
import { webhookCallback } from "grammy";
import adminApi from "./api/admin.ts";
import userApi from "./api/user.ts";
import { uiRouter } from "./ui/router.tsx";
import { bot } from "./bot/handlers.ts";
import { registerCronJobs } from "./cron.ts";
import {
  addAdmin,
  getAdmin,
  initDefaultSettings,
  migrateAdminRoles,
} from "./kv.ts";
import { roleFor } from "./models.ts";

const app = new Hono();

// Stable webhook secret derived from the bot token — lets us verify that webhook
// POSTs actually come from Telegram (the callback_query handler trusts from.id for
// admin actions, so forged updates could otherwise impersonate an admin). No extra config.
const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const webhookSecret = await (async () => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode("maydon-webhook:" + botToken),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
})();

// Initialize settings on startup
await initDefaultSettings();

// Add first admin from env (for bootstrap) as the owner, preserving their existing
// name/addedAt if already present so a restart doesn't reset them.
const adminId = Deno.env.get("ADMIN_TELEGRAM_ID");
const ownerId = adminId ? parseInt(adminId) : null;
if (ownerId !== null) {
  const existing = await getAdmin(ownerId);
  await addAdmin({
    telegramId: ownerId,
    name: existing?.name ?? "Admin",
    role: roleFor(ownerId, ownerId),
    addedAt: existing?.addedAt ?? new Date().toISOString(),
  });
  // Backfill role on any admins created before the role field existed (helpers).
  // Only runs with a known owner — an unset ADMIN_TELEGRAM_ID must NOT demote everyone.
  await migrateAdminRoles(ownerId);
}

// UI and Web routes
app.get("/", (c) => c.redirect("/app/user/week"));
app.route("/app", uiRouter);

// API routes
app.route("/api", userApi);
app.route("/api", adminApi);

// Webhook endpoint for Telegram bot.
// Uses grammY's Hono adapter (handles bot.init() internally — bot.handleUpdate()
// throws "Bot not initialized!" if called directly) and verifies the secret token.
app.post("/webhook", webhookCallback(bot, "hono", { secretToken: webhookSecret }));

// One-time webhook registration. Visit /webhook/setup?secret=<TELEGRAM_BOT_TOKEN>
// once after deploy. The URL is derived from the request host, so this can only ever
// point Telegram back at this same deployment.
app.get("/webhook/setup", async (c: any) => {
  if (c.req.query("secret") !== botToken) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const host = c.req.header("host");
  if (!host) return c.json({ error: "No host header" }, 400);
  const url = `https://${host}/webhook`;
  try {
    const ok = await bot.api.setWebhook(url, {
      secret_token: webhookSecret,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    });
    return c.json({ ok, webhook: url });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// Health check
app.get("/health", (c) => c.text("OK"));

// Register cron jobs
registerCronJobs();

export default app;
