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
        class="fixed inset-0 bg-crm-textMain/40 backdrop-blur-[4px] opacity-0 transition-opacity" 
        aria-hidden="true"
        onclick="closeBookCard()"
      ></div>

      {/* Bottom Sheet Modal */}
      <div 
        id="book-modal-sheet" 
        class="fixed inset-x-0 bottom-0 bg-crm-surface/95 backdrop-blur-xl border-t border-crm-borderSoft/30 rounded-t-[32px] shadow-[0_-12px_40px_rgba(0,0,0,0.12)] translate-y-full transition-transform"
      >
        <div class="flex flex-col items-center p-5 pb-safe">
          <div class="w-12 h-1.5 bg-crm-borderSoft/80 rounded-full mb-6"></div>
          
          <div class="w-full">
            <h2 class="text-[22px] font-bold text-crm-textMain tracking-tight mb-1">Bron qilish</h2>
            <p class="text-[14px] text-crm-textMuted mb-6 font-medium">{date} kungi {start} vaqti uchun</p>

            <form 
              hx-post="/api/requests" 
              hx-swap="none"
              class="space-y-6"
            >
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="start" value={start} />
              
              <div>
                <label class="block text-[14px] font-semibold text-crm-textMain mb-3">Qancha vaqt o'ynaysiz?</label>
                {durations.length === 0
                  ? <p class="text-[13px] font-medium text-crm-danger bg-crm-dangerSoft p-3 rounded-2xl">Bu vaqtda minimal davomiylikka yetarli bo'sh vaqt yo'q.</p>
                  : null}
                <div class="grid grid-cols-2 gap-3">
                  {durations.map((duration, index) => (
                    <label class="relative flex cursor-pointer group">
                      <input
                        type="radio"
                        name="duration"
                        value={duration}
                        class="peer sr-only"
                        checked={index === 0}
                      />
                      <div class="w-full flex items-center justify-center py-3.5 px-3 rounded-[16px] border border-crm-borderSoft/80 bg-crm-surfaceSoft/60 text-crm-textMain font-semibold text-[15px] transition-all duration-200 peer-checked:border-crm-primary/40 peer-checked:bg-crm-primarySoft/50 peer-checked:text-crm-primary peer-checked:shadow-[0_4px_16px_rgba(37,99,235,0.12)] group-active:scale-[0.98]">
                        {formatDuration(duration)}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div class="pt-2">
                <button 
                  type="submit" 
                  disabled={durations.length === 0}
                  class="w-full h-14 bg-gradient-to-r from-crm-primary to-blue-500 text-white rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 tap-scale shadow-[0_8px_24px_rgba(37,99,235,0.25)] disabled:opacity-50 disabled:shadow-none"
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
