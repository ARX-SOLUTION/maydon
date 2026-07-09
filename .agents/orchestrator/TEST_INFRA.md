# TEST INFRA: Booking Cancellation & No-Show System

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation internals.
- Verification commands: `deno task test` and `deno check src/main.ts`.

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|----------------------|:------:|:------:|:------:|
| 1 | Admin Booking Cancellation | ORIGINAL_REQUEST §R3 | 5      | 5      | ✓      |
| 2 | Slot Releasing | ORIGINAL_REQUEST §R3 | 2      | 2      | ✓      |
| 3 | Telegram Notification | ORIGINAL_REQUEST §R3 | 2      | 2      | ✓      |

## Test Cases Inventory

### Tier 1: Feature Coverage (Happy Paths)
1. `cancelBooking` successfully transitions a `"confirmed"` booking to `"cancelled"`.
2. `cancelBooking` updates the `decidedAt` timestamp of the booking.
3. `cancelBooking` releases the busy slot, making it available again in `getDayAvailability`.
4. `POST /api/admin/bookings/:id/cancel` API returns success: true for a valid booking when authorized.
5. Bot notification function `notifyUserCancelled` correctly calls grammY `sendMessage` with the correct Markdown message.

### Tier 2: Boundary & Corner Cases (Error Handling)
1. `cancelBooking` on a non-existent booking ID returns success: false and "Booking not found" error.
2. `cancelBooking` on an already `"cancelled"` booking returns success: false and "Booking is already cancelled" error.
3. `cancelBooking` on a `"completed"` booking returns success: false and "Cannot cancel completed bookings" error.
4. `POST /api/admin/bookings/:id/cancel` without an Authorization header returns 401.
5. `POST /api/admin/bookings/:id/cancel` with an invalid token/signature returns 401.

### Tier 3: Cross-Feature Combinations
1. Complete booking cycle: User creates booking (pending) -> Admin confirms booking (confirmed, slot is busy) -> Admin cancels booking (cancelled, slot is free again, user notified).
2. Race condition safety: Attempting to cancel a booking that was concurrent-checked and updated by another process/admin.

### Tier 4: Real-World Application Scenarios
1. Interactive admin UI scenario: Admin accesses the dashboard Schedule page, identifies a confirmed booking, clicks "Bekor qilish", clicks "OK" on prompt, AJAX request triggers API, page is re-fetched with the slot returned to a free state.

## Coverage Thresholds
- Tier 1: 5 tests
- Tier 2: 5 tests
- Tier 3: 2 tests
- Tier 4: 1 integration/unit test scenario
