/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { AppShell, Card } from "../../components/UIComponents.tsx";
import { UserAppHeader } from "../../components/user/UserAppHeader.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getDayAvailability } from "../../../services/availability.ts";
import { addCalendarDays, tashkentDate, timeToMinutes } from "../../../services/booking.ts";
import { dateFromYmd, formatUzShortDay, formatUzLongDate } from "../../date.ts";
import { getSettings, getUser, userApprovalStatus, getPendingRequests } from "../../../kv.ts";

let botUsernamePromise: Promise<string | null> | null = null;

function resolveBotUsername(): Promise<string | null> {
  const configured = Deno.env.get("TELEGRAM_BOT_USERNAME")?.replace(/^@/, "");
  if (configured) return Promise.resolve(configured);

  botUsernamePromise ??= import("../../../bot/client.ts")
    .then(({ bot }) => bot.api.getMe())
    .then((me) => me.username ?? null)
    .catch(() => null);
  return botUsernamePromise;
}

function getPeriod(timeStr: string): "morning" | "afternoon" | "evening" {
  const hour = parseInt(timeStr.split(":")[0], 10);
  if (hour >= 8 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

export const UserWeekView: FC<{ selectedDate?: string; userId?: number }> = async (
  { selectedDate, userId },
) => {
  const today = tashkentDate();
  const targetDate = selectedDate ?? today;

  const days = Array.from({ length: 7 }).map((_, i) => {
    const dateStr = addCalendarDays(today, i);
    const d = dateFromYmd(dateStr);
    const dayName = formatUzShortDay(d);
    const dayNum = d.getDate();
    return {
      dateStr,
      display: `${dayName}, ${dayNum}`,
      isToday: i === 0,
      active: dateStr === targetDate,
    };
  });

  const [settings, user, pendingReqs] = await Promise.all([
    getSettings(),
    userId === undefined ? null : getUser(userId),
    getPendingRequests(),
  ]);

  const userPendingCount = userId !== undefined
    ? pendingReqs.filter((r) => r.userId === userId).length
    : 0;

  const canBook = user ? userApprovalStatus(user) === "approved" : false;
  let dayData: { slots: any[]; openTime: string; closeTime: string };
  try {
    dayData = await getDayAvailability(targetDate);
  } catch {
    dayData = { slots: [], openTime: "08:00", closeTime: "23:00" };
  }

  const minimumDuration = settings?.minDurMin ?? 60;
  const bookableStarts = new Set<string>();
  for (let i = 0; i < dayData.slots.length; i++) {
    const first = dayData.slots[i];
    if (first.isBusy) continue;
    let total = 0;
    let expectedStart = first.start;
    for (let j = i; j < dayData.slots.length; j++) {
      const slot = dayData.slots[j];
      if (slot.isBusy || slot.start !== expectedStart) break;
      total += timeToMinutes(slot.end) - timeToMinutes(slot.start);
      expectedStart = slot.end;
      if (total >= minimumDuration) {
        bookableStarts.add(first.start);
        break;
      }
    }
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
      userId?: number | null;
      participantCount?: number;
      inviteToken?: string;
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
        userId: slot.userId,
        participantCount: slot.participantCount,
        inviteToken: userId !== undefined && slot.userId === userId
          ? slot.inviteToken
          : undefined,
      });
    }
  }

  // Find next available slot for Hero Card
  let nextAvailable: { dateStr: string; displayDate: string; start: string } | null = null;
  if (canBook) {
    for (const seg of segments) {
      if (seg.kind === "free" && bookableStarts.has(seg.start)) {
        nextAvailable = {
          dateStr: targetDate,
          displayDate: targetDate === today ? "Bugun" : formatUzShortDay(dateFromYmd(targetDate)),
          start: seg.start,
        };
        break;
      }
    }
  }

  const hasOwnedInvites = segments.some((segment) =>
    segment.kind === "busy" && Boolean(segment.inviteToken)
  );
  const botUsername = hasOwnedInvites ? await resolveBotUsername() : null;

  return (
    <AppShell>
      <UserAppHeader 
        title="BronQilish" 
        subtitle="Maydon band qilish tizimi" 
        pendingCount={userPendingCount}
      />

      {!canBook
        ? (
          <div class="mx-5 my-4 rounded-r-md glass-card border border-crm-warning/30 px-4 py-3.5 text-[13px] font-bold text-crm-warning flex items-center gap-3 shadow-soft">
            <Icon name="clock" class="w-5 h-5 shrink-0 text-crm-warning" />
            <span>Admin tasdig'i kutilmoqda. Tasdiqlangandan keyin bo'sh vaqtni band qilishingiz mumkin.</span>
          </div>
        )
        : null}

      <div class="px-5 space-y-4 pt-4">
        {/* Next Available Hero Card */}
        {nextAvailable && (
          <div class="glass-card rounded-r-md p-5 shadow-floating border border-crm-primary/20 bg-gradient-to-br from-crm-primarySoft/30 via-transparent to-transparent gsap-stagger relative overflow-hidden">
            <div class="flex items-center justify-between gap-3 mb-2">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-r-xs bg-crm-successSoft text-crm-success text-[12px] font-bold">
                <span class="w-2 h-2 rounded-full bg-crm-success animate-pulse"></span>
                Eng yaqin bo'sh vaqt
              </span>
              <span class="text-[12px] font-semibold text-crm-textMuted">
                {nextAvailable.displayDate}
              </span>
            </div>
            <div class="flex items-baseline justify-between gap-4 mt-1">
              <div>
                <span class="font-display text-[32px] font-extrabold text-crm-textMain tabular-nums tracking-tight">
                  {nextAvailable.start}
                </span>
                <span class="text-[13px] font-medium text-crm-textMuted block -mt-1">
                  {minimumDuration} daqiqalik o'yin uchun
                </span>
              </div>
              <button
                hx-get={`/app/user/book-card?date=${nextAvailable.dateStr}&start=${nextAvailable.start}`}
                hx-target="body"
                hx-swap="beforeend"
                class="min-h-[48px] px-5 rounded-r-sm bg-crm-primary text-white font-display font-bold text-[14px] tap-scale focus-ring shadow-floating flex items-center gap-2 shrink-0 hover:brightness-110"
              >
                <Icon name="checkCircle" class="w-4 h-4" />
                Bron qilish
              </button>
            </div>
          </div>
        )}

        {/* First-time explainer */}
        <div
          id="onboardHint"
          class="p-4 glass-surface rounded-r-md shadow-soft flex items-start gap-3 gsap-stagger border border-crm-borderSoft/40"
        >
          <div class="w-8 h-8 rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center shrink-0">
            <Icon name="calendar" class="w-4 h-4" />
          </div>
          <div class="flex-1">
            <p class="font-display text-[13px] font-bold text-crm-textMain mb-0.5">
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
        <div class="mt-4 flex gap-3 overflow-x-auto scrollbar-hide pb-2 gsap-stagger">
          {days.map((d) => (
            <button
              hx-get={`/app/user/week?date=${d.dateStr}`}
              hx-target="#app-content"
              hx-push-url="true"
              aria-label={`${d.display} jadvalini ko'rish`}
              aria-pressed={d.active ? "true" : "false"}
              class={`flex flex-col items-center justify-center min-w-[72px] h-[84px] rounded-r-md tap-scale focus-ring transition-all duration-200 ${
                d.active
                  ? "bg-crm-primary text-white shadow-floating scale-105"
                  : "glass-card text-crm-textMain shadow-soft border border-crm-borderSoft/40 hover:bg-crm-surfaceSoft"
              }`}
            >
              <span
                class={`text-[12px] font-bold tracking-wide ${
                  d.active ? "text-white/90" : "text-crm-textMuted"
                }`}
              >
                {d.display.split(",")[0]}
              </span>
              <span class="font-display text-[22px] font-extrabold mt-0.5">
                {d.display.split(",")[1]}
              </span>
              {d.isToday
                ? (
                  <div
                    class={`w-1.5 h-1.5 rounded-full mt-1 ${
                      d.active ? "bg-white" : "bg-crm-primary"
                    }`}
                  >
                  </div>
                )
                : <div class="h-2"></div>}
            </button>
          ))}
        </div>

        {/* Period Filter Chips */}
        <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1 gsap-stagger">
          <button
            onclick="setPeriodFilter('all', this)"
            class="period-chip active min-h-[38px] px-4 rounded-r-sm glass-card text-[13px] font-bold text-crm-primary bg-crm-primarySoft/60 border border-crm-primary/30 shrink-0 tap-scale"
          >
            Hammasi
          </button>
          <button
            onclick="setPeriodFilter('morning', this)"
            class="period-chip min-h-[38px] px-4 rounded-r-sm glass-surface text-[13px] font-bold text-crm-textMuted shrink-0 tap-scale hover:text-crm-textMain"
          >
            Ertalab (08–12)
          </button>
          <button
            onclick="setPeriodFilter('afternoon', this)"
            class="period-chip min-h-[38px] px-4 rounded-r-sm glass-surface text-[13px] font-bold text-crm-textMuted shrink-0 tap-scale hover:text-crm-textMain"
          >
            Kunduzi (12–17)
          </button>
          <button
            onclick="setPeriodFilter('evening', this)"
            class="period-chip min-h-[38px] px-4 rounded-r-sm glass-surface text-[13px] font-bold text-crm-textMuted shrink-0 tap-scale hover:text-crm-textMain"
          >
            Kechqurun (17–23)
          </button>
        </div>

        {/* Timeline */}
        <Card class="p-0 overflow-hidden gsap-stagger border border-crm-borderSoft/40">
          <div class="p-4 border-b border-crm-borderSoft/50 glass-panel flex justify-between items-center gap-3">
            <span class="font-display font-extrabold text-[16px] text-crm-textMain">Vaqtlar jadvali</span>
            <span class="text-[12px] font-bold text-crm-textMuted glass-surface px-2.5 py-1 rounded-r-xs border border-crm-borderSoft/30">
              Interval: {settings?.snapMin ?? 30} daqiqa
            </span>
          </div>
          <div class="px-4 py-2.5 border-b border-crm-borderSoft/50 flex flex-wrap items-center gap-x-4 gap-y-2 glass-surface">
            <span class="flex items-center gap-1.5 text-[11px] font-bold text-crm-textMuted">
              <span class="w-2.5 h-2.5 rounded-full bg-crm-success shadow-[0_0_0_2px_rgba(52,199,89,0.2)]"></span>
              Bo'sh
            </span>
            <span class="flex items-center gap-1.5 text-[11px] font-bold text-crm-textMuted">
              <span class="w-2.5 h-2.5 rounded-full bg-crm-surface border-2 border-crm-borderSoft/80"></span>
              Band
            </span>
            <span class="flex items-center gap-1.5 text-[11px] font-bold text-crm-textMuted">
              <span class="w-2.5 h-2.5 rounded-full bg-crm-primary shadow-[0_0_0_2px_rgba(37,99,235,0.2)]"></span>
              So'rovingiz
            </span>
          </div>
          <div id="slotContainer" class="flex flex-col p-3 gap-2 bg-transparent">
            {segments.length === 0
              ? (
                <div class="p-8 text-center text-crm-textMuted text-sm font-medium">
                  Bu sana uchun ma'lumot yo'q
                </div>
              )
              : null}
            {segments.map((seg) => {
              const period = getPeriod(seg.start);
              return seg.kind === "free"
                ? canBook && bookableStarts.has(seg.start)
                  ? (
                  <button
                    data-period={period}
                    hx-get={`/app/user/book-card?date=${targetDate}&start=${seg.start}`}
                    hx-target="body"
                    hx-swap="beforeend"
                    aria-label={`${seg.start} uchun bron qilish`}
                    class="slot-item min-h-[60px] flex items-center justify-between px-4 py-2.5 rounded-r-md glass-card border border-crm-success/25 text-left transition-all duration-200 tap-scale focus-ring group hover:border-crm-success/50 hover:bg-crm-successSoft/30"
                  >
                    <div class="flex items-center gap-3">
                      <span class="font-display text-[15px] font-extrabold text-crm-success tabular-nums shrink-0">
                        {seg.start}
                      </span>
                      <span class="text-[13px] font-bold text-crm-success/90">
                        Bo'sh vaqt
                      </span>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-crm-success text-white flex items-center justify-center shadow-[0_4px_12px_rgba(52,199,89,0.3)] transition-transform group-active:scale-95">
                      <Icon name="plus" class="w-4 h-4 stroke-[3px]" />
                    </div>
                  </button>
                  )
                  : (
                    <div 
                      data-period={period}
                      class="slot-item min-h-[60px] flex items-center justify-between px-4 py-2.5 rounded-r-md glass-surface pattern-limited border border-crm-warning/20 opacity-75"
                    >
                      <div class="flex items-center gap-3">
                        <span class="font-display text-[15px] font-bold text-crm-warning tabular-nums shrink-0">{seg.start}</span>
                        <span class="text-[12px] font-semibold text-crm-warning">
                          {canBook ? "Kam vaqt (davomiylikka yetarsiz)" : "Tasdiq kutilmoqda"}
                        </span>
                      </div>
                      <span class="px-2 py-0.5 rounded-r-xs bg-crm-warningSoft text-crm-warning text-[10px] font-bold uppercase">
                        Cheklangan
                      </span>
                    </div>
                  )
                : (
                  <div 
                    data-period={period}
                    class={`slot-item min-h-[64px] flex items-center justify-between px-4 py-2.5 rounded-r-md border ${
                      seg.userId === userId 
                        ? 'glass-card bg-crm-primarySoft/40 border-crm-primary/30 shadow-soft' 
                        : 'glass-surface border-crm-borderSoft/40 opacity-80'
                    }`}
                  >
                    <div class="flex flex-col min-w-0 flex-1">
                       <div class="flex items-center gap-2 mb-0.5">
                         <span class={`font-display text-[15px] font-extrabold tabular-nums shrink-0 ${seg.userId === userId ? 'text-crm-primary' : 'text-crm-textMain'}`}>
                          {seg.start} – {seg.end}
                         </span>
                         {seg.userId === userId && (
                           <span class="px-2 py-0.5 rounded-r-xs bg-crm-primary text-white text-[10px] font-bold uppercase tracking-wider">Siz</span>
                         )}
                       </div>
                       <div class="flex items-center gap-1.5 text-[13px] font-medium text-crm-textMuted">
                         <Icon name="profile" class={`w-3.5 h-3.5 shrink-0 ${seg.userId === userId ? 'text-crm-primary/70' : 'text-crm-textMuted'}`} />
                         <span class="truncate">{seg.bookedBy ?? "Band qilingan"}</span>
                       </div>
                    </div>
                    {seg.inviteToken && botUsername && (
                      <button
                        data-invite-link={`https://t.me/${botUsername}/app?startapp=invite_${seg.inviteToken}`}
                        class="hidden invite-copy-btn flex items-center justify-center min-w-[36px] h-[36px] rounded-full bg-crm-primary text-white shrink-0 tap-scale focus-ring shadow-floating"
                        aria-label="Taklifnoma havolasini nusxalash"
                      >
                        <Icon name="copy" class="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
            })}
          </div>
        </Card>

        <script>
          {raw(`
            function setPeriodFilter(period, btn) {
              var chips = document.querySelectorAll('.period-chip');
              chips.forEach(function(c) {
                c.classList.remove('active', 'text-crm-primary', 'bg-crm-primarySoft/60', 'border-crm-primary/30', 'glass-card');
                c.classList.add('text-crm-textMuted', 'glass-surface');
              });
              btn.classList.remove('text-crm-textMuted', 'glass-surface');
              btn.classList.add('active', 'text-crm-primary', 'bg-crm-primarySoft/60', 'border-crm-primary/30', 'glass-card');

              var slots = document.querySelectorAll('.slot-item');
              slots.forEach(function(slot) {
                if (period === 'all' || slot.getAttribute('data-period') === period) {
                  slot.style.display = 'flex';
                } else {
                  slot.style.display = 'none';
                }
              });
            }

            (function setupInviteButtons() {
              var btns = document.querySelectorAll('.invite-copy-btn');
              btns.forEach(function(btn) {
                btn.classList.remove('hidden');
                btn.classList.add('flex');
                btn.addEventListener('click', function() {
                  var link = btn.getAttribute('data-invite-link');
                  if (!link || !navigator.clipboard) {
                    window.toast('Nusxalashda xatolik yuz berdi.', 'error');
                    return;
                  }
                  navigator.clipboard.writeText(link).then(function() {
                    window.toast('Havola nusxalandi! Do\\'stlaringizga yuboring.', 'success');
                  }).catch(function() {
                    window.toast('Nusxalashda xatolik yuz berdi.', 'error');
                  });
                });
              });
            })();
          `)}
        </script>
        <div class="h-4"></div>
      </div>
      <RoleBottomNav role="user" activeId="week" />
    </AppShell>
  );
};
