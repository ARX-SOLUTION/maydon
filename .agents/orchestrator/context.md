# Context — 2026-07-10T00:45:08Z

## Environment & Tech Stack
- **OS**: macOS
- **Workspace**: `/Users/admin/Developer/Projects/maydon`
- **Runtime**: Deno (hard requirement - no Node tooling/commands)
- **Framework**: Hono
- **Bot Framework**: grammY
- **Database**: Deno KV (`maydon_kv` local database file or memory)
- **UI**: Hono JSX SSR + HTMX + Precompiled Tailwind CSS

## Requirements Summary
1. **R1**: Booking logic verification (Spec & Standards Review) - ensure alignment with Spec & `implementation_plan.md` (or existing codebase spec/standards).
2. **R2**: Refactor and TDD (Auto-fix) - write robust unit/integration tests and refactor booking smells.
3. **R3**: Cancellation/No-show system - allow admins to cancel confirmed bookings. Save status as `cancelled`. Do not delete. Add UI buttons (admin only) and API/Service endpoints.
4. **R4**: Deno infra - verify using `deno task test` and `deno check src/main.ts`.

## Code Layout (Key Directories)
- `src/` - Application source
- `src/api/` - Authed API routes
- `src/bot/` - Telegram bot handlers
- `src/services/` - Business logic (booking, availability)
- `src/ui/` - Hono JSX and HTMX components
- `src/kv.ts` - Deno KV database access
- `src/models.ts` - Data models
