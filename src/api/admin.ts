/**
 * API Routes — Admin endpoints
 */

import { Hono } from "hono";
import { authMiddleware, requireAdmin, requireOwner } from "../auth.ts";
import {
  getAdmin,
  getAllRecurring,
  getPendingRequests,
  getSettings,
  getUser,
  keys,
  kv,
  upsertSettings,
  upsertUser,
} from "../kv.ts";
import type { Admin } from "../models.ts";
import { bot } from "../bot/client.ts";
import {
  cancelBooking,
  confirmBooking,
  createBooking,
  rejectBooking,
} from "../services/booking.ts";
import {
  createRecurring,
  deleteRecurring,
  setRecurringActive,
} from "../services/recurring.ts";

const api = new Hono();

// Apply auth + admin check to all routes
api.use("/*", authMiddleware());
api.use("/*", requireAdmin());

// GET /api/admin/requests — Pending requests (FIFO)
api.get("/admin/requests", async (c: any) => {
  const requests = await getPendingRequests();

  // Sort by createdAt (FIFO)
  requests.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return c.json({
    requests: requests.map((b, idx) => ({
      id: b.id,
      userId: b.userId,
      clientName: b.clientName,
      clientPhone: b.clientPhone,
      date: b.date,
      start: b.start,
      end: b.end,
      status: b.status,
      createdAt: b.createdAt,
      queuePosition: idx + 1,
    })),
  });
});

// POST /api/admin/bookings — Create manual booking (admin for client)
api.post("/admin/bookings", async (c: any) => {
  const { clientName, clientPhone, date, start, end } = await c.req.json();

  if (!clientName || !date || !start || !end) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const result = await createBooking(
    null,
    clientName,
    clientPhone,
    date,
    start,
    end,
    "admin",
  );

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    success: true,
    booking: result.booking,
  });
});

// POST /api/admin/bookings/:id/confirm
api.post("/admin/bookings/:id/confirm", async (c: any) => {
  const id = c.req.param("id");
  const result = await confirmBooking(id);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Notify user
  try {
    const booking = await import("../kv.ts").then((m) => m.getBooking(id));
    const { notifyUserConfirmation } = await import("../bot/handlers.ts");
    await notifyUserConfirmation(booking!);
  } catch (e) {
    console.error("Failed to notify user:", e);
  }

  return c.json({ success: true });
});

// POST /api/admin/bookings/:id/reject
api.post("/admin/bookings/:id/reject", async (c: any) => {
  const id = c.req.param("id");
  await rejectBooking(id);

  // TODO: Notify user with alternative slots

  return c.json({ success: true });
});

// POST /api/admin/bookings/:id/cancel
api.post("/admin/bookings/:id/cancel", async (c: any) => {
  const id = c.req.param("id");
  await cancelBooking(id);

  // TODO: Notify admins about available slot

  return c.json({ success: true });
});

// GET /api/admin/recurring
api.get("/admin/recurring", async (c: any) => {
  const recurring = await getAllRecurring();
  recurring.sort((a, b) =>
    a.dayOfWeek - b.dayOfWeek ||
    a.startTime.localeCompare(b.startTime) ||
    a.clientName.localeCompare(b.clientName)
  );
  return c.json({ recurring });
});

// POST /api/admin/recurring
api.post("/admin/recurring", async (c: any) => {
  const { dayOfWeek, startTime, endTime, clientName, phone } = await c.req
    .json();

  if (
    dayOfWeek === undefined || dayOfWeek === null || !startTime || !endTime ||
    !clientName || !phone
  ) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const result = await createRecurring(
    dayOfWeek,
    startTime,
    endTime,
    clientName,
    phone,
  );

  return c.json(result);
});

// DELETE /api/admin/recurring/:id
api.delete("/admin/recurring/:id", async (c: any) => {
  const id = c.req.param("id");
  const mode = c.req.query("mode") ?? "series";
  await deleteRecurring(id, mode as "week" | "series");
  return c.json({ success: true });
});

// POST /api/admin/recurring/:id/active
api.post("/admin/recurring/:id/active", async (c: any) => {
  const id = c.req.param("id");
  const { active } = await c.req.json();
  const result = await setRecurringActive(id, Boolean(active));
  if (!result.success) {
    return c.json({ error: result.error }, 404);
  }
  return c.json(result);
});

// GET /api/admin/settings
api.get("/admin/settings", async (c: any) => {
  const settings = await getSettings();
  if (!settings) {
    return c.json({ error: "Settings not found" }, 404);
  }
  return c.json(settings);
});

// PUT /api/admin/settings
api.put("/admin/settings", async (c: any) => {
  const settings = await c.req.json();
  await upsertSettings(settings);
  return c.json({ success: true });
});

// POST /api/admin/users/:id/block
api.post("/admin/users/:id/block", async (c: any) => {
  const telegramId = parseInt(c.req.param("id"));

  let user = await getUser(telegramId);
  if (!user) {
    user = {
      telegramId,
      name: "Unknown",
      isBlocked: true,
      isActive: false,
      createdAt: new Date().toISOString(),
    };
  } else {
    user.isBlocked = true;
  }

  await upsertUser(user);
  return c.json({ success: true });
});

// ========== Admin management (owner-only) ==========

// GET /api/admin/admins — list admins (owner first)
api.get("/admin/admins", requireOwner(), async (c: any) => {
  const auth = c.get("auth");
  const admins: Admin[] = [];
  for await (const entry of kv.list<Admin>({ prefix: ["admins"] })) {
    admins.push(entry.value);
  }
  admins.sort((a, b) =>
    (a.role === "owner" ? 0 : 1) - (b.role === "owner" ? 0 : 1) ||
    a.addedAt.localeCompare(b.addedAt)
  );
  return c.json({ admins, me: auth.userId });
});

// POST /api/admin/admins/invite — one-time invite link
api.post("/admin/admins/invite", requireOwner(), async (c: any) => {
  const auth = c.get("auth");
  const token = crypto.randomUUID();
  await kv.set(keys.inviteToken(token), {
    createdBy: auth.userId,
    createdAt: new Date().toISOString(),
  });

  let botUsername = "";
  try {
    botUsername = (await bot.api.getMe()).username;
  } catch (e) {
    console.error("Failed to fetch bot username:", e);
  }

  return c.json({
    link: `https://t.me/${botUsername}?start=admin_${token}`,
    token,
  });
});

// DELETE /api/admin/admins/:id — remove a helper admin
api.delete("/admin/admins/:id", requireOwner(), async (c: any) => {
  const auth = c.get("auth");
  const id = parseInt(c.req.param("id"));

  const target = await getAdmin(id);
  if (!target) {
    return c.json({ error: "Admin topilmadi" }, 404);
  }
  if (target.role === "owner") {
    return c.json({ error: "Egani o'chirib bo'lmaydi" }, 400);
  }
  if (id === auth.userId) {
    return c.json({ error: "O'zingizni o'chirib bo'lmaydi" }, 400);
  }

  await kv.delete(keys.admin(id));

  // Best-effort DM the removed admin — never fail the request on this.
  try {
    await bot.api.sendMessage(
      id,
      "⚠️ Sizning adminlik huquqingiz bekor qilindi.",
    );
  } catch (e) {
    console.error("Failed to DM removed admin:", e);
  }

  return c.json({ success: true });
});

export default api;
