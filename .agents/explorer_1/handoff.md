# Explorer Handoff Report: Admin Cancellation / No-show System (R3)

This report details the findings, build/test validation logs, and the implementation plan for adding the admin booking cancellation and no-show features (R3) to Maydon Booking.

---

## 1. Observation

### Exact File Paths & Code References
1. **Booking Status Model**: In `src/models.ts` (lines 42–60), the booking statuses are defined. The status `"cancelled"` is already one of the valid states:
   ```typescript
   export type BookingStatus = "pending" | "confirmed" | "rejected" | "expired" | "cancelled" | "completed";
   
   export interface Booking {
     id: string; // ulid
     userId: number | null; // null if admin created
     ...
     status: BookingStatus;
     ...
   }
   ```
2. **Cancellation Logic**: In `src/services/booking.ts` (lines 245–255), the current `cancelBooking` service function simply sets the booking status to `"cancelled"`:
   ```typescript
   export async function cancelBooking(id: string): Promise<void> {
     const booking = await kv.get<Booking>(keys.booking(id));
     if (!booking.value) return;

     const b = booking.value;
     await kv.set(keys.booking(id), {
       ...b,
       status: "cancelled",
       decidedAt: new Date().toISOString(),
     });
   }
   ```
3. **Availability Checking**: In `src/services/availability.ts` (lines 33–36), busy slots are determined strictly by checking if bookings have `status === "confirmed"`:
   ```typescript
   const bookings = await getBookingsByDay(date);
   const confirmedBookings = bookings.filter(
     (b: Booking) => b.status === "confirmed",
   );
   ```
   Thus, changing a booking's status from `"confirmed"` to `"cancelled"` automatically releases the slot and makes it available.
4. **Admin API Endpoint**: In `src/api/admin.ts` (lines 120–128), there is a skeleton route for admin cancellation:
   ```typescript
   // POST /api/admin/bookings/:id/cancel
   api.post("/api/admin/bookings/:id/cancel", async (c: any) => {
     const id = c.req.param("id");
     await cancelBooking(id);

     // TODO: Notify admins about available slot

     return c.json({ success: true });
   });
   ```
   *Note: This route currently has no validation checks and lacks Telegram notifications to the affected user.*
5. **Admin UI Page**: In `src/ui/pages/admin/Schedule.tsx` (lines 316–341), busy slots display the booking name and phone number but contain no buttons/links to cancel the booking:
   ```typescript
   return slot.isBusy
     ? (
       <div class="flex-1 border-b border-crm-borderSoft border-dashed last:border-b-0 bg-crm-primarySoft/55 flex items-center justify-between gap-3 px-3">
         <span class="text-[13px] font-bold text-crm-primary flex items-center min-w-0">
           <Icon
             name="checkCircle"
             class="w-3.5 h-3.5 mr-1.5 shrink-0"
           />
           <span class="truncate">
             {booking?.clientName || "Band"}
           </span>
         </span>
         {booking?.clientPhone
           ? (
             <a
               href={`tel:${
                 booking.clientPhone.replace(/\s+/g, "")
               }`}
               class="text-[12px] font-bold text-crm-primary tabular-nums focus-ring rounded-md"
             >
               {booking.clientPhone}
             </a>
           )
           : null}
       </div>
     )
   ```

### Command Execution Logs
Verified the current tests and static checks pass cleanly:
* **`deno task test`**:
  ```
  running 3 tests from ./src/admin_roles_test.ts
  roleFor — the configured owner id maps to owner ... ok (19ms)
  roleFor — any other admin maps to helper 'admin' ... ok (0ms)
  roleFor — no configured owner id → helper 'admin' ... ok (0ms)
  running 3 tests from ./src/auth_test.ts
  authMiddleware — missing Authorization header returns 401, not 500 ... ok (11ms)
  authMiddleware — invalid signature returns 401, not 500 ... ok (7ms)
  authMiddleware — correctly signed initData returns 200 ... ok (1ms)

  ok | 6 passed | 0 failed (89ms)
  ```
* **`deno check src/main.ts`**:
  ```
  Warning "exports" field should be specified when specifying a "name".
      at file:///Users/admin/Developer/Projects/maydon/deno.json
  ```
  *(Exits successfully with 0)*

---

## 2. Logic Chain

1. Since `"cancelled"` is already defined in `BookingStatus` (Observation 1) and `CONTEXT.md` glossary specifies that "Cancellation (Bekor qilish/No-show)" results in updating the booking status to `"cancelled"` without deleting it, we do not need to alter the model's status type union.
2. When a booking's status changes from `"confirmed"` to `"cancelled"`, the availability logic in `availability.ts` automatically ignores it (Observation 3). This guarantees that the cancelled slots become free immediately, satisfying the requirement to release the timeslots.
3. The existing service helper `cancelBooking` in `src/services/booking.ts` (Observation 2) sets the status but does not validate if the booking exists, is already cancelled, or is complete. Returning a `{ success: boolean; error?: string; booking?: Booking }` result object will allow the controller endpoint to return appropriate client feedback.
4. The admin API route `POST /api/admin/bookings/:id/cancel` (Observation 4) does not notify the user. Adding user notification calls through the Telegram bot wrapper will inform users of the cancellation.
5. In the admin dashboard layout, the Schedule page (`Schedule.tsx`, Observation 5) is where admins view confirmed bookings as "busy slots". Adding a "Bekor qilish" button here, along with a corresponding AJAX handler in `scheduleScript`, allows the admin to revoke confirmed slot ranges directly from the schedule UI.

---

## 3. Caveats

* **No-Show vs Cancellation Tracking**: As of now, both user-initiated cancellations and admin-initiated cancellations/no-shows map to the single status `"cancelled"`. If the project demands separating them for penalty tracking in the future, we could track who initiated it using the `BookingEvent` audit trail layer (which already supports `actorId`).
* **Concurrency**: A cancellation request must run atomically to avoid race conditions (e.g. if two admins cancel/complete the same slot simultaneously). The current `cancelBooking` uses a basic `kv.set`. For complete safety, it should check the existing record first.

---

## 4. Conclusion

The admin cancellation and no-show system (R3) can be completely implemented using the existing `"cancelled"` status. 

The implementation needs to:
1. Enhance the `cancelBooking` service function with existence/status checks and return state.
2. Implement Telegram notification handlers in `src/services/notify.ts` (`notifyUserCancelled`) and trigger it in `src/api/admin.ts`.
3. Enhance `POST /api/admin/bookings/:id/cancel` API endpoint to handle responses and trigger the bot DMs.
4. Inject a "Bekor qilish" action button in `Schedule.tsx` busy slot cards, and handle it gracefully via custom scripts and HTMX page refresh.
5. Create robust TDD test cases verifying the cancellation service and API paths.

---

## 5. Verification Method

To verify the implementation once complete:
1. Run the test suite:
   ```bash
   deno task test
   ```
   *Expected outcome: New TDD cancellation tests and existing tests pass.*
2. Check Deno compilation:
   ```bash
   deno check src/main.ts
   ```
   *Expected outcome: No compilation or type errors.*
3. Inspect `src/services/booking.ts`, `src/api/admin.ts`, `src/services/notify.ts` and `src/ui/pages/admin/Schedule.tsx` to ensure all proposed components are structured correctly.

---

## Proposed Design / Implementation Plan

### A. Service Layer Enhancements (`src/services/booking.ts`)
Modify `cancelBooking` to check booking existence, validate the state change, and return the updated booking:
```typescript
export async function cancelBooking(
  id: string,
): Promise<{ success: boolean; error?: string; booking?: Booking }> {
  const booking = await kv.get<Booking>(keys.booking(id));
  if (!booking.value) {
    return { success: false, error: "Booking not found" };
  }

  const b = booking.value;
  if (b.status === "cancelled") {
    return { success: false, error: "Booking is already cancelled" };
  }
  if (b.status === "completed") {
    return { success: false, error: "Cannot cancel completed bookings" };
  }

  const updated: Booking = {
    ...b,
    status: "cancelled",
    decidedAt: new Date().toISOString(),
  };

  await kv.set(keys.booking(id), updated);
  return { success: true, booking: updated };
}
```

### B. Notification Layer (`src/services/notify.ts`)
Add `notifyUserCancelled` function to DM the user via bot:
```typescript
export async function notifyUserCancelled(
  bot: BotContext,
  userId: number,
  booking: Booking,
): Promise<void> {
  const text =
    `⚠️ **Broningiz bekor qilindi**\n\n` +
    `📅 ${booking.date}\n` +
    `⏰ ${booking.start} - ${booking.end}\n\n` +
    `Ushbu o'yin vaqti admin tomonidan bekor qilindi.`;

  await bot.sendMessage(userId, text, { parse_mode: "Markdown" });
}
```
Add integration in `src/bot/decisions.ts`:
```typescript
export async function notifyUserCancellation(booking: Booking): Promise<void> {
  if (!booking.userId) return;
  await notifyUserCancelled(botContext, booking.userId, booking);
}
```

### C. API Layer Updates (`src/api/admin.ts`)
Upgrade `POST /api/admin/bookings/:id/cancel` endpoint:
```typescript
api.post("/api/admin/bookings/:id/cancel", async (c: any) => {
  const id = c.req.param("id");
  const result = await cancelBooking(id);

  if (!result.success) {
    return c.json({ error: result.error }, 400);
  }

  // Notify user
  if (result.booking) {
    try {
      const { notifyUserCancellation } = await import("../bot/decisions.ts");
      await notifyUserCancellation(result.booking);
    } catch (e) {
      console.error("Failed to notify user about cancellation:", e);
    }
  }

  return c.json({ success: true });
});
```

### D. UI Enhancements (`src/ui/pages/admin/Schedule.tsx`)
1. **Interactive Script Addition**: In `scheduleScript` (line 78), append the AJAX cancel click handler:
   ```javascript
   async function handleCancel(id, btn) {
     if (!confirm("Haqiqatan ham ushbu bronni bekor qilmoqchimisiz?")) return;
     btn.disabled = true;
     var oldLabel = btn.innerHTML;
     btn.innerHTML = '<span class="inline-block w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin"></span>';

     try {
       var initData = window.Telegram?.WebApp?.initData || '';
       var res = await fetch('/api/admin/bookings/' + id + '/cancel', {
         method: 'POST',
         headers: { 'Authorization': 'Bearer ' + initData }
       });
       var data = await res.json();

       if (res.ok && data.success) {
         window.toast("Bron bekor qilindi!", 'success');
         var dateStr = document.getElementById('manualDate')?.value || '';
         htmx.ajax('GET', '/app/admin/schedule?date=' + encodeURIComponent(dateStr), '#app-content');
       } else {
         window.toast(data.error || "Xatolik yuz berdi", 'error');
         btn.disabled = false;
         btn.innerHTML = oldLabel;
       }
     } catch(e) {
       window.toast("Xato: " + e.message, 'error');
       btn.disabled = false;
       btn.innerHTML = oldLabel;
     }
   }
   ```
2. **Button Markup**: Update `slot.isBusy` rendering to include a cancel button:
   ```tsx
   return slot.isBusy
     ? (
       <div class="flex-1 border-b border-crm-borderSoft border-dashed last:border-b-0 bg-crm-primarySoft/55 flex items-center justify-between gap-3 px-3">
         <span class="text-[13px] font-bold text-crm-primary flex items-center min-w-0">
           <Icon
             name="checkCircle"
             class="w-3.5 h-3.5 mr-1.5 shrink-0"
           />
           <span class="truncate">
             {booking?.clientName || "Band"}
           </span>
         </span>
         <div class="flex items-center gap-2 shrink-0">
           {booking?.clientPhone
             ? (
               <a
                 href={`tel:${booking.clientPhone.replace(/\s+/g, "")}`}
                 class="text-[12px] font-bold text-crm-primary tabular-nums focus-ring rounded-md"
               >
                 {booking.clientPhone}
               </a>
             )
             : null}
           {booking?.id ? (
             <button
               onclick={`handleCancel('${booking.id}', this)`}
               class="h-8 px-2.5 rounded-[10px] bg-crm-dangerSoft text-crm-danger font-bold text-[12px] tap-scale focus-ring flex items-center justify-center transition-colors hover:bg-crm-danger hover:text-white"
             >
               Bekor qilish
             </button>
           ) : null}
         </div>
       </div>
     )
   ```

### E. TDD Test Cases to Write (`src/cancellation_test.ts`)
Create a new file `src/cancellation_test.ts` to perform TDD assertions:
1. **Service Tests**:
   - Create a test `cancelBooking - transitions confirmed to cancelled`:
     - Instantiates a dummy booking in status `"confirmed"`.
     - Calls `cancelBooking(id)`.
     - Asserts the KV booking status is `"cancelled"`.
   - Create a test `cancelBooking - releases busy slot`:
     - Checks `getDayAvailability` before cancellation (should show `isBusy: true`).
     - Cancels booking.
     - Checks `getDayAvailability` after cancellation (should show `isBusy: false`).
2. **API Tests**:
   - Create a test `POST /api/admin/bookings/:id/cancel - checks admin authorization`:
     - Calls route without auth header, verifies 401.
   - Create a test `POST /api/admin/bookings/:id/cancel - cancels existing booking`:
     - Prepares mock data.
     - Calls route with correct auth headers.
     - Verifies status is changed to `"cancelled"`.
