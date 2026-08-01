/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import {
  AppShell,
  Card,
  PageHeader,
  StatusBadge,
} from "../../components/UIComponents.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getAllRecurring } from "../../../kv.ts";
import { addCalendarDays, calendarDayOfWeek, tashkentDate } from "../../../services/booking.ts";
import { dateFromYmd, formatUzShortDate } from "../../date.ts";

function nextOccurrence(dayOfWeek: number, today: string): string {
  const diff = (dayOfWeek - calendarDayOfWeek(today) + 7) % 7;
  return addCalendarDays(today, diff);
}

const dayNames = [
  "Yakshanba",
  "Dushanba",
  "Seshanba",
  "Chorshanba",
  "Payshanba",
  "Juma",
  "Shanba",
];

const recurringScript = `
function setRecurringForm(open) {
  var panel = document.getElementById('recurringFormPanel');
  if (!panel) return;
  panel.classList.toggle('hidden', !open);
  if (open) document.getElementById('recClientName')?.focus();
}

async function createRecurring(btn) {
  var payload = {
    clientName: document.getElementById('recClientName')?.value || '',
    phone: document.getElementById('recPhone')?.value || '',
    dayOfWeek: Number(document.getElementById('recDay')?.value || 1),
    startTime: document.getElementById('recStart')?.value || '',
    endTime: document.getElementById('recEnd')?.value || ''
  };
  if (!payload.clientName || !payload.phone || !payload.startTime || !payload.endTime) {
    window.toast("Barcha maydonlarni to'ldiring", 'error');
    return;
  }
  await recurringRequest(btn, '/api/admin/recurring', {
    method: 'POST',
    body: JSON.stringify(payload)
  }, "Doimiy bron qo'shildi");
}

async function setRecurringActive(id, active, btn) {
  await recurringRequest(btn, '/api/admin/recurring/' + id + '/active', {
    method: 'POST',
    body: JSON.stringify({ active: active })
  }, active ? 'Faollashtirildi' : "To'xtatildi");
}

async function deleteRecurring(id, btn) {
  if (!confirm("Doimiy bron seriyasini o'chirasizmi?")) return;
  await recurringRequest(btn, '/api/admin/recurring/' + id + '?mode=series', {
    method: 'DELETE'
  }, "O'chirildi");
}

async function recurringRequest(btn, url, options, successMessage) {
  var oldLabel = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin"></span> Kutilmoqda...';
  try {
    var initData = window.Telegram?.WebApp?.initData || '';
    var res = await fetch(url, {
      method: options.method,
      headers: {
        'Authorization': 'Bearer ' + initData,
        'Content-Type': 'application/json'
      },
      body: options.body
    });
    var data = await res.json();
    if (res.ok && (data.success || data.recurring)) {
      window.toast(successMessage, 'success');
      htmx.ajax('GET', '/app/admin/recurring', '#app-content');
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

export const AdminRecurring: FC = async () => {
  const today = tashkentDate();
  const recurring = (await getAllRecurring()).sort((a, b) =>
    a.dayOfWeek - b.dayOfWeek ||
    a.startTime.localeCompare(b.startTime) ||
    a.clientName.localeCompare(b.clientName)
  );

  return (
    <AppShell>
      <PageHeader
        title="Doimiy mijozlar"
        subtitle="Haftalik avtomatik bronlar"
        rightNode={
          <button
            onclick="setRecurringForm(true)"
            aria-label="Doimiy bron qo'shish"
            class="min-w-[44px] min-h-[44px] bg-crm-primary text-white rounded-full flex items-center justify-center shadow-floating tap-scale focus-ring"
          >
            <Icon name="plus" class="w-5 h-5" />
          </button>
        }
      />

      <div class="px-5 space-y-4">
        <div id="recurringFormPanel" class="hidden gsap-stagger">
          <Card class="glass-card rounded-r-md border border-crm-borderSoft/40">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="font-display text-[15px] font-extrabold">Doimiy bron qo'shish</h2>
                <p class="text-[12px] text-crm-textMuted mt-0.5">
                  Cron har kuni kelgusi kunlar uchun bronlarni yaratadi.
                </p>
              </div>
              <button
                onclick="setRecurringForm(false)"
                aria-label="Yopish"
                class="min-w-[44px] min-h-[44px] rounded-full text-crm-textMuted hover:bg-crm-surfaceSoft tap-scale focus-ring flex items-center justify-center"
              >
                <Icon name="xCircle" class="w-5 h-5" />
              </button>
            </div>
            <div class="space-y-3">
              <div>
                <label
                  for="recClientName"
                  class="block text-[11px] font-bold text-crm-textMuted uppercase mb-1 px-1 tracking-wider"
                >
                  Mijoz
                </label>
                <input
                  id="recClientName"
                  autocomplete="name"
                  class="w-full h-[48px] glass-surface rounded-r-xs px-4 text-[15px] font-medium border border-crm-borderSoft/40 placeholder:text-crm-textMuted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                  placeholder="Masalan: Davron aka jamoasi"
                />
              </div>
              <div>
                <label
                  for="recPhone"
                  class="block text-[11px] font-bold text-crm-textMuted uppercase mb-1 px-1 tracking-wider"
                >
                  Telefon
                </label>
                <input
                  id="recPhone"
                  type="tel"
                  autocomplete="tel"
                  class="w-full h-[48px] glass-surface rounded-r-xs px-4 text-[15px] font-medium border border-crm-borderSoft/40 placeholder:text-crm-textMuted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 tabular-nums"
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label
                    for="recDay"
                    class="block text-[10px] font-bold text-crm-textMuted uppercase mb-1 px-1 tracking-wider"
                  >
                    Kun
                  </label>
                  <select
                    id="recDay"
                    class="w-full h-[46px] glass-surface rounded-r-xs px-2 text-[13px] font-bold border border-crm-borderSoft/40 focus:outline-none focus:ring-2 focus:ring-crm-primary/40"
                  >
                    {dayNames.map((day, index) => (
                      <option value={index} selected={index === 1}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    for="recStart"
                    class="block text-[10px] font-bold text-crm-textMuted uppercase mb-1 px-1 tracking-wider"
                  >
                    Boshlanish
                  </label>
                  <input
                    id="recStart"
                    type="time"
                    value="18:00"
                    step="1800"
                    class="w-full h-[46px] glass-surface rounded-r-xs px-2 text-[13px] font-bold border border-crm-borderSoft/40 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 tabular-nums"
                  />
                </div>
                <div>
                  <label
                    for="recEnd"
                    class="block text-[10px] font-bold text-crm-textMuted uppercase mb-1 px-1 tracking-wider"
                  >
                    Tugash
                  </label>
                  <input
                    id="recEnd"
                    type="time"
                    value="20:00"
                    step="1800"
                    class="w-full h-[46px] glass-surface rounded-r-xs px-2 text-[13px] font-bold border border-crm-borderSoft/40 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 tabular-nums"
                  />
                </div>
              </div>
            </div>
            <button
              onclick="createRecurring(this)"
              class="w-full min-h-[48px] rounded-r-sm bg-crm-primary text-white font-display font-bold shadow-floating tap-scale focus-ring flex items-center justify-center gap-2"
            >
              <Icon name="check" class="w-5 h-5" /> Saqlash
            </button>
          </Card>
        </div>

        <div class="space-y-3">
          {recurring.length === 0
            ? (
              <Card class="p-8 text-center items-center text-crm-textMuted text-sm font-medium gsap-stagger glass-card rounded-r-md border border-crm-borderSoft/40">
                <div class="w-12 h-12 rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center mb-1 shadow-soft">
                  <Icon name="refresh" class="w-6 h-6" />
                </div>
                <p class="font-display font-bold text-crm-textMain text-[16px]">Hali doimiy bronlar yo'q</p>
                <button
                  onclick="setRecurringForm(true)"
                  class="mt-3 min-h-[44px] rounded-r-sm px-5 bg-crm-primary text-white font-display font-bold text-[14px] tap-scale focus-ring shadow-floating"
                >
                  Qo'shish
                </button>
              </Card>
            )
            : null}

          {recurring.map((rec) => (
            <Card class={`p-4 gsap-stagger glass-card rounded-r-md border border-crm-borderSoft/40 ${rec.active ? "" : "opacity-75"}`}>
              <div class="flex justify-between items-start gap-3 mb-3">
                <div class="min-w-0">
                  <h3 class="font-display text-[16px] font-extrabold truncate text-crm-textMain">
                    {rec.clientName}
                  </h3>
                  {rec.phone
                    ? (
                      <a
                        href={`tel:${rec.phone.replace(/\s+/g, "")}`}
                        class="text-[13px] font-semibold text-crm-textMuted mt-0.5 tabular-nums focus-ring rounded-r-xs block"
                      >
                        {rec.phone}
                      </a>
                    )
                    : null}
                </div>
                <StatusBadge
                  status={rec.active ? "success" : "inactive"}
                  label={rec.active ? "Faol" : "To'xtatilgan"}
                />
              </div>

              <div class="flex items-center gap-3 glass-surface p-3 rounded-r-sm border border-crm-borderSoft/30">
                <div class="flex-1">
                  <span class="block text-[11px] font-bold text-crm-textMuted uppercase tracking-wider mb-0.5">
                    Kun
                  </span>
                  <span class="font-display font-extrabold text-[14px] text-crm-textMain">
                    {dayNames[rec.dayOfWeek] ?? rec.dayOfWeek}
                  </span>
                </div>
                <div class="w-px h-8 bg-crm-borderSoft/40"></div>
                <div class="flex-1 pl-2">
                  <span class="block text-[11px] font-bold text-crm-textMuted uppercase tracking-wider mb-0.5">
                    Vaqt
                  </span>
                  <span class="font-display font-extrabold text-[14px] text-crm-textMain tabular-nums">
                    {rec.startTime} - {rec.endTime}
                  </span>
                </div>
              </div>

              {rec.active
                ? (
                  <p class="text-[12px] font-medium text-crm-textMuted mt-2 px-1">
                    Keyingi: {formatUzShortDate(dateFromYmd(nextOccurrence(rec.dayOfWeek, today)))}
                  </p>
                )
                : null}

              <div class="flex gap-2 mt-3 pt-3 border-t border-crm-borderSoft/40">
                <button
                  onclick={`setRecurringActive('${rec.id}', ${
                    rec.active ? "false" : "true"
                  }, this)`}
                  class={`flex-1 min-h-[44px] text-[13px] font-display font-bold ${
                    rec.active
                      ? "text-crm-warning glass-surface border border-crm-warning/20"
                      : "text-crm-success glass-surface border border-crm-success/20"
                  } rounded-r-sm tap-scale focus-ring disabled:opacity-50 flex items-center justify-center gap-1.5`}
                >
                  <Icon
                    name={rec.active ? "xCircle" : "check"}
                    class="w-4 h-4"
                  />{" "}
                  {rec.active ? "To'xtatish" : "Faollashtirish"}
                </button>
                <button
                  onclick={`deleteRecurring('${rec.id}', this)`}
                  class="min-w-[44px] min-h-[44px] px-3 text-crm-danger glass-surface border border-crm-danger/20 rounded-r-sm tap-scale focus-ring disabled:opacity-50 flex items-center justify-center"
                  aria-label="O'chirish"
                >
                  <Icon name="trash" class="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <script>{raw(recurringScript)}</script>
      <RoleBottomNav role="admin" activeId="recurring" />
    </AppShell>
  );
};
