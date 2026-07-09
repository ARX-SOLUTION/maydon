/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { AppShell, Card, PageHeader } from "../../components/UIComponents.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getDayAvailability } from "../../../services/availability.ts";
import { formatUzShortDay, toYmd } from "../../date.ts";

export const UserWeekView: FC<{ selectedDate?: string }> = async (
  { selectedDate },
) => {
  const targetDateObj = selectedDate ? new Date(selectedDate) : new Date();
  const targetDate = toYmd(targetDateObj);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = toYmd(d);
    const dayName = formatUzShortDay(d);
    const dayNum = d.getDate();
    return {
      dateStr,
      display: `${dayName}, ${dayNum}`,
      isToday: i === 0,
      active: dateStr === targetDate,
    };
  });

  let dayData: { slots: any[]; openTime: string; closeTime: string };
  try {
    dayData = await getDayAvailability(targetDate);
  } catch {
    dayData = { slots: [], openTime: "08:00", closeTime: "23:00" };
  }

  // Merge consecutive busy slots (same booking) into one segment; free slots stay 1:1.
  type Segment =
    | { kind: "free"; start: string }
    | {
      kind: "busy";
      start: string;
      end: string;
      bookingId?: string;
      bookedBy?: string;
    };
  const segments: Segment[] = [];
  for (const slot of dayData.slots) {
    if (!slot.isBusy) {
      segments.push({ kind: "free", start: slot.start });
      continue;
    }
    const last = segments[segments.length - 1];
    if (
      last && last.kind === "busy" && slot.bookingId &&
      last.bookingId === slot.bookingId
    ) {
      last.end = slot.end;
    } else {
      segments.push({
        kind: "busy",
        start: slot.start,
        end: slot.end,
        bookingId: slot.bookingId,
        bookedBy: slot.bookedBy,
      });
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Jadval"
        subtitle={`${days[0].display} - ${days[days.length - 1].display}`}
        rightNode={
          <button
            id="adminPanelLink"
            hx-get="/app/admin/requests"
            hx-target="#app-content"
            hx-push-url="true"
            aria-label="Boshqaruv paneli"
            class="hidden min-w-[44px] min-h-[44px] rounded-full bg-crm-primarySoft text-crm-primary items-center justify-center tap-scale focus-ring"
          >
            <Icon name="settings" class="w-5 h-5" />
          </button>
        }
      />
      <script>
        {raw(`
        (async function revealAdminLink() {
          var link = document.getElementById('adminPanelLink');
          if (!link) return;
          try {
            var initData = window.Telegram?.WebApp?.initData || '';
            var res = await fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + initData } });
            var data = await res.json();
            if (res.ok && data.isAdmin) {
              link.classList.remove('hidden');
              link.classList.add('flex');
            }
          } catch (e) {
            // silent — this is just a discoverability link, not a security boundary
          }
        })();
      `)}
      </script>
      <div class="px-5 space-y-4">
        {/* First-time explainer — dismissible, remembered via localStorage */}
        <div
          id="onboardHint"
          class="p-4 bg-crm-primarySoft/45 rounded-[20px] shadow-soft flex items-start gap-3 gsap-stagger"
        >
          <div class="w-8 h-8 rounded-full bg-crm-primary/15 flex items-center justify-center shrink-0">
            <Icon name="calendar" class="w-4 h-4 text-crm-primary" />
          </div>
          <div class="flex-1">
            <p class="text-[13px] font-bold text-crm-textMain mb-0.5">
              Qanday ishlaydi?
            </p>
            <p class="text-[12px] text-crm-textMuted leading-relaxed">
              Yashil katakchalar — bo'sh vaqtlar. Birontasini bosing,
              davomiylikni tanlang va so'rov yuboring. Admin tasdiqlagach,
              joyingiz band bo'ladi.
            </p>
          </div>
          <button
            onclick="dismissWeekHint()"
            aria-label="Yopish"
            class="shrink-0 min-w-[44px] min-h-[44px] -mr-2 -mt-2 rounded-full flex items-center justify-center text-crm-textMuted tap-scale focus-ring hover:bg-black/5"
          >
            <Icon name="xCircle" class="w-4 h-4" />
          </button>
        </div>
        <script>
          {raw(`
          if (localStorage.getItem('maydon_week_hint_dismissed')) {
            var h = document.getElementById('onboardHint');
            if (h) h.remove();
          }
          function dismissWeekHint() {
            localStorage.setItem('maydon_week_hint_dismissed', '1');
            var el = document.getElementById('onboardHint');
            if (!el) return;
            if (window.gsap) {
              gsap.to(el, { height: 0, opacity: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0, duration: 0.25, ease: 'power1.in', onComplete: function() { el.remove(); } });
            } else {
              el.remove();
            }
          }
        `)}
        </script>

        {/* Date selector */}
        <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-2 gsap-stagger">
          {days.map((d) => (
            <button
              hx-get={`/app/user/week?date=${d.dateStr}`}
              hx-target="#app-content"
              hx-push-url="true"
              aria-label={`${d.display} jadvalini ko'rish`}
              aria-pressed={d.active ? "true" : "false"}
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
                {d.display.split(",")[0]}
              </span>
              <span class="text-[20px] font-bold mt-0.5">
                {d.display.split(",")[1]}
              </span>
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
            </button>
          ))}
        </div>

        {/* Timeline */}
        <Card class="p-0 overflow-hidden gsap-stagger">
          <div class="p-4 border-b border-crm-borderSoft bg-crm-surfaceSoft flex justify-between items-center gap-3">
            <span class="font-bold text-[15px]">Bo'sh vaqtlar</span>
            <span class="text-[12px] font-medium text-crm-textMuted bg-crm-surface px-2 py-1 rounded-md shadow-sm">
              30 daqiqa
            </span>
          </div>
          <div class="px-4 py-2 border-b border-crm-borderSoft flex flex-wrap items-center gap-x-4 gap-y-2 bg-crm-surface">
            <span class="flex items-center gap-1.5 text-[11px] font-semibold text-crm-textMuted">
              <span class="w-2.5 h-2.5 rounded-full bg-crm-successSoft shadow-[0_0_0_1px_rgba(22,163,74,0.35)]">
              </span>{" "}
              Bo'sh — bosing
            </span>
            <span class="flex items-center gap-1.5 text-[11px] font-semibold text-crm-textMuted">
              <span class="w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-300">
              </span>{" "}
              Band
            </span>
          </div>
          <div class="flex flex-col divide-y divide-crm-borderSoft">
            {segments.length === 0
              ? (
                <div class="p-8 text-center text-crm-textMuted text-sm font-medium">
                  Bu sana uchun ma'lumot yo'q
                </div>
              )
              : null}
            {segments.map((seg) =>
              seg.kind === "free"
                ? (
                  <button
                    hx-get={`/app/user/day?date=${targetDate}&start=${seg.start}`}
                    hx-target="#app-content"
                    aria-label={`${seg.start} uchun bron qilish`}
                    class="min-h-[52px] flex items-center gap-3 px-4 bg-crm-successSoft/45 hover:bg-crm-successSoft active:bg-crm-successSoft transition-colors duration-150 ease-out focus-ring text-left"
                  >
                    <span class="text-[13px] font-bold text-crm-textMain tabular-nums w-[52px] shrink-0">
                      {seg.start}
                    </span>
                    <span class="text-[12px] font-semibold text-crm-success flex items-center gap-1">
                      <Icon name="plus" class="w-3.5 h-3.5" />
                      Bron qilish
                    </span>
                  </button>
                )
                : (
                  <div class="min-h-[64px] flex items-center gap-3 px-4 bg-gray-100">
                    <span class="text-[13px] font-bold text-crm-textMuted tabular-nums w-[92px] shrink-0">
                      {seg.start} – {seg.end}
                    </span>
                    <span class="flex items-center gap-1.5 text-[12px] font-semibold text-crm-textMuted min-w-0">
                      <Icon name="profile" class="w-4 h-4 shrink-0" />
                      <span class="truncate">
                        {seg.bookedBy ? `Band · ${seg.bookedBy}` : "Band"}
                      </span>
                    </span>
                  </div>
                )
            )}
          </div>
        </Card>
        <div class="h-4"></div>
      </div>
      <RoleBottomNav role="user" activeId="week" />
    </AppShell>
  );
};
