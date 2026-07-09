/** @jsxImportSource hono/jsx */
import { raw } from 'hono/html';
import type { FC } from 'hono/jsx';
import { AppShell, PageHeader, Card } from '../../components/UIComponents.tsx';
import { RoleBottomNav } from '../../components/RoleBottomNav.tsx';
import { Icon } from '../../components/LucideIcons.tsx';
import { getDayAvailability } from '../../../services/availability.ts';
import { getSettings } from '../../../kv.ts';
import { timeToMinutes } from '../../../services/booking.ts';

const bookingScript = `
var SLOT_MAP = __SLOT_MAP__;

function formatDuration(min) {
  var h = Math.floor(min / 60);
  var m = min % 60;
  if (h && m) return h + ' soat ' + m + ' daqiqa';
  if (h) return h + ' soat';
  return m + ' daqiqa';
}

function updateEnds() {
  var startEl = document.getElementById('bookStart');
  var endEl = document.getElementById('bookEnd');
  var hint = document.getElementById('durationHint');
  var btn = document.getElementById('submitBtn');
  var ends = SLOT_MAP[startEl.value] || [];

  endEl.innerHTML = '';
  ends.forEach(function(end) {
    var opt = document.createElement('option');
    opt.value = end;
    opt.textContent = end;
    endEl.appendChild(opt);
  });

  var hasOptions = ends.length > 0;
  endEl.disabled = !hasOptions;
  if (btn) btn.disabled = !hasOptions;

  if (hasOptions && hint) {
    var startMin = parseInt(startEl.value.split(':')[0], 10) * 60 + parseInt(startEl.value.split(':')[1], 10);
    var endMin = parseInt(endEl.value.split(':')[0], 10) * 60 + parseInt(endEl.value.split(':')[1], 10);
    hint.textContent = formatDuration(endMin - startMin) + ' tanlandi';
  } else if (hint) {
    hint.textContent = "Bu vaqtdan band qilib bo'lmaydi";
  }
}

async function submitBooking() {
  var startEl = document.getElementById('bookStart');
  var endEl = document.getElementById('bookEnd');
  var nameEl = document.getElementById('bookName');
  var phoneEl = document.getElementById('bookPhone');
  var dateEl = document.getElementById('bookDate');
  if (!startEl || !endEl || !nameEl || !phoneEl || !dateEl) return;

  var start = startEl.value;
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

updateEnds();

// Booking is gated on completed bot onboarding (phone + name) — check before letting anyone submit
(async function checkActive() {
  var formEl = document.getElementById('bookingForm');
  var noticeEl = document.getElementById('inactiveNotice');
  if (!formEl || !noticeEl) return;
  try {
    var initData = window.Telegram?.WebApp?.initData || '';
    var res = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + initData } });
    var data = await res.json();
    if (res.ok && !data.isActive) {
      formEl.style.display = 'none';
      noticeEl.classList.remove('hidden');
    }
  } catch (e) {
    // network hiccup — leave the form as-is, the server-side check is the real gate
  }
})();
`;

function fmtHours(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} soat` : `${h} soat ${m} daqiqa`;
}

export const UserDayView: FC<{ date?: string; start?: string }> = async ({ date, start }) => {
  const dateStr = date || new Date().toISOString().slice(0, 10);
  const dateObj = new Date(dateStr);
  const displayDate = dateObj.toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' });

  let dayData;
  let settings = await getSettings();
  try {
    dayData = await getDayAvailability(dateStr);
  } catch {
    dayData = { slots: [], openTime: '08:00', closeTime: '23:00' };
  }
  const minDur = settings?.minDurMin ?? 60;
  const maxDur = settings?.maxDurMin ?? 180;

  // Build start -> valid contiguous end times (respects min/max duration and booked gaps)
  const slotMap: Record<string, string[]> = {};
  for (let i = 0; i < dayData.slots.length; i++) {
    if (dayData.slots[i].isBusy) continue;
    const startTime = dayData.slots[i].start;
    const ends: string[] = [];
    for (let j = i; j < dayData.slots.length && !dayData.slots[j].isBusy; j++) {
      const duration = timeToMinutes(dayData.slots[j].end) - timeToMinutes(startTime);
      if (duration >= minDur && duration <= maxDur) ends.push(dayData.slots[j].end);
      if (duration >= maxDur) break;
    }
    if (ends.length > 0) slotMap[startTime] = ends;
  }

  const startOptions = Object.keys(slotMap);
  const selectedStart = start && slotMap[start] ? start : startOptions[0];
  const endOptions = selectedStart ? slotMap[selectedStart] : [];

  return (
    <AppShell>
      <PageHeader
        title="Bron qilish"
        subtitle={displayDate}
      />
      <div class="px-5 space-y-5">
        <input type="hidden" id="bookDate" value={dateStr} />

        {/* Shown only if the bot-onboarding gate blocks booking (checked client-side) */}
        <div id="inactiveNotice" class="hidden p-4 bg-crm-warningSoft border border-crm-warning/30 rounded-[18px] flex items-start gap-3 gsap-stagger">
          <div class="w-8 h-8 rounded-full bg-crm-warning/20 flex items-center justify-center shrink-0">
            <Icon name="bell" class="w-4 h-4 text-crm-warning" />
          </div>
          <p class="text-[13px] text-crm-textMain leading-relaxed">
            Band qilishdan oldin ro'yxatdan o'tishni yakunlang: Telegram botga qayting va <b>/start</b> bosing, telefon raqamingizni yuboring va ismingizni yozing.
          </p>
        </div>

        <div id="bookingForm" class="space-y-5">

        {/* Time selection */}
        <Card class="gsap-stagger">
          <h2 class="text-[15px] font-bold px-1 mb-1">Vaqtni tanlang</h2>
          <p class="text-[12px] text-crm-textMuted px-1 -mt-1 mb-1">Har bir bron {fmtHours(minDur)} dan {fmtHours(maxDur)} gacha bo'lishi mumkin</p>

          <div class="flex items-center gap-3 bg-crm-surfaceSoft rounded-[16px] p-3">
            <div class="flex-1">
              <span class="block text-[11px] font-semibold text-crm-textMuted uppercase tracking-wide mb-1">Boshlanish</span>
              <select id="bookStart" onchange="updateEnds()" disabled={startOptions.length === 0} class="w-full h-[44px] bg-crm-surface rounded-[12px] px-3 font-bold text-[16px] tabular-nums border border-crm-borderSoft">
                {startOptions.length > 0
                  ? startOptions.map((s) => (
                      <option value={s} selected={s === selectedStart}>{s}</option>
                    ))
                  : <option value="">Bo'sh vaqt yo'q</option>}
              </select>
            </div>
            <div class="text-crm-textMuted mt-4 text-lg font-bold">—</div>
            <div class="flex-1">
              <span class="block text-[11px] font-semibold text-crm-textMuted uppercase tracking-wide mb-1">Tugash</span>
              <select id="bookEnd" disabled={endOptions.length === 0} class="w-full h-[44px] bg-crm-surface rounded-[12px] px-3 font-bold text-[16px] tabular-nums border border-crm-borderSoft">
                {endOptions.length > 0
                  ? endOptions.map((e) => <option value={e}>{e}</option>)
                  : <option value="">—</option>}
              </select>
            </div>
          </div>
          <p id="durationHint" class="text-[12px] font-semibold text-crm-primary px-1">
            {endOptions.length > 0 ? '' : "Bu sana uchun bo'sh vaqt yo'q"}
          </p>
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
          disabled={endOptions.length === 0}
          class="w-full h-[52px] bg-crm-primary text-white rounded-[18px] font-bold text-[16px] shadow-floating active:scale-[0.96] transition-all duration-180 ease-out flex items-center justify-center gap-2 gsap-stagger disabled:opacity-40 disabled:pointer-events-none"
        >
          <Icon name="check" class="w-5 h-5" /> So'rov yuborish
        </button>

        </div>
        <div class="h-4"></div>
      </div>
      <script>{raw(bookingScript.replace('__SLOT_MAP__', JSON.stringify(slotMap)))}</script>
      <RoleBottomNav role="user" activeId="day" />
    </AppShell>
  );
};
