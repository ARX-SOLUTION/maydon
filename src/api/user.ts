/**
 * API Routes — User endpoints
 */

import { Hono } from "hono";
import { authMiddleware } from "../auth.ts";
import {
  getBooking,
  getBookingsByUser,
  getSettings,
  getUser,
  kv,
  upsertUser,
  userApprovalStatus,
} from "../kv.ts";
import { getAvailabilityRange } from "../services/availability.ts";
import {
  addMinutesToTime,
  cancelBooking,
  createBooking,
  getBookableDurations,
} from "../services/booking.ts";
import { notifyNewUserApproval } from "../services/notify.ts";
import { botContext } from "../bot/client.ts";

const api = new Hono();

// Apply auth to all routes
api.use("/*", authMiddleware());

// GET /api/me — User profile
api.get("/me", async (c: any) => {
  const auth = c.get("auth");
  let user = await getUser(auth.userId);
  let created = false;

  if (!user) {
    // Create user on first visit
    user = {
      telegramId: auth.userId,
      name: auth.userName ?? "Unknown",
      isBlocked: false,
      isActive: false,
      approvalStatus: "pending",
      onboardingStep: "phone",
      createdAt: new Date().toISOString(),
    };
    await upsertUser(user);
    created = true;
  }

  if (created) {
    for await (const entry of kv.list({ prefix: ["admins"] })) {
      const adminId = entry.key[1];
      if (typeof adminId === "number") {
        await notifyNewUserApproval(botContext, adminId, user);
      }
    }
  }

  return c.json({
    telegramId: user.telegramId,
    name: user.name,
    username: user.username,
    phone: user.phone,
    isAdmin: auth.isAdmin,
    isActive: auth.isAdmin ? true : user.isActive,
    approvalStatus: auth.isAdmin ? "approved" : userApprovalStatus(user),
    approvalDecidedBy: user.approvalDecidedBy ?? null,
    approvalDecidedByName: user.approvalDecidedByName ?? null,
    approvalDecidedAt: user.approvalDecidedAt ?? null,
    role: auth.role ?? null,
    isOwner: auth.isOwner,
    memberSince: user.createdAt,
  });
});

// POST /api/me/phone — Link phone (from bot contact)
api.post("/me/phone", async (c: any) => {
  const auth = c.get("auth");
  const { phone } = await c.req.json();

  const user = await getUser(auth.userId);
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  user.phone = phone;
  await upsertUser(user);

  return c.json({ success: true, phone });
});

// GET /api/availability — Get available slots
api.get("/availability", async (c: any) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to) {
    return c.json({ error: "Missing from/to params" }, 400);
  }

  try {
    const availability = await getAvailabilityRange(from, to);
    return c.json(availability);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/bookings/my — User's bookings
api.get("/bookings/my", async (c: any) => {
  const auth = c.get("auth");
  const bookings = await getBookingsByUser(auth.userId);

  return c.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      date: b.date,
      start: b.start,
      end: b.end,
      status: b.status,
      createdAt: b.createdAt,
      decidedBy: b.decidedBy ?? null,
      decidedByName: b.decidedByName ?? null,
    })),
  });
});

// POST /api/bookings — Create booking request
api.post("/bookings", async (c: any) => {
  const auth = c.get("auth");
  const { date, start, end, clientName, clientPhone } = await c.req.json();

  if (!date || !start || !end || !clientName || !clientPhone) {
    return c.json({ error: "Barcha maydonlarni to'ldiring" }, 400);
  }

  const result = await createBooking(
    auth.userId,
    clientName,
    clientPhone,
    date,
    start,
    end,
    "user",
  );

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Notify admins
  try {
    const { notifyAdminsNewRequest } = await import("../bot/handlers.ts");
    await notifyAdminsNewRequest(result.booking!);
  } catch (e) {
    console.error("Failed to notify admins:", e);
  }

  return c.json({
    success: true,
    booking: {
      id: result.booking!.id,
      date: result.booking!.date,
      start: result.booking!.start,
      end: result.booking!.end,
      status: result.booking!.status,
      createdAt: result.booking!.createdAt,
    },
  });
});

// POST /api/bookings/:id/cancel — User cancels their own request
api.post("/bookings/:id/cancel", async (c: any) => {
  const auth = c.get("auth");
  const id = c.req.param("id");

  const booking = await getBooking(id);
  if (!booking || booking.userId !== auth.userId) {
    return c.json({ error: "So'rov topilmadi" }, 404);
  }
  if (booking.status !== "pending" && booking.status !== "confirmed") {
    return c.json({ error: "Bu so'rovni bekor qilib bo'lmaydi" }, 400);
  }

  await cancelBooking(id);
  return c.json({ success: true });
});

// POST /api/invite/:token/join — Join a squad
api.post("/invite/:token/join", async (c: any) => {
  const auth = c.get("auth");
  const token = c.req.param("token");

  const { joinBooking } = await import("../services/booking.ts");
  const result = await joinBooking(token, auth.userId);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({ success: true });
});

// POST /api/requests — Handle user booking form from BookCard (HTMX)
api.post("/requests", async (c: any) => {
  const auth = c.get("auth");
  const body = await c.req.parseBody();
  const date = body.date as string;
  const start = body.start as string;
  const durationStr = body.duration as string;

  if (!date || !start || !durationStr) {
    return c.json({ error: "Barcha maydonlarni to'ldiring" }, 400);
  }

  // Calculate end time
  if (!/^\d+$/.test(durationStr)) {
    return c.json({ error: "Davomiylik noto'g'ri" }, 400);
  }
  const duration = Number(durationStr);
  const settings = await getSettings();
  if (!settings) return c.json({ error: "Sozlamalar topilmadi" }, 500);
  if (!getBookableDurations(start, settings).includes(duration)) {
    return c.json({ error: "Bu boshlanish vaqti uchun tanlangan davomiylik mavjud emas" }, 400);
  }
  const end = addMinutesToTime(start, duration);
  if (!end) return c.json({ error: "Bron vaqti ish vaqtidan oshib ketdi" }, 400);

  // Get user details
  const user = await getUser(auth.userId);
  if (!user) {
    return c.json({ error: "Foydalanuvchi topilmadi" }, 404);
  }

  const clientName = user.name || "Unknown";
  const clientPhone = user.phone || "N/A";

  const result = await createBooking(
    auth.userId,
    clientName,
    clientPhone,
    date,
    start,
    end,
    "user",
  );

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Notify admins
  try {
    const { notifyAdminsNewRequest } = await import("../bot/handlers.ts");
    await notifyAdminsNewRequest(result.booking!);
  } catch (e) {
    console.error("Failed to notify admins:", e);
  }

  return c.json({ success: true });
});

export default api;
