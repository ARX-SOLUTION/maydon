/** @jsxImportSource hono/jsx */
import { raw } from 'hono/html';
import type { FC } from 'hono/jsx';
import { AppShell, PageHeader, Card } from '../../components/UIComponents.tsx';
import { RoleBottomNav } from '../../components/RoleBottomNav.tsx';
import { Icon } from '../../components/LucideIcons.tsx';
import { getDayAvailability } from '../../../services/availability.ts';

const bookingScript = `
async function submitBooking() {
  var startEl = document.getElementById('bookStart');
  var endEl = document.getElementById('bookEnd');
  var nameEl = document.getElementById('bookName');
  var phoneEl = document.getElementById('bookPhone');
  var dateEl = document.getElementById('bookDate');
  if (!startEl || !endEl || !nameEl || !phoneEl || !dateEl) return;
  
  var start = startEl.value || startEl.textContent;
  var end = endEl.value;
  var clientName = nameEl.value;
  var clientPhone = phoneEl.value;
  var date = dateEl.value;

  if (!start || !end || !clientName || !clientPhone) {
    window.toast("Barcha maydonlarni to'ldiring", 'error');
    return;
  }

  var btn = document.getElementById('submitBtn');
  if (btn) btn.disabled = true;

  try {
    var initData = window.Telegram?.WebApp?.initData || '';
    var res = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + initData,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ date: date, start: start, end: end, clientName: clientName, clientPhone: clientPhone })
    });
    var data = await res.json();
    if (res.ok && data.success) {
      window.toast("So'rov yuborildi! Navbatingiz: #" + (data.queue || '?'), 'success');
      htmx.ajax('GET', '/app/user/requests', '#app-content');
    } else {
      window.toast(data.error || "Xatolik", 'error');
      if (btn) btn.disabled = false;
    }
  } catch(e) {
    window.toast("Xato: " + e.message, 'error');
    if (btn) btn.disabled = false;
  }
}
`;

export const UserDayView: FC<{ date?: string; start?: string }> = async ({ date, start }) => {
  const dateStr = date || new Date().toISOString().slice(0, 10);
  const dateObj = new Date(dateStr);
  const displayDate = dateObj.toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });

  let dayData;
  try {
    dayData = await getDayAvailability(dateStr);
  } catch {
    dayData = { slots: [], openTime: '08:00', closeTime: '23:00' };
  }

  // Build time options from available slots
  const freeSlots = dayData.slots.filter((s: any) => !s.isBusy);

  return (
    <AppShell>
      <PageHeader
        title="Bron qilish"
        subtitle={displayDate}
      />
      <div class="px-5 space-y-5">
        <input type="hidden" id="bookDate" value={dateStr} />

        {/* Time selection */}
        <Card class="gsap-stagger">
          <h2 class="text-[15px] font-bold px-1 mb-1">Vaqtni tanlang</h2>

          <div class="flex items-center gap-3 bg-crm-surfaceSoft rounded-[16px] p-3">
            <div class="flex-1">
              <span class="block text-[11px] font-semibold text-crm-textMuted uppercase tracking-wide mb-1">Boshlanish</span>
              <select id="bookStart" class="w-full h-[44px] bg-crm-surface rounded-[12px] px-3 font-bold text-[16px] tabular-nums border border-crm-borderSoft">
                {freeSlots.length > 0
                  ? freeSlots.map((s: any) => (
                      <option value={s.start} selected={s.start === start}>{s.start}</option>
                    ))
                  : <option value="">Bo'sh vaqt yo'q</option>}
              </select>
            </div>
            <div class="text-crm-textMuted mt-4 text-lg font-bold">—</div>
            <div class="flex-1">
              <span class="block text-[11px] font-semibold text-crm-textMuted uppercase tracking-wide mb-1">Tugash</span>
              <select id="bookEnd" class="w-full h-[44px] bg-crm-surface rounded-[12px] px-3 font-bold text-[16px] tabular-nums border border-crm-borderSoft">
                {freeSlots.length > 0
                  ? freeSlots.map((s: any) => (
                      <option value={s.end}>{s.end}</option>
                    ))
                  : <option value="">—</option>}
              </select>
            </div>
          </div>
        </Card>

        {/* Contact info */}
        <Card class="gsap-stagger">
          <h2 class="text-[15px] font-bold px-1 mb-1">Aloqa ma'lumotlari</h2>
          <div class="space-y-3">
            <div>
              <label class="block text-[12px] font-semibold text-crm-textMuted uppercase mb-1 px-1">Ismingiz</label>
              <input type="text" id="bookName" placeholder="Masalan: Ali"
                class="w-full h-[48px] bg-crm-surfaceSoft rounded-[14px] px-4 text-[15px] font-medium border border-crm-borderSoft placeholder:text-crm-textMuted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 transition" />
            </div>
            <div>
              <label class="block text-[12px] font-semibold text-crm-textMuted uppercase mb-1 px-1">Telefon raqam</label>
              <input type="tel" id="bookPhone" placeholder="+998 90 123 45 67"
                class="w-full h-[48px] bg-crm-surfaceSoft rounded-[14px] px-4 text-[15px] font-medium border border-crm-borderSoft placeholder:text-crm-textMuted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 transition tabular-nums" />
            </div>
          </div>
        </Card>

        {/* Submit */}
        <button
          id="submitBtn"
          onclick="submitBooking()"
          class="w-full h-[52px] bg-crm-primary text-white rounded-[18px] font-bold text-[16px] shadow-floating active:scale-[0.96] transition-all duration-180 ease-out flex items-center justify-center gap-2 gsap-stagger"
        >
          <Icon name="check" class="w-5 h-5" /> So'rov yuborish
        </button>

        <div class="h-4"></div>
      </div>
      <script>{raw(bookingScript)}</script>
      <RoleBottomNav role="user" activeId="day" />
    </AppShell>
  );
};
