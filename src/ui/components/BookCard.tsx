/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { Icon } from "./LucideIcons.tsx";
import { getSettings } from "../../kv.ts";
import { getBookableDurations } from "../../services/booking.ts";

function formatDuration(durationMin: number): string {
  if (durationMin % 60 === 0) return `${durationMin / 60} soat`;
  return `${durationMin} daqiqa`;
}

export const UserBookCard: FC<{ date?: string; start?: string }> = async ({
  date,
  start,
}) => {
  if (
    !date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !start ||
    !/^\d{2}:\d{2}$/.test(start)
  ) {
    return <div class="hidden"></div>; // Invalid request
  }

  const settings = await getSettings() ?? {
    openTime: "08:00",
    closeTime: "23:00",
    horizonDays: 7,
    minDurMin: 60,
    maxDurMin: 180,
    snapMin: 30,
  };
  const durations = getBookableDurations(start, settings);

  return (
    <div
      id="book-modal-wrapper"
      class="relative z-50"
      data-refresh-date={date}
    >
      {/* Backdrop */}
      <div 
        id="book-modal-backdrop" 
        class="fixed inset-0 bg-black/40 opacity-0 transition-opacity" 
        aria-hidden="true"
        onclick="closeBookCard()"
      ></div>

      {/* Bottom Sheet Modal */}
      <div 
        id="book-modal-sheet" 
        class="fixed inset-x-0 bottom-0 bg-white rounded-t-[24px] shadow-2xl translate-y-full transition-transform"
      >
        <div class="flex flex-col items-center p-4">
          <div class="w-12 h-1.5 bg-gray-300 rounded-full mb-4"></div>
          
          <div class="w-full">
            <h2 class="text-xl font-bold text-crm-textMain mb-1">Bron qilish</h2>
            <p class="text-sm text-crm-textMuted mb-6">{date} kungi {start} vaqti uchun</p>

            <form 
              hx-post="/api/requests" 
              hx-swap="none"
              class="space-y-4"
            >
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="start" value={start} />
              
              <div>
                <label class="block text-sm font-semibold text-crm-textMain mb-2">Qancha vaqt o'ynaysiz?</label>
                {durations.length === 0
                  ? <p class="text-sm font-medium text-crm-danger">Bu vaqtda minimal davomiylikka yetarli bo'sh vaqt yo'q.</p>
                  : null}
                <div class="grid grid-cols-2 gap-3">
                  {durations.map((duration, index) => (
                    <label class="relative flex cursor-pointer">
                      <input
                        type="radio"
                        name="duration"
                        value={duration}
                        class="peer sr-only"
                        checked={index === 0}
                      />
                      <div class="w-full flex items-center justify-center p-3 rounded-xl border-2 border-crm-borderSoft bg-crm-surfaceSoft text-crm-textMain font-medium peer-checked:border-crm-primary peer-checked:bg-crm-primarySoft/30 transition-colors">
                        {formatDuration(duration)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div class="pt-4 pb-safe">
                <button 
                  type="submit" 
                  disabled={durations.length === 0}
                  class="w-full h-14 bg-crm-primary text-white rounded-[16px] font-bold text-[15px] flex items-center justify-center gap-2 tap-scale"
                >
                  <Icon name="checkCircle" class="w-5 h-5" />
                  So'rov yuborish
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <script>
        {raw(`
          (function() {
            var backdrop = document.getElementById('book-modal-backdrop');
            var sheet = document.getElementById('book-modal-sheet');
            var wrapper = document.getElementById('book-modal-wrapper');

            // Animate in
            if (window.gsap) {
              gsap.to(backdrop, { opacity: 1, duration: 0.3 });
              gsap.to(sheet, { y: 0, duration: 0.4, ease: 'back.out(1.1)' });
            } else {
              backdrop.classList.remove('opacity-0');
              sheet.classList.remove('translate-y-full');
            }

            window.closeBookCard = function() {
              if (window.gsap) {
                gsap.to(backdrop, { opacity: 0, duration: 0.2 });
                gsap.to(sheet, { y: '100%', duration: 0.3, ease: 'power2.in', onComplete: function() {
                  wrapper.remove();
                }});
              } else {
                backdrop.classList.add('opacity-0');
                sheet.classList.add('translate-y-full');
                setTimeout(function() { wrapper.remove(); }, 300);
              }
            };
            
            // Allow form submisssion to trigger success toast
            document.body.addEventListener('htmx:afterRequest', function(evt) {
              if (evt.detail.elt.tagName === 'FORM' && evt.detail.successful) {
                 window.toast("So'rov yuborildi!", "success");
                 window.closeBookCard();
                 setTimeout(function() {
                    // refresh week view
                    var refreshDate = wrapper.getAttribute('data-refresh-date');
                    htmx.ajax('GET', '/app/user/week?date=' + encodeURIComponent(refreshDate || ''), '#app-content');
                 }, 500);
              }
            }, { once: true });
          })();
        `)}
      </script>
    </div>
  );
};
