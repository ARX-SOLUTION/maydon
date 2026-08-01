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

function calculateEndTime(startTime: string, durationMin: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMin;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
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
    return <div class="hidden"></div>;
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
        class="fixed inset-0 bg-crm-textMain/40 backdrop-blur-[6px] opacity-0 transition-opacity" 
        aria-hidden="true"
        onclick="closeBookCard()"
      ></div>

      {/* Bottom Sheet Modal */}
      <div 
        id="book-modal-sheet" 
        class="fixed inset-x-0 bottom-0 glass-panel border-t border-crm-borderSoft/30 rounded-t-r-xl shadow-floating translate-y-full transition-transform max-w-[480px] mx-auto"
      >
        <div class="flex flex-col items-center p-5 pb-safe">
          {/* Drag Handle */}
          <div class="w-12 h-1.5 bg-crm-borderSoft/80 rounded-full mb-5 cursor-grab"></div>
          
          <div class="w-full space-y-5">
            {/* Header / Hero info */}
            <div>
              <div class="flex items-center justify-between">
                <h2 class="font-display text-[22px] font-extrabold text-crm-textMain tracking-tight">Bron qilish</h2>
                <button
                  type="button"
                  onclick="closeBookCard()"
                  class="w-8 h-8 rounded-full glass-surface flex items-center justify-center text-crm-textMuted tap-scale"
                >
                  <Icon name="xCircle" class="w-5 h-5" />
                </button>
              </div>
              <p class="text-[13px] text-crm-textMuted font-semibold mt-0.5">{date} kuni uchun vaqt tanlang</p>
            </div>

            {/* Summary info card */}
            <div class="glass-surface p-3.5 rounded-r-sm flex items-center justify-between border border-crm-borderSoft/30">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-r-xs bg-crm-primarySoft text-crm-primary flex items-center justify-center font-display font-extrabold text-[15px]">
                  <Icon name="clock" class="w-5 h-5" />
                </div>
                <div>
                  <span class="text-[11px] font-bold text-crm-textMuted uppercase tracking-wider block">Boshlanish vaqti</span>
                  <span class="font-display text-[18px] font-extrabold text-crm-textMain tabular-nums">{start}</span>
                </div>
              </div>
              <div class="text-right">
                <span class="text-[11px] font-bold text-crm-textMuted uppercase tracking-wider block">Holat</span>
                <span class="text-[12px] font-bold text-crm-warning px-2 py-0.5 rounded-r-xs bg-crm-warningSoft inline-block">Admin tasdig'i kerak</span>
              </div>
            </div>

            <form 
              id="bookCardForm"
              hx-post="/api/requests" 
              hx-swap="none"
              class="space-y-5"
            >
              <input type="hidden" name="date" value={date} />
              <input type="hidden" name="start" value={start} />
              
              <div>
                <label class="block font-display text-[14px] font-bold text-crm-textMain mb-2.5">
                  Qancha vaqt o'ynaysiz?
                </label>
                {durations.length === 0
                  ? <p class="text-[13px] font-bold text-crm-danger bg-crm-dangerSoft p-3.5 rounded-r-sm border border-crm-danger/20">Bu vaqtda minimal davomiylikka yetarli bo'sh vaqt yo'q.</p>
                  : null}
                <div class="grid grid-cols-1 gap-2.5">
                  {durations.map((duration, index) => {
                    const endTime = calculateEndTime(start, duration);
                    return (
                      <label class="relative flex cursor-pointer group">
                        <input
                          type="radio"
                          name="duration"
                          value={duration}
                          class="peer sr-only"
                          checked={index === 0}
                          onchange={`updateSelectedDuration('${start}', ${duration})`}
                        />
                        <div class="w-full flex items-center justify-between py-3.5 px-4 rounded-r-sm border border-crm-borderSoft/60 glass-surface text-crm-textMain font-semibold text-[15px] transition-all duration-200 peer-checked:border-crm-primary/50 peer-checked:bg-crm-primarySoft/60 peer-checked:text-crm-primary peer-checked:shadow-soft group-active:scale-[0.98]">
                          <div class="flex items-center gap-2.5">
                            <div class="w-4 h-4 rounded-full border-2 border-crm-borderSoft peer-checked:border-crm-primary flex items-center justify-center">
                              <div class="w-2 h-2 rounded-full bg-crm-primary opacity-0 peer-checked:opacity-100"></div>
                            </div>
                            <span class="font-display font-extrabold">{formatDuration(duration)}</span>
                          </div>
                          <span class="font-display text-[14px] font-bold text-crm-textMuted tabular-nums">
                            {start} – {endTime}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div class="pt-2">
                <button 
                  id="bookCardSubmitBtn"
                  type="submit" 
                  disabled={durations.length === 0}
                  class="w-full min-h-[52px] bg-crm-primary text-white rounded-r-sm font-display font-extrabold text-[16px] flex items-center justify-center gap-2 tap-scale shadow-floating disabled:opacity-50 disabled:shadow-none hover:brightness-110"
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
            var twa = window.Telegram?.WebApp;

            // Animate in
            if (window.gsap) {
              gsap.to(backdrop, { opacity: 1, duration: 0.3 });
              gsap.to(sheet, { y: 0, duration: 0.4, ease: 'back.out(1.1)' });
            } else {
              backdrop.classList.remove('opacity-0');
              sheet.classList.remove('translate-y-full');
            }

            // Handle Telegram BackButton & MainButton
            if (twa) {
              try {
                if (twa.BackButton) {
                  twa.BackButton.show();
                  twa.BackButton.onClick(window.closeBookCard);
                }
              } catch(e) {}
            }

            window.closeBookCard = function() {
              if (twa) {
                try {
                  if (twa.BackButton) twa.BackButton.hide();
                } catch(e) {}
              }
              if (window.gsap) {
                gsap.to(backdrop, { opacity: 0, duration: 0.2 });
                gsap.to(sheet, { y: '100%', duration: 0.3, ease: 'power2.in', onComplete: function() {
                  if (wrapper) wrapper.remove();
                }});
              } else {
                if (backdrop) backdrop.classList.add('opacity-0');
                if (sheet) sheet.classList.add('translate-y-full');
                setTimeout(function() { if (wrapper) wrapper.remove(); }, 300);
              }
            };
            
            // Handle form submission completion
            document.body.addEventListener('htmx:afterRequest', function(evt) {
              if (evt.detail.elt.id === 'bookCardForm' && evt.detail.successful) {
                 window.toast("So'rov yuborildi!", "success");
                 window.closeBookCard();
                 setTimeout(function() {
                    var refreshDate = wrapper.getAttribute('data-refresh-date');
                    htmx.ajax('GET', '/app/user/week?date=' + encodeURIComponent(refreshDate || ''), '#app-content');
                 }, 400);
              }
            }, { once: true });
          })();

          function updateSelectedDuration(start, durationMin) {
            // Helper for live preview if needed
          }
        `)}
      </script>
    </div>
  );
};
