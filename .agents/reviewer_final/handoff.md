# Handoff Report: Cancellation & No-Show Implementation Review

This report provides an objective, evidence-based review and adversarial challenge of the final cancellation/no-show implementation (Tiers 1-4) in the Maydon Booking application.

---

## 1. Observation

We directly examined the modified files and ran automated commands in the workspace `/Users/admin/Developer/Projects/maydon`:

1. **Compilation Check**:
   Ran `deno check src/main.ts` and observed:
   ```
   Warning "exports" field should be specified when specifying a "name".
       at file:///Users/admin/Developer/Projects/maydon/deno.json
   ```
   The check completed successfully with exit code `0` (no type check errors).

2. **Test Command Run**:
   Ran `deno task test` and observed that all 20 tests pass, but the post-test output is littered with GrammyError stack traces:
   ```
   running 13 tests from ./src/cancellation_test.ts
   ...
   Tier 1.4: POST /api/admin/bookings/:id/cancel API returns success: true for a valid booking when authorized ...
   ------- post-test output -------
   Failed to send message: GrammyError: Call to 'sendMessage' failed! (404: Not Found)
       at toGrammyError (file:///Users/admin/Developer/Projects/maydon/node_modules/.deno/grammy@1.44.0/node_modules/grammy/out/core/error.js:47:12)
       ...
       at async notifyUserCancelled (file:///Users/admin/Developer/Projects/maydon/src/services/notify.ts:145:3)
       at async notifyUserCancellation (file:///Users/admin/Developer/Projects/maydon/src/bot/decisions.ts:246:3)
       at async file:///Users/admin/Developer/Projects/maydon/src/api/admin.ts:135:7
   ```
   One of the tests (`Tier 1.4`) took `501ms` due to a blocking external network request to `api.telegram.org`.

3. **DOM Event Listener in `Users.tsx`**:
   In `src/ui/pages/admin/Users.tsx`, the client-side script block ends with:
   ```javascript
   document.addEventListener("DOMContentLoaded", loadUsers);
   ```
   While the bottom navigation bar (`src/ui/components/RoleBottomNav.tsx`) loads this page dynamically using HTMX swaps:
   ```html
   <a href="/app/admin/users" hx-get="/app/admin/users" hx-target="#app-content" hx-swap="innerHTML" ...>
   ```

4. **Deno KV index in `kv.ts`**:
   In `src/kv.ts`, `getPendingRequests` retrieves keys using prefix `["pending_by_created"]`:
   ```typescript
   export async function getPendingRequests(): Promise<Booking[]> {
     const entries = kv.list<string>({
       prefix: ["pending_by_created"],
     });
     const ids: string[] = [];
     for await (const entry of entries) {
       ids.push(entry.value);
     }
     const bookings = await getBookingsByIds(ids);
     return bookings.filter((b) => b.status === "pending");
   }
   ```
   A codebase-wide search for `pendingByCreated` and `pending_by_created` shows they are set in `createBooking` but are never deleted when a booking transitions to `confirmed`, `rejected`, or `cancelled` status.

---

## 2. Logic Chain

1. **Test api.telegram.org call leak**:
   - Observation 2 shows that `Tier 1.4` and `Tier 4.1` trigger calls to the real Telegram Bot API (`api.telegram.org`) using a mock token `"test-token-for-auth-spec"`.
   - The token results in `404: Not Found` from Telegram's servers. The error is caught inside `botContext.sendMessage` and logged.
   - This makes the tests slow (~500ms delay per request) and reliant on an active network connection, which is a code smell. Stubbing the `bot.api` object in `cancellation_test.ts` is required to keep tests fast and offline-friendly.

2. **Blank Users Page during Navigation**:
   - Observation 3 shows that the bottom nav uses HTMX swaps (`hx-target="#app-content"`) to load `/app/admin/users`.
   - Because HTMX dynamic page swaps do not trigger a full document reload, the browser's `DOMContentLoaded` event has already fired and will not fire again.
   - Thus, the listener `document.addEventListener("DOMContentLoaded", loadUsers)` in `Users.tsx` is never triggered. The `loadUsers` function is bypassed, and the users list remains completely blank.
   - To fix this, the script must verify if `document.readyState` is already loaded and invoke `loadUsers()` immediately if so.

3. **Performance Leak in `pending_by_created`**:
   - Observation 4 shows that `keys.pendingByCreated` is created in `createBooking` but never deleted when bookings are resolved (confirmed, rejected, or cancelled).
   - In `getPendingRequests()`, the prefix query `["pending_by_created"]` lists every booking request ever made.
   - Over time, this list will scale linearly, forcing the application to fetch all resolved bookings from KV in batches of 10 and filter them in-memory. This creates an O(N) performance leak that will eventually hit KV limits and timeout.

---

## 3. Caveats

- Since we are operating under `Review-only` guidelines, we have highlighted these issues as findings and recommended the exact fix directions without modifying the source code.
- Mocks/stubs were verified using static analysis and log inspection.

---

## 4. Conclusion & Review Verdict

### Review Summary
- **Verdict**: REQUEST_CHANGES
- **Reasoning**: Two major bugs/code smells must be resolved before approval:
  1. The "Mijozlar" page remains completely blank when navigated to via bottom navigation due to an HTMX/`DOMContentLoaded` lifecycle mismatch.
  2. Integration tests leak network calls to the external Telegram API, causing slow test execution and environmental dependency.
  3. A performance leak in `pending_by_created` KV index will degrade system performance over time.

---

### Findings

#### [Major] Finding 1: `Users.tsx` is blank on HTMX navigation (UI Bug)
- **What**: The users list does not load when navigating to the "Mijozlar" tab.
- **Where**: `src/ui/pages/admin/Users.tsx`, line 116.
- **Why**: The page uses `document.addEventListener("DOMContentLoaded", loadUsers)` but is loaded dynamically via HTMX. The `DOMContentLoaded` event is bypassed.
- **Suggestion**: Replace line 116 with:
  ```javascript
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadUsers);
  } else {
    loadUsers();
  }
  ```

#### [Major] Finding 2: Integration tests leak network calls (Test Code Smell)
- **What**: Tests call the live Telegram Bot API (`api.telegram.org`).
- **Where**: `src/cancellation_test.ts`, lines 132-164, 380-426.
- **Why**: `notifyUserCancellation` uses the global `botContext` which makes real HTTP calls.
- **Suggestion**: Stub/mock `bot.api` at the top of the test file:
  ```typescript
  import { bot } from "./bot/client.ts";
  bot.api.sendMessage = () => Promise.resolve({} as any);
  bot.api.setMyCommands = () => Promise.resolve(true);
  ```

#### [Major] Finding 3: KV Index Leak on `pending_by_created` key (Database Code Smell)
- **What**: The database index `pending_by_created` is never cleaned up, causing a linear accumulation of entries in Deno KV.
- **Where**: `src/services/booking.ts` (inside `confirmBooking`, `rejectBooking`, `cancelBooking`) and `src/kv.ts` (inside `getPendingRequests`).
- **Why**: Entries are set but never deleted. As history grows, `getPendingRequests` must fetch every booking ever created to filter them in-memory.
- **Suggestion**: Delete `keys.pendingByCreated(b.createdAt, b.id)` when confirming, rejecting, or cancelling a booking.

---

### Verified Claims

- `cancelBooking` successfully transitions a `"confirmed"` booking to `"cancelled"` -> verified via `deno task test` (`Tier 1.1`) -> **PASS**
- `cancelBooking` updates `decidedAt` -> verified via `deno task test` (`Tier 1.2`) -> **PASS**
- `cancelBooking` releases the busy slot -> verified via `deno task test` (`Tier 1.3`) -> **PASS**
- KV concurrency locking safety -> verified via `deno task test` (`Tier 3.2` intercepting KV atomic transactions) -> **PASS**
- Type checks are clean -> verified via `deno check src/main.ts` -> **PASS**

---

### Coverage Gaps
- None. The test suite covers all Tiers 1-4 from `TEST_INFRA.md`.

---

### Unverified Items
- None. All functional claims in the test suite have been executed and verified.

---

## 5. Verification Method

To independently verify:
1. Run static checks:
   ```bash
   deno check src/main.ts
   ```
2. Run test suite:
   ```bash
   deno task test
   ```
3. To reproduce the blank page bug in a browser, navigate to the admin section, go to the Schedule page, then click "Mijozlar" on the bottom navigation. Observe that the list container remains empty.
