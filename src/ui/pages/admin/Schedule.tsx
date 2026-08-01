/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { AppShell, Card, PageHeader } from "../../components/UIComponents.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getDayAvailability } from "../../../services/availability.ts";
import { getBookingsByDay, getSettings } from "../../../kv.ts";
import { dateFromYmd, formatUzLongDate, formatUzShortDay } from "../../date.ts";
import { addCalendarDays, overlaps, tashkentDate } from "../../../services/booking.ts";

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

async function handleCancel(id, btn, date) {
  if (!confirm("Haqiqatan ham ushbu bronni bekor qilmoqchimisiz?")) return;
  if (btn) btn.disabled = true;
  var oldLabel = btn ? btn.innerHTML : '';
  if (btn) btn.innerHTML = '<span class="inline-block w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin"></span>';
  try {
    var initData = window.Telegram?.WebApp?.initData || '';
    var res = await fetch('/api/admin/bookings/' + id + '/cancel', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + initData
      }
    });
    var data = await res.json();
    if (res.ok && data.success) {
      window.toast("Bron bekor qilindi", 'success');
      var dateStr = date || document.getElementById('manualDate')?.value || '';
      htmx.ajax('GET', '/app/admin/schedule?date=' + encodeURIComponent(dateStr), '#app-content');
    } else {
      window.toast(data.error || 'Xatolik yuz berdi', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = oldLabel;
      }
    }
  } catch (e) {
    window.toast('Xato: ' + e.message, 'error');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = oldLabel;
    }
  }
}

async function cancelAdminBooking(id, date) {
  var btn = document.querySelector('button[onclick*="cancelAdminBooking(\\'' + id + '\\'")') ||
            document.querySelector('button[onclick*="cancelAdminBooking(&#39;' + id + '&#39;")');
  await handleCancel(id, btn, date);
}
`;

export const AdminSchedule: FC<{ selectedDate?: string }> = async (
  { selectedDate },
) => {
  const settings = await getSettings();
  const today = tashkentDate();
  const targetDate = selectedDate ?? today;
  const targetDateObj = dateFromYmd(targetDate);
  const horizon = Math.min(Math.max(settings?.horizonDays ?? 7, 3), 14);

  const days = Array.from({ length: horizon }).map((_, i) => {
    const dateStr = addCalendarDays(today, i);
    const d = dateFromYmd(dateStr);
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

  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const pendingCount = pendingBookings.length;
  const busySlotCount = dayData.slots.filter((s: any) => s.isBusy).length;
  const occupancyPct = dayData.slots.length > 0
    ? Math.round((busySlotCount / dayData.slots.length) * 100)
    : 0;
  const freeMinutes = (dayData.slots.length - busySlotCount) * (settings?.snapMin ?? 30);
  const freeLabel = freeMinutes >= 60
    ? `${Math.floor(freeMinutes / 60)}s ${freeMinutes % 60 ? (freeMinutes % 60) + "d" : ""}`.trim()
    : `${freeMinutes}d`;

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
          <Card class="glass-card rounded-r-md border border-crm-borderSoft/40">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="font-display text-[15px] font-extrabold">Qo'lda bron qo'shish</h2>
                <p class="text-[12px] text-crm-textMuted mt-0.5">
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
                  class="block text-[11px] font-bold text-crm-textMuted uppercase mb-1 px-1 tracking-wider"
                >
                  Mijoz
                </label>
                <input
                  id="manualClientName"
                  autocomplete="name"
                  class="w-full h-[48px] glass-surface rounded-r-xs px-4 text-[15px] font-medium border border-crm-borderSoft/40 placeholder:text-crm-textMuted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                  placeholder="Masalan: Ali jamoasi"
                />
              </div>
              <div>
                <label
                  for="manualPhone"
                  class="block text-[11px] font-bold text-crm-textMuted uppercase mb-1 px-1 tracking-wider"
                >
                  Telefon
                </label>
                <input
                  id="manualPhone"
                  type="tel"
                  autocomplete="tel"
                  class="w-full h-[48px] glass-surface rounded-r-xs px-4 text-[15px] font-medium border border-crm-borderSoft/40 placeholder:text-crm-textMuted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 tabular-nums"
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label
                    for="manualDate"
                    class="block text-[10px] font-bold text-crm-textMuted uppercase mb-1 px-1 tracking-wider"
                  >
                    Sana
                  </label>
                  <input
                    id="manualDate"
                    type="date"
                    value={targetDate}
                    class="w-full h-[46px] glass-surface rounded-r-xs px-2.5 text-[13px] font-bold border border-crm-borderSoft/40 focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                  />
                </div>
                <div>
                  <label
                    for="manualStart"
                    class="block text-[10px] font-bold text-crm-textMuted uppercase mb-1 px-1 tracking-wider"
                  >
                    Boshlanish
                  </label>
                  <input
                    id="manualStart"
                    type="time"
                    value={dayData.openTime}
                    step={(settings?.snapMin ?? 30) * 60}
                    class="w-full h-[46px] glass-surface rounded-r-xs px-2 text-[13px] font-bold border border-crm-borderSoft/40 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 tabular-nums"
                  />
                </div>
                <div>
                  <label
                    for="manualEnd"
                    class="block text-[10px] font-bold text-crm-textMuted uppercase mb-1 px-1 tracking-wider"
                  >
                    Tugash
                  </label>
                  <input
                    id="manualEnd"
                    type="time"
                    value={dayData.closeTime}
                    step={(settings?.snapMin ?? 30) * 60}
                    class="w-full h-[46px] glass-surface rounded-r-xs px-2 text-[13px] font-bold border border-crm-borderSoft/40 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 tabular-nums"
                  />
                </div>
              </div>
            </div>
            <button
              onclick="submitManualBooking(this)"
              class="w-full min-h-[48px] bg-crm-primary text-white rounded-r-sm font-display font-bold tap-scale focus-ring shadow-floating flex items-center justify-center gap-2"
            >
              <Icon name="check" class="w-5 h-5" /> Saqlash
            </button>
          </Card>
        </div>

        <div class="grid grid-cols-2 gap-3 gsap-stagger">
          <div class="glass-card rounded-r-md shadow-soft p-3.5 border border-crm-borderSoft/40">
            <span class="text-[11px] font-bold text-crm-textMuted uppercase tracking-wider">
              Bugungi bronlar
            </span>
            <span class="font-display text-[24px] font-extrabold tabular-nums mt-0.5 block text-crm-textMain">
              {confirmedCount}
            </span>
          </div>
          <div class="glass-card rounded-r-md shadow-soft p-3.5 border border-crm-borderSoft/40">
            <span class="text-[11px] font-bold text-crm-textMuted uppercase tracking-wider">
              Bandlik
            </span>
            <span class="font-display text-[24px] font-extrabold tabular-nums mt-0.5 block text-crm-textMain">
              {occupancyPct}%
            </span>
          </div>
          <div class="glass-card rounded-r-md shadow-soft p-3.5 border border-crm-borderSoft/40">
            <span class="text-[11px] font-bold text-crm-textMuted uppercase tracking-wider">
              Bo'sh vaqt
            </span>
            <span class="font-display text-[24px] font-extrabold tabular-nums mt-0.5 block text-crm-textMain">
              {freeLabel}
            </span>
          </div>
          <div class="glass-card rounded-r-md shadow-soft p-3.5 border border-crm-borderSoft/40">
            <span class="text-[11px] font-bold text-crm-textMuted uppercase tracking-wider">
              Pending
            </span>
            <span class={`font-display text-[24px] font-extrabold tabular-nums mt-0.5 block ${pendingCount > 0 ? "text-crm-warning" : "text-crm-textMain"}`}>
              {pendingCount}
            </span>
          </div>
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
              class={`flex flex-col items-center justify-center min-w-[68px] h-[76px] rounded-r-md tap-scale focus-ring transition-all duration-200 ${
                d.active
                  ? "bg-crm-primary text-white shadow-floating scale-105"
                  : "glass-card text-crm-textMain shadow-soft border border-crm-borderSoft/40 hover:bg-crm-surfaceSoft"
              }`}
            >
              <span
                class={`text-[12px] font-bold ${
                  d.active ? "text-white/80" : "text-crm-textMuted"
                }`}
              >
                {d.weekday}
              </span>
              <span class="font-display text-[20px] font-extrabold mt-0.5">{d.day}</span>
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

        <Card class="p-0 overflow-hidden gsap-stagger glass-card rounded-r-md border border-crm-borderSoft/40">
          <div class="p-4 border-b border-crm-borderSoft/40 glass-panel flex justify-between items-center gap-3">
            <span class="font-display font-extrabold text-[15px]">Kun jadvali</span>
            <span class="text-[12px] font-bold text-crm-textMuted glass-surface px-2.5 py-1 rounded-r-xs border border-crm-borderSoft/30">
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
              <div class="flex border-b border-crm-borderSoft/40 last:border-b-0 h-[80px]">
                <div class="w-[60px] shrink-0 border-r border-crm-borderSoft/40 flex flex-col justify-between py-1 items-center glass-surface">
                  <span class="text-[12px] font-bold text-crm-textMuted -mt-3 glass-panel px-1.5 py-0.5 rounded-r-xs border border-crm-borderSoft/30">
                    {group.hour}
                  </span>
                </div>
                <div class="flex-1 flex flex-col">
                  {group.slots.map((slot: any) => {
                    const booking = slot.bookingId
                      ? bookingsById.get(slot.bookingId)
                      : null;
                    const pendingMatch = !slot.isBusy
                      ? pendingBookings.find((b) => overlaps(slot.start, slot.end, b.start, b.end))
                      : null;
                    if (pendingMatch) {
                      return (
                        <button
                          onclick={`openManualBooking('${targetDate}', '${slot.start}', '${slot.end}')`}
                          class="flex-1 min-h-[40px] border-b border-crm-borderSoft/40 border-dashed last:border-b-0 bg-crm-warningSoft/60 hover:bg-crm-warningSoft flex items-center justify-between px-3 focus-ring transition-colors"
                          aria-label={`${slot.start} — ${pendingMatch.clientName ?? "kutilayotgan so'rov"}, qo'lda bron qo'shish`}
                        >
                          <span class="text-[12px] font-bold text-crm-warning flex items-center gap-1.5 min-w-0">
                            <Icon name="clock" class="w-3.5 h-3.5 shrink-0" />
                            <span class="truncate">
                              {slot.start} · Kutilmoqda: {pendingMatch.clientName ?? "Noma'lum"}
                            </span>
                          </span>
                        </button>
                      );
                    }
                    return slot.isBusy
                      ? (
                        <div class="flex-1 border-b border-crm-borderSoft/40 border-dashed last:border-b-0 bg-crm-primarySoft/55 flex items-center justify-between gap-3 px-3">
                          <span class="text-[13px] font-bold text-crm-primary flex items-center min-w-0">
                            <Icon
                              name="checkCircle"
                              class="w-3.5 h-3.5 mr-1.5 shrink-0"
                            />
                            <span class="truncate font-display">
                              {booking?.clientName || "Band"}
                            </span>
                          </span>
                          <div class="flex items-center gap-3">
                            {booking?.clientPhone
                              ? (
                                <a
                                  href={`tel:${
                                    booking.clientPhone.replace(/\s+/g, "")
                                  }`}
                                  class="text-[12px] font-bold text-crm-primary tabular-nums focus-ring rounded-r-xs"
                                >
                                  {booking.clientPhone}
                                </a>
                              )
                              : null}
                            {booking?.id && booking.status === "confirmed" ? (
                              <button
                                onclick={`cancelAdminBooking('${booking.id}', '${targetDate}')`}
                                class="h-8 px-2.5 rounded-r-xs bg-crm-dangerSoft text-crm-danger font-bold text-[12px] tap-scale focus-ring flex items-center justify-center transition-colors hover:bg-crm-danger hover:text-white"
                              >
                                Bekor qilish
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )
                      : (
                        <button
                          onclick={`openManualBooking('${targetDate}', '${slot.start}', '${slot.end}')`}
                          class="flex-1 min-h-[40px] border-b border-crm-borderSoft/40 border-dashed last:border-b-0 transition-[background-color] duration-150 ease-out active:bg-crm-primarySoft/50 hover:bg-crm-primarySoft/35 flex items-center px-3 focus-ring"
                          aria-label={`${slot.start} uchun qo'lda bron qo'shish`}
                        >
                          <span class="text-[12px] font-bold text-crm-textMuted">
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
