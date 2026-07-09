# Maydon Booking

Telegram **bot + Mini App** for booking a **single football field's** schedule.
Flow: user sees free slots → picks a range → sends a request → an admin approves/rejects
from the bot → FIFO on conflicts. No payments — pure scheduling.

---

## Runtime: Deno — this is a hard requirement

**This project runs on Deno. Do NOT introduce Node tooling.**

- ❌ No `package.json`, `node_modules`, `npm`/`npx`/`pnpm`/`yarn`, `tsx`, or `ts-node`.
- ✅ Dependencies go in `deno.json` `imports` as `jsr:` or `npm:` specifiers.
- ✅ Run things with `deno task …`, `deno run …`, `deno test`, `deno check`.
- ✅ Scripts are `deno run`, not `tsx`/`node`. Env is read with `Deno.env.get(...)`.

If a library's docs tell you to `npm install` / `npx`, translate it to the Deno
equivalent (`deno add npm:<pkg>` or an `npm:` import + `deno run -A npm:<cli>`).
Never scaffold a Node project on top of this one.

### Commands

| Task | Command |
|------|---------|
| Dev server (watch) | `deno task dev` |
| Build CSS | `deno task build:css` (see gotcha below) |
| Tests | `deno task test` |
| Typecheck | `deno check src/main.ts` |
| Deploy | `deno task deploy` (see Deploy note below) |

The unstable flags `--unstable-kv --unstable-cron` are required (KV + `Deno.cron`).

⚠️ **Tailwind is precompiled, not CDN.** `static/app.css` is a built artifact
committed to the repo (Deno Deploy has no build step). The old
`cdn.tailwindcss.com` compiler recompiled on every HTMX DOM swap — the app's
biggest slowdown — so it was removed. **If you add/change a Tailwind class in any
`.tsx`/`.ts`, run `deno task build:css` and commit the regenerated
`static/app.css`, or the class won't be styled in production.** The theme lives in
`tailwind.config.js` (ported from the old in-`<head>` config).

---

## Stack

| Concern | Tech |
|---------|------|
| Runtime | Deno (Deno Deploy) |
| HTTP | Hono (`jsr:@hono/hono`) |
| Bot | grammY (`npm:grammy`), **webhook mode** (not long-polling) |
| Storage | **Deno KV** |
| UI | Hono JSX SSR + HTMX + **precompiled Tailwind** (`static/app.css`) + GSAP (CDN) |
| Auth | Telegram Mini App `initData` (HMAC) |
| IDs | `npm:ulid` |

## Structure

```
src/
  main.ts            entry: Hono app, webhook, bootstrap (owner admin), cron
  models.ts          types (User, Admin, Booking, Settings, Recurring) + roleFor()
  kv.ts              Deno KV client + key builders + data-access functions
  auth.ts            Telegram initData HMAC verification + Hono middleware
  cron.ts            Deno.cron jobs (expire pending, complete, generate recurring)
  api/               user.ts, admin.ts — /api/* routes (authed)
  bot/               composition root (handlers.ts) + per-concern modules:
                     client, onboarding, admin-invite, admin-list, moderation,
                     decisions, commands
  services/          booking, availability, notify, recurring (business logic)
  ui/                router.tsx, layout.tsx, components/, pages/{user,admin}/
```

The bot is split into modules that each export a `register*()` called by
`bot/handlers.ts` on the shared `bot` from `bot/client.ts`.

---

## Conventions & gotchas (hard-won — respect these)

- **Deno KV `list({ prefix })` matches components exactly.** Never pad a prefix with
  a trailing `""` (e.g. `["users", ""]`) to mean "any" — it matches *nothing*. Use the
  real leading tuple only: `["users"]`, `["bookings_by_day", date]`.
- **Telegram `initData` auth is HMAC-of-HMAC**, not PBKDF2:
  `secret = HMAC_SHA256(key="WebAppData", msg=botToken)`, then
  `hash = HMAC_SHA256(key=secret, msg=dataCheckString)`. See `auth.ts`.
- **Hono middleware must `return c.json(...)`** — a bare `c.json()` without `return`
  leaves the context unfinalized and 500s instead of the intended status.
- **Webhook (`main.ts`):** use grammY's `webhookCallback(bot, "hono", { secretToken })`,
  and **wrap it so a throwing update is acknowledged with 200** — grammY sends handler
  errors to the framework (not `bot.catch`), and a 500 makes Telegram retry forever,
  blocking the in-order queue and killing the bot. On Deno Deploy the app
  **auto-registers its own webhook** on startup (delete then set) from `MINI_APP_URL`.
- **Bot message handlers call `next()` when they don't consume** the update, so command
  handlers in other modules still run regardless of registration order.
- **Callbacks are filtered** (`bot.callbackQuery(/^action:(.+)$/, …)`), never one
  catch-all with a default branch (that would swallow other modules' callbacks).
- **Admins have roles:** `owner` (the bootstrap `ADMIN_TELEGRAM_ID`) manages admins;
  `admin` (helper) only confirms/rejects + manual bookings. Single rule: `roleFor()`.
- **Inline buttons that open the Mini App use `web_app`** (not `url`) so they open
  inside Telegram.
- **Tests:** structural/systemic bug fixes get a small regression test proven to fail
  without the fix (see `auth_test.ts`, `admin_roles_test.ts`). Keep pure logic (e.g.
  `roleFor`, message formatters) out of the KV-opening modules so it's unit-testable.

## Environment variables

Set on Deno Deploy (and in local `.env`, which is **gitignored** — never commit it):

| Var | Purpose |
|-----|---------|
| `TELEGRAM_BOT_TOKEN` | bot token from @BotFather |
| `ADMIN_TELEGRAM_ID` | numeric id of the default **owner** admin (created on boot) |
| `MINI_APP_URL` | public app URL; used for buttons and webhook auto-registration |

⚠️ `.env` was historically committed with a live token — rotate the token via
@BotFather and keep `.env` out of git.

---

## Deploy

- Target: **Deno Deploy**.
- ⚠️ **Deno Deploy Classic sunsets 2026-07-20.** Migrate to the new platform
  (`console.deno.com`): new org + app, reconnect GitHub, re-enter env vars. Nothing
  migrates automatically; KV must be moved via `support@deno.com`.
- `deployctl` is retired with Classic → replace the `deploy` task with
  `deno deploy` once migrated.

## Storage direction (planned scaling)

Currently all data is in **Deno KV** (~140 call sites across ~14 files, accessed
directly via `kv.ts`). To scale (users, booking history, an admin notifications feed,
possibly multi-venue) the plan is:

1. Introduce a **repository layer** (deep module) so the storage engine is hidden
   behind an interface — swapping KV↔Postgres becomes one change, not 140.
2. If moving to Postgres, do it **Deno-native** (e.g. `postgres.js`, or Prisma via
   `npm:` on Deno) — **not** a bolted-on Node/npm toolchain.

---

## Agent skills

### Issue tracker
Issues and PRDs live as GitHub issues (`ARX-SOLUTION/maydon`). Use the `gh` CLI.
See `docs/agents/issue-tracker.md`.

### Triage labels
Five canonical triage roles. See `docs/agents/triage-labels.md`.

### Domain docs
Single-context setup. See `docs/agents/domain.md`.
