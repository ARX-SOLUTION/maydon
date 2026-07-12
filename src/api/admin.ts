/**
 * API Routes — Admin endpoints
 */

import { Hono } from "hono";
import { authMiddleware, requireAdmin, requireOwner } from "../auth.ts";
import {
  decideUserApproval,
  getAdmin,
  getAllRecurring,
  getPendingRequests,
  getSettings,
  getUser,
  getAllUsers,
  getBookingsByUser,
  keys,
  kv,
  upsertSettings,
  upsertUser,
} from "../kv.ts";
import type { Admin, Settings } from "../models.ts";
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
  const auth = c.get("auth");
  const result = await confirmBooking(id, {
    id: auth.userId,
    name: auth.userName ?? "Admin",
  });

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // The decision is visible in the user's request history, including the acting
  // admin. Do not send a misleading standalone "confirmed" DM here.
  return c.json({ success: true });
});

// POST /api/admin/bookings/:id/reject
api.post("/admin/bookings/:id/reject", async (c: any) => {
  const id = c.req.param("id");
  const auth = c.get("auth");
  const existing = await import("../kv.ts").then((m) => m.getBooking(id));
  if (!existing) return c.json({ error: "Booking not found" }, 404);
  if (existing.status !== "pending") {
    return c.json({ error: "Booking is not pending" }, 400);
  }
  const result = await rejectBooking(id, { id: auth.userId, name: auth.userName ?? "Admin" });
  if (!result.success) return c.json({ error: result.error }, 400);

  if (result.booking) {
    try {
      const { freeAlternatives, notifyUserRejection } = await import("../bot/handlers.ts");
      const alternatives = await freeAlternatives(result.booking.date);
      await notifyUserRejection(result.booking, "So'rov tasdiqlanmadi", alternatives);
    } catch (e) {
      console.error("Failed to notify user about rejection:", e);
    }
  }

  return c.json({ success: true });
});

// POST /api/admin/bookings/:id/cancel
api.post("/admin/bookings/:id/cancel", async (c: any) => {
  const id = c.req.param("id");
  const auth = c.get("auth");
  const result = await cancelBooking(id, {
    id: auth.userId,
    name: auth.userName ?? "Admin",
  });

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Notify user
  if (result.booking) {
    try {
      const { notifyUserCancellation } = await import("../bot/handlers.ts");
      await notifyUserCancellation(result.booking);
    } catch (e) {
      console.error("Failed to notify user about cancellation:", e);
    }
  }

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
  const raw = await c.req.json();
  const settings: Settings = {
    openTime: String(raw.openTime ?? ""),
    closeTime: String(raw.closeTime ?? ""),
    horizonDays: Number(raw.horizonDays),
    minDurMin: Number(raw.minDurMin),
    maxDurMin: Number(raw.maxDurMin),
    snapMin: Number(raw.snapMin),
  };

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  const openMin = timePattern.test(settings.openTime)
    ? Number(settings.openTime.slice(0, 2)) * 60 + Number(settings.openTime.slice(3))
    : -1;
  const closeMin = timePattern.test(settings.closeTime)
    ? Number(settings.closeTime.slice(0, 2)) * 60 + Number(settings.closeTime.slice(3))
    : -1;
  const validSnap = Number.isInteger(settings.snapMin) && settings.snapMin > 0 && settings.snapMin <= 240;
  const validDuration = Number.isInteger(settings.minDurMin) && settings.minDurMin > 0 &&
    Number.isInteger(settings.maxDurMin) && settings.maxDurMin >= settings.minDurMin;
  const validHorizon = Number.isInteger(settings.horizonDays) && settings.horizonDays > 0 && settings.horizonDays <= 90;

  if (openMin < 0 || closeMin <= openMin || !validSnap || !validDuration || !validHorizon) {
    return c.json({ error: "Sozlamalar noto'g'ri: vaqt, davomiylik, qadam yoki gorizontni tekshiring" }, 400);
  }

  await upsertSettings(settings);
  return c.json({ success: true });
});

// GET /api/admin/users
api.get("/admin/users", async (c: any) => {
  const users = await getAllUsers();
  
  // Calculate reputation
  const reputationData = await Promise.all(
    users.map(async (user) => {
      const bookings = await getBookingsByUser(user.telegramId);
      const totalBookings = bookings.length;
      const noShows = bookings.filter((b) => b.status === "cancelled").length;
      return {
        ...user,
        totalBookings,
        noShows,
      };
    })
  );

  return c.json(reputationData);
});

async function notifyUserApprovalDecision(
  userId: number,
  status: "approved" | "rejected",
  actorName: string,
): Promise<void> {
  const text = status === "approved"
    ? `✅ Ro'yxatdan o'tishingiz tasdiqlandi.\n\nAdmin: ${actorName}\nEndi maydonni band qilishingiz mumkin.`
    : `❌ Ro'yxatdan o'tishingiz rad etildi.\n\nAdmin: ${actorName}\nQo'shimcha ma'lumot uchun administrator bilan bog'laning.`;
  try {
    await bot.api.sendMessage(userId, text);
  } catch (error) {
    console.error("Failed to notify user about approval decision:", error);
  }
}

async function decideUser(c: any, status: "approved" | "rejected") {
  const telegramId = Number(c.req.param("id"));
  if (!Number.isSafeInteger(telegramId) || telegramId <= 0) {
    return c.json({ error: "Foydalanuvchi ID noto'g'ri" }, 400);
  }
  const auth = c.get("auth");
  const user = await getUser(telegramId);
  if (!user) return c.json({ error: "Foydalanuvchi topilmadi" }, 404);
  if (!user.isActive) {
    return c.json({ error: "Foydalanuvchi ro'yxatdan o'tishni yakunlamagan" }, 400);
  }

  const actorName = auth.userName ?? "Admin";
  const result = await decideUserApproval(telegramId, status, {
    id: auth.userId,
    name: actorName,
  });
  if (!result.success) {
    return c.json({ error: result.error, user: result.user }, 409);
  }
  await notifyUserApprovalDecision(telegramId, status, actorName);
  return c.json({ success: true, user: result.user });
}

api.post("/admin/users/:id/approve", (c: any) => decideUser(c, "approved"));
api.post("/admin/users/:id/reject", (c: any) => decideUser(c, "rejected"));

// POST /api/admin/users/:id/toggle-block
api.post("/admin/users/:id/toggle-block", async (c: any) => {
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
    user.isBlocked = !user.isBlocked;
  }

  await upsertUser(user);
  return c.json({ success: true, isBlocked: user.isBlocked });
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
  await kv.set(keys.adminInviteToken(token), {
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
