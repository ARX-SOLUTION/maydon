/**
 * API Routes — User endpoints
 */

import { Hono } from "hono";
import { authMiddleware } from "../auth.ts";
import { getBooking, getBookingsByUser, getUser, upsertUser } from "../kv.ts";
import { getAvailabilityRange } from "../services/availability.ts";
import { cancelBooking, createBooking } from "../services/booking.ts";

const api = new Hono();

// Apply auth to all routes
api.use("/*", authMiddleware());

// GET /api/me — User profile
api.get("/me", async (c: any) => {
  const auth = c.get("auth");
  let user = await getUser(auth.userId);

  if (!user) {
    // Create user on first visit
    user = {
      telegramId: auth.userId,
      name: auth.userName ?? "Unknown",
      isBlocked: false,
      isActive: false,
      onboardingStep: "phone",
      createdAt: new Date().toISOString(),
    };
    await upsertUser(user);
  }

  return c.json({
    telegramId: user.telegramId,
    name: user.name,
    username: user.username,
    phone: user.phone,
    isAdmin: auth.isAdmin,
    isActive: auth.isAdmin ? true : user.isActive,
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

export default api;
