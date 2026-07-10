import { assertEquals, assertStringIncludes } from "@std/assert";

Deno.env.set("KV_PATH", `maydon_duration_test_${Date.now()}`);

const {
  addCalendarDays,
  addMinutesToTime,
  createBooking,
  getBookableDurations,
  tashkentDate,
  validateSlot,
} = await import("./services/booking.ts");
const { getDayAvailability } = await import("./services/availability.ts");
const { initDefaultSettings, kv, upsertSettings } = await import("./kv.ts");

const settings = {
  openTime: "08:00",
  closeTime: "23:00",
  horizonDays: 7,
  minDurMin: 30,
  maxDurMin: 180,
  snapMin: 30,
};

async function clearKv() {
  for await (const entry of kv.list({ prefix: [] })) await kv.delete(entry.key);
}

Deno.test("30 and 90 minute duration math never wraps past midnight", () => {
  assertEquals(addMinutesToTime("21:30", 90), "23:00");
  assertEquals(addMinutesToTime("22:30", 30), "23:00");
  assertEquals(addMinutesToTime("22:30", 60), "23:30");
  assertEquals(addMinutesToTime("23:30", 60), null);

  assertEquals(getBookableDurations("22:00", settings), [30, 60]);
  assertEquals(getBookableDurations("22:30", settings), [30]);
  assertEquals(getBookableDurations("23:00", settings), []);
});

Deno.test("snap grid is relative to open time, including 30 minute slots", () => {
  const now = new Date();
  const date = tashkentDate(now);
  const shifted = { ...settings, openTime: "08:15", closeTime: "23:15", horizonDays: 2 };
  assertEquals(validateSlot(date, "08:15", "08:45", shifted, now), null);
  assertStringIncludes(
    validateSlot(date, "08:00", "08:30", shifted, now) ?? "",
    "30 daqiqalik qadam",
  );
});

Deno.test("a 90 minute booking marks exactly the following 30 minute slots busy", async () => {
  await clearKv();
  await initDefaultSettings();
  await upsertSettings(settings);
  const date = addCalendarDays(tashkentDate(), 1);
  const booking = await createBooking(null, "90 min", "+998900000000", date, "10:00", "11:30", "admin");
  assertEquals(booking.success, true);

  const availability = await getDayAvailability(date);
  for (const start of ["10:00", "10:30", "11:00"]) {
    assertEquals(availability.slots.find((slot) => slot.start === start)?.isBusy, true, start);
    assertEquals(availability.slots.find((slot) => slot.start === start)?.bookedBy, "90 min");
  }
  assertEquals(availability.slots.find((slot) => slot.start === "11:30")?.isBusy, false);
  assertEquals(availability.slots.find((slot) => slot.start === "09:30")?.isBusy, false);
});
