# Project: Maydon Booking Cancellation & No-Show System

## Architecture
The application is a Telegram Bot + Hono-based Mini App running on Deno. It stores data in Deno KV.
- **Models (`src/models.ts`)**: Defines the data structures. The booking status enum already has `"cancelled"`.
- **KV Store (`src/kv.ts`)**: Handles Deno KV persistence.
- **Service Layer (`src/services/`)**: Implements business logic. `booking.ts` manages creation, confirmation, and cancellation. `notify.ts` manages Telegram bot user DMs.
- **API Layer (`src/api/`)**: Defines authed routes. `admin.ts` provides admin-only endpoints.
- **UI Layer (`src/ui/`)**: Hono SSR + HTMX components. `Schedule.tsx` displays schedule details.

## Milestones
| # | Name | Scope | Dependencies | Status | Conversation ID |
|---|------|-------|-------------|--------|-----------------|
| 1 | `m1_e2e_tests` | Design and implement Tier 1-4 E2E/Integration test suite for cancellation | None | PLANNED | |
| 2 | `m2_backend` | Enhance cancelBooking service, notifyUserCancelled service, and POST /api/admin/bookings/:id/cancel API route | `m1_e2e_tests` | PLANNED | |
| 3 | `m3_ui` | Add cancel button to admin Schedule UI, add AJAX callback in scheduleScript | `m2_backend` | PLANNED | |
| 4 | `m4_validation`| Run all tests, perform Tier 5 adversarial testing, verify types, write review_report.md | `m3_ui` | PLANNED | |

## Interface Contracts
### Admin API ↔ Booking Service
- `cancelBooking(id: string): Promise<{ success: boolean; error?: string; booking?: Booking }>`
- HTTP Endpoint: `POST /api/admin/bookings/:id/cancel`
- Headers: `Authorization: Bearer <Telegram initData>`
- Response: `{ success: true }` or `{ error: string }` with 400/500 status on failure

### Admin UI ↔ Admin API
- Button Click Event triggers `handleCancel(bookingId, buttonElement)`.
- AJAX POST request to `/api/admin/bookings/:id/cancel` with Auth headers.
- Success: display Toast "Bron bekor qilindi!", trigger HTMX page reload of `/app/admin/schedule`.
- Failure: display Toast error, re-enable button.

## Code Layout
- `src/models.ts` - Add check for `cancelled` if required.
- `src/services/booking.ts` - Implement validation in `cancelBooking`.
- `src/services/notify.ts` - Implement `notifyUserCancelled`.
- `src/bot/decisions.ts` - Export wrapper `notifyUserCancellation`.
- `src/api/admin.ts` - Update `/api/admin/bookings/:id/cancel` route.
- `src/ui/pages/admin/Schedule.tsx` - Inject button and handleCancel script.
- `src/cancellation_test.ts` - Cancellation integration & unit tests.
