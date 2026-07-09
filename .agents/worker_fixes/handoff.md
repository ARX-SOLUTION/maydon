# Handoff Report — worker_fixes

## 1. Observation
- **Blank Users Page Issue (R1)**:
  - In `src/ui/pages/admin/Users.tsx` (line 116), the page registered a listener for `DOMContentLoaded`:
    ```typescript
    document.addEventListener("DOMContentLoaded", loadUsers);
    ```
    This failed during HTMX dynamic swaps because the document is already in an interactive/complete state, meaning `DOMContentLoaded` never fires again, leaving the user list blank.
- **Test Network Leak (R2)**:
  - During test execution via `deno task test`, we observed network requests made to `api.telegram.org` due to grammY bot calls (`sendMessage`, `setMyCommands`).
  - Verbatim errors observed before fix:
    ```
    setMyCommands failed: GrammyError: Call to 'setMyCommands' failed! (404: Not Found)
    ...
    Failed to send message: GrammyError: Call to 'sendMessage' failed! (404: Not Found)
    ```
  - Running tests before mock took `829ms` with real-world network timeouts/lag.
- **KV Index Leak on `pending_by_created` (R3)**:
  - Bookings confirmed or rejected left their indexes in `pending_by_created` (stored inside `keys.pendingByCreated(createdAt, id)`).
  - Inside `src/services/booking.ts`, the functions `confirmBooking` and `rejectBooking` did not clean up this index.
  - Inside `src/cron.ts`, the function `expirePending` did not use atomic transactions to change status to "expired", and did not clean up orphaned indices from `pending_by_created`.

## 2. Logic Chain
- **Blank Users Page Fix**:
  - We replaced the unconditional listener with:
    ```typescript
    if (document.readyState === "complete" || document.readyState === "interactive") {
      loadUsers();
    } else {
      document.addEventListener("DOMContentLoaded", loadUsers);
    }
    ```
    If the document has already finished parsing (HTMX swap), `loadUsers()` runs immediately, solving the blank tab issue. Otherwise, it registers the listener.
- **Test Network Leak Fix**:
  - By statically importing `bot` from `./bot/client.ts` at the very beginning of `src/cancellation_test.ts` and stubbing `bot.api.sendMessage`, `bot.api.setMyCommands`, `bot.api.getMe`, and `bot.api.editMessageText`, we intercepted all calls to the Telegram API before the rest of the application could make them.
  - Test time dropped to `201ms` (a ~75% reduction), running entirely offline and cleanly without post-test error outputs.
- **KV Index Leak Fix**:
  - In `src/services/booking.ts`:
    - Inside `confirmBooking`, we chained `.delete(keys.pendingByCreated(b.createdAt, id))` on the atomic transaction that updates status to `confirmed`.
    - Inside `rejectBooking`, we refactored it to use `kv.atomic().check(booking)` and chained `.delete(keys.pendingByCreated(b.createdAt, id))`.
  - In `src/cron.ts`:
    - Inside `expirePending`, we added a cleanup check: if the booking is not found or is no longer in `pending` status, we delete the orphaned index using `kv.delete(entry.key)`.
    - For expiring bookings, we changed the raw `kv.set` to a `kv.atomic().check(booking)` block and chained `.delete(keys.pendingByCreated(b.createdAt, b.id))` when status becomes `expired`.
  - Added a new unit test `Tier 4.2: KV Index Leak prevention` in `src/cancellation_test.ts` which explicitly tests index creation, deletion on confirm, deletion on reject, deletion on cron expiry, and orphaned key deletion.

## 3. Caveats
- We assume `document.readyState` is accurate in the client browser during HTMX swaps. Since HTMX swaps load HTML elements and scripts asynchronously, `document.readyState` will indeed be `interactive` or `complete`.
- The bot token in tests is set to a mock string (`test-token-for-auth-spec`), which is safe since all bot API endpoints are stubbed.

## 4. Conclusion
All identified bugs/smells (R1, R2, R3, R4) are fixed. The project compiles 100% cleanly under `deno check` and runs its test suite completely offline, passing 21 tests in under ~250ms without leaks.

## 5. Verification Method
- **Run Type Checks**:
  `deno check src/main.ts`
  `deno check src/cancellation_test.ts`
- **Run Tests**:
  `deno task test`
  Confirm 21 tests pass, post-test outputs do not contain `GrammyError` tracebacks, and execution time is fast (< 300ms).
- **Inspect Files**:
  - `src/ui/pages/admin/Users.tsx` (line 116)
  - `src/cancellation_test.ts` (lines 3-10, lines 434-522)
  - `src/services/booking.ts` (lines 198-204, lines 233-248)
  - `src/cron.ts` (lines 10-38)
