/**
 * One-time data copy: Deno KV → Postgres.
 *
 * Run with:
 *   deno run -A --env-file=.env scripts/migrate-kv-to-pg.ts
 *
 * Engine-agnostic: reads via the KvRepo, writes via the PgRepo, both behind the
 * shared Repo interface. Idempotent-ish — re-runnable; uses upsert where offered
 * and guards createBooking/addAdmin by an existence check.
 *
 * NOT migrated (nothing to copy — these are new/transient entities that never
 * existed in the KV schema): one-time admin invite tokens, admin notifications,
 * and booking audit events.
 *
 * Reads go through KvRepo, EXCEPT bookings: a migration is inherently
 * engine-specific on the read side, so we scan KV's raw ["bookings", id] prefix
 * directly (via the exported kv) to catch ALL bookings — including admin-created
 * ones (userId === null) that no per-user index would surface.
 */
import { KvRepo } from "../src/repo/kv-repo.ts";
import { PgRepo } from "../src/repo/pg-repo.ts";
import { kv as rawKv } from "../src/kv.ts";
import type { Booking } from "../src/models.ts";

const kv = new KvRepo();
const pg = new PgRepo();

// ── Settings ───────────────────────────────────────────────────────────
const settings = await kv.getSettings();
if (settings) {
  await pg.upsertSettings(settings);
  console.log("settings: 1 copied");
} else {
  console.log("settings: none");
}

// ── Users ──────────────────────────────────────────────────────────────
const users = await kv.listUsers();
for (const u of users) await pg.upsertUser(u);
console.log(`users: ${users.length} copied`);

// ── Admins ─────────────────────────────────────────────────────────────
const admins = await kv.listAdmins();
let adminsCopied = 0;
for (const a of admins) {
  if (await pg.getAdmin(a.telegramId)) continue; // already there
  await pg.addAdmin(a);
  adminsCopied++;
}
console.log(`admins: ${adminsCopied} copied (${admins.length} total in kv)`);

// ── Recurring ──────────────────────────────────────────────────────────
const recurring = await kv.listRecurring();
for (const r of recurring) await pg.upsertRecurring(r);
console.log(`recurring: ${recurring.length} copied`);

// ── Bookings (raw ["bookings", id] scan → catches user + admin-created) ──
let bookingsCopied = 0;
let bookingsSeen = 0;
for await (const entry of rawKv.list<Booking>({ prefix: ["bookings"] })) {
  bookingsSeen++;
  const b = entry.value;
  if (await pg.getBooking(b.id)) continue; // already migrated
  await pg.createBooking(b);
  bookingsCopied++;
}
console.log(`bookings: ${bookingsCopied} copied (${bookingsSeen} seen)`);

console.log(
  `\nsummary — settings:${settings ? 1 : 0} users:${users.length} admins:${adminsCopied} recurring:${recurring.length} bookings:${bookingsCopied}`,
);
console.log("done. (invite tokens, notifications, booking events: not migrated — new entities)");
