## 2026-07-10T01:00:05Z
Objective: Fix the three major bugs/code smells identified during final code review (R1, R2, R3, R4).
Scope: Modify `src/ui/pages/admin/Users.tsx`, `src/cancellation_test.ts`, `src/services/booking.ts`, and `src/cron.ts`.
Tasks:
1. Fix Blank Users Page:
   - In `src/ui/pages/admin/Users.tsx`, replace the `document.addEventListener("DOMContentLoaded", loadUsers)` listener registration with a check for `document.readyState`. If it is already loaded/interactive (which is true during HTMX swaps), invoke `loadUsers()` immediately; otherwise, add the listener.
2. Fix Test Network Leak:
   - In `src/cancellation_test.ts` (and any other test files if needed), stub/mock `bot.api.sendMessage` and `bot.api.setMyCommands` to prevent real calls to `api.telegram.org`. Ensure tests run quickly and completely offline.
3. Fix KV Index Leak on `pending_by_created`:
   - In `src/services/booking.ts`:
     - Inside `confirmBooking`, when performing the atomic set to status "confirmed", chain `.delete(keys.pendingByCreated(b.createdAt, id))` to remove the pending request index.
     - Inside `rejectBooking`, refactor it to use `kv.atomic()` with a `.check(booking)`, and set status to "rejected" while chaining `.delete(keys.pendingByCreated(b.createdAt, id))`.
   - In `src/cron.ts` (inside `expirePending` function):
     - If the booking retrieved is not found or not in status "pending", delete the entry key `entry.key` (orphaned index key) using `kv.delete(entry.key)`.
     - When expiring a booking (status changes to "expired"), perform a `kv.atomic()` transaction checking the booking, setting the status to "expired", and deleting `keys.pendingByCreated(b.createdAt, b.id)`.
4. Run `deno task test` and verify all 20 tests pass cleanly and quickly (e.g. without 500ms API lag or stack traces in post-test output).
5. Run `deno check src/main.ts` to ensure type checks pass 100%.
6. Write your handoff report at `/Users/admin/Developer/Projects/maydon/.agents/worker_fixes/handoff.md` summarizing the changes, test times, and verification.

MANDATORY INTEGRITY WARNING:
> DO NOT CHEAT. All implementations must be genuine. DO NOT
> hardcode test results, create dummy/facade implementations, or
> circumvent the intended task. A Forensic Auditor will independently
> verify your work. Integrity violations WILL be detected and your
> work WILL be rejected.
