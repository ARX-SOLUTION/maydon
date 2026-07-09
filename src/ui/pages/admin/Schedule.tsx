/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { AppShell, Card, PageHeader } from "../../components/UIComponents.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getDayAvailability } from "../../../services/availability.ts";
import { getBookingsByDay, getSettings } from "../../../kv.ts";
import {
  dateFromYmd,
  formatUzLongDate,
  formatUzShortDay,
  toYmd,
} from "../../date.ts";

const scheduleScript = `
function setManualPanel(open) {
  var panel = document.getElementById('manualBookingPanel');
  if (!panel) return;
  panel.classList.toggle('hidden', !open);
  if (open) {
    var name = document.getElementById('manualClientName');
    if (name) name.focus();
  }
}

function openManualBooking(date, start, end) {
  var dateEl = document.getElementById('manualDate');
  var startEl = document.getElementById('manualStart');
  var endEl = document.getElementById('manualEnd');
  if (dateEl) dateEl.value = date || dateEl.value;
  if (startEl) startEl.value = start || startEl.value;
  if (endEl) endEl.value = end || endEl.value;
  setManualPanel(true);
}

async function submitManualBooking(btn) {
  var payload = {
    clientName: document.getElementById('manualClientName')?.value || '',
    clientPhone: document.getElementById('manualPhone')?.value || '',
    date: document.getElementById('manualDate')?.value || '',
    start: document.getElementById('manualStart')?.value || '',
    end: document.getElementById('manualEnd')?.value || ''
  };
  if (!payload.clientName || !payload.date || !payload.start || !payload.end) {
    window.toast("Mijoz, sana va vaqtni to'ldiring", 'error');
    return;
  }

  var oldLabel = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span> Saqlanmoqda...';
  try {
    var initData = window.Telegram?.WebApp?.initData || '';
    var res = await fetch('/api/admin/bookings', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + initData,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    var data = await res.json();
    if (res.ok && data.success) {
      window.toast("Bron qo'shildi", 'success');
      htmx.ajax('GET', '/app/admin/schedule?date=' + encodeURIComponent(payload.date), '#app-content');
    } else {
      window.toast(data.error || 'Xatolik yuz berdi', 'error');
      btn.disabled = false;
      btn.innerHTML = oldLabel;
    }
  } catch (e) {
    window.toast('Xato: ' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = oldLabel;
  }
}
`;

export const AdminSchedule: FC<{ selectedDate?: string }> = async (
  { selectedDate },
) => {
  const settings = await getSettings();
  const today = new Date();
  const targetDateObj = selectedDate ? dateFromYmd(selectedDate) : today;
  const targetDate = toYmd(targetDateObj);
  const horizon = Math.min(Math.max(settings?.horizonDays ?? 7, 3), 14);

  const days = Array.from({ length: horizon }).map((_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dateStr = toYmd(d);
    return {
      dateStr,
      weekday: formatUzShortDay(d),
      day: d.getDate(),
      isToday: i === 0,
      active: dateStr === targetDate,
    };
  });

  let dayData;
  try {
    dayData = await getDayAvailability(targetDate);
  } catch {
    dayData = {
      slots: [],
      openTime: settings?.openTime ?? "08:00",
      closeTime: settings?.closeTime ?? "23:00",
    };
  }
  const bookings = await getBookingsByDay(targetDate);
  const bookingsById = new Map(
    bookings.map((booking) => [booking.id, booking]),
  );

  const groupedSlots: { hour: string; slots: any[] }[] = [];
  let currentGroup: { hour: string; slots: any[] } | null = null;
  for (const slot of dayData.slots) {
    const hour = slot.start.split(":")[0] + ":00";
    if (!currentGroup || currentGroup.hour !== hour) {
      if (currentGroup) groupedSlots.push(currentGroup);
      currentGroup = { hour, slots: [slot] };
    } else {
      currentGroup.slots.push(slot);
    }
  }
  if (currentGroup) groupedSlots.push(currentGroup);

  const selectedLabel = formatUzLongDate(targetDateObj);

  return (
    <AppShell>
      <PageHeader
        title="Jadval"
        subtitle={selectedLabel}
        rightNode={
          <button
            onclick={`openManualBooking('${targetDate}', '${dayData.openTime}', '${dayData.closeTime}')`}
            aria-label="Qo'lda bron qo'shish"
            class="min-w-[44px] min-h-[44px] bg-crm-primary text-white rounded-full flex items-center justify-center shadow-floating tap-scale focus-ring"
          >
            <Icon name="plus" class="w-5 h-5" />
          </button>
        }
      />

      <div class="px-5 space-y-4">
        <div id="manualBookingPanel" class="hidden gsap-stagger">
          <Card>
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-[15px] font-bold">Qo'lda bron qo'shish</h2>
                <p class="text-[12px] text-crm-textMuted mt-1">
                  Admin bronlari darhol tasdiqlangan holatda saqlanadi.
                </p>
              </div>
              <button
                onclick="setManualPanel(false)"
                aria-label="Yopish"
                class="min-w-[44px] min-h-[44px] rounded-full text-crm-textMuted hover:bg-crm-surfaceSoft tap-scale focus-ring flex items-center justify-center"
              >
                <Icon name="xCircle" class="w-5 h-5" />
              </button>
            </div>
            <div class="grid grid-cols-1 gap-3">
              <div>
                <label
                  for="manualClientName"
                  class="block text-[12px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
                >
                  Mijoz
                </label>
                <input
                  id="manualClientName"
                  autocomplete="name"
                  class="w-full h-[48px] bg-crm-surfaceSoft rounded-[14px] px-4 text-[15px] font-medium border border-crm-borderSoft placeholder:text-crm-textMuted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                  placeholder="Masalan: Ali jamoasi"
                />
              </div>
              <div>
                <label
                  for="manualPhone"
                  class="block text-[12px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
                >
                  Telefon
                </label>
                <input
                  id="manualPhone"
                  type="tel"
                  autocomplete="tel"
                  class="w-full h-[48px] bg-crm-surfaceSoft rounded-[14px] px-4 text-[15px] font-medium border border-crm-borderSoft placeholder:text-crm-textMuted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 tabular-nums"
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label
                    for="manualDate"
                    class="block text-[11px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
                  >
                    Sana
                  </label>
                  <input
                    id="manualDate"
                    type="date"
                    value={targetDate}
                    class="w-full h-[46px] bg-crm-surfaceSoft rounded-[14px] px-3 text-[13px] font-bold border border-crm-borderSoft focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                  />
                </div>
                <div>
                  <label
                    for="manualStart"
                    class="block text-[11px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
                  >
                    Boshlanish
                  </label>
                  <input
                    id="manualStart"
                    type="time"
                    value={dayData.openTime}
                    step={(settings?.snapMin ?? 30) * 60}
                    class="w-full h-[46px] bg-crm-surfaceSoft rounded-[14px] px-3 text-[13px] font-bold border border-crm-borderSoft focus:outline-none focus:ring-2 focus:ring-crm-primary/40 tabular-nums"
                  />
                </div>
                <div>
                  <label
                    for="manualEnd"
                    class="block text-[11px] font-semibold text-crm-textMuted uppercase mb-1 px-1"
                  >
                    Tugash
                  </label>
                  <input
                    id="manualEnd"
                    type="time"
                    value={dayData.closeTime}
                    step={(settings?.snapMin ?? 30) * 60}
                    class="w-full h-[46px] bg-crm-surfaceSoft rounded-[14px] px-3 text-[13px] font-bold border border-crm-borderSoft focus:outline-none focus:ring-2 focus:ring-crm-primary/40 tabular-nums"
                  />
                </div>
              </div>
            </div>
            <button
              onclick="submitManualBooking(this)"
              class="w-full min-h-[48px] bg-crm-primary text-white rounded-[16px] font-bold tap-scale focus-ring shadow-floating flex items-center justify-center gap-2"
            >
              <Icon name="check" class="w-5 h-5" /> Saqlash
            </button>
          </Card>
        </div>

        <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-2 gsap-stagger">
          {days.map((d) => (
            <a
              href={`/app/admin/schedule?date=${d.dateStr}`}
              hx-get={`/app/admin/schedule?date=${d.dateStr}`}
              hx-target="#app-content"
              hx-push-url="true"
              aria-label={`${d.weekday}, ${d.day} jadvalini ko'rish`}
              aria-current={d.active ? "date" : undefined}
              class={`flex flex-col items-center justify-center min-w-[68px] h-[76px] rounded-[20px] tap-scale focus-ring ${
                d.active
                  ? "bg-crm-primary text-white shadow-floating"
                  : "bg-crm-surface text-crm-textMain shadow-soft hover:shadow-softHover"
              }`}
            >
              <span
                class={`text-[12px] font-semibold ${
                  d.active ? "text-white/80" : "text-crm-textMuted"
                }`}
              >
                {d.weekday}
              </span>
              <span class="text-[20px] font-extrabold mt-0.5">{d.day}</span>
              {d.isToday
                ? (
                  <div
                    class={`w-1 h-1 rounded-full mt-1 ${
                      d.active ? "bg-white" : "bg-crm-primary"
                    }`}
                  >
                  </div>
                )
                : <div class="h-2"></div>}
            </a>
          ))}
        </div>

        <Card class="p-0 overflow-hidden gsap-stagger">
          <div class="p-4 border-b border-crm-borderSoft bg-crm-surfaceSoft flex justify-between items-center gap-3">
            <span class="font-bold text-[15px]">Kun jadvali</span>
            <span class="text-[12px] font-medium text-crm-textMuted bg-crm-surface px-2 py-1 rounded-md shadow-sm">
              {dayData.openTime} - {dayData.closeTime}
            </span>
          </div>
          <div class="flex flex-col">
            {groupedSlots.length === 0
              ? (
                <div class="p-8 text-center text-crm-textMuted text-sm font-medium">
                  Bu sana uchun jadval topilmadi
                </div>
              )
              : null}
            {groupedSlots.map((group) => (
              <div class="flex border-b border-crm-borderSoft last:border-b-0 h-[80px]">
                <div class="w-[60px] shrink-0 border-r border-crm-borderSoft flex flex-col justify-between py-1 items-center bg-crm-surfaceSoft/30">
                  <span class="text-[12px] font-semibold text-crm-textMuted -mt-3 bg-crm-surface px-1">
                    {group.hour}
                  </span>
                </div>
                <div class="flex-1 flex flex-col">
                  {group.slots.map((slot: any) => {
                    const booking = slot.bookingId
                      ? bookingsById.get(slot.bookingId)
                      : null;
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
                      : (
                        <button
                          onclick={`openManualBooking('${targetDate}', '${slot.start}', '${slot.end}')`}
                          class="flex-1 min-h-[40px] border-b border-crm-borderSoft border-dashed last:border-b-0 transition-[background-color] duration-150 ease-out active:bg-crm-primarySoft/50 hover:bg-crm-primarySoft/35 flex items-center px-3 focus-ring"
                          aria-label={`${slot.start} uchun qo'lda bron qo'shish`}
                        >
                          <span class="text-[12px] font-semibold text-crm-textMuted">
                            + {slot.start} Bron qo'shish
                          </span>
                        </button>
                      );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div class="h-4"></div>
      </div>

      <script>{raw(scheduleScript)}</script>
      <RoleBottomNav role="admin" activeId="schedule" />
    </AppShell>
  );
};
