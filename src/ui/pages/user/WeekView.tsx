/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { AppShell, Card } from "../../components/UIComponents.tsx";
import { UserAppHeader } from "../../components/user/UserAppHeader.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getDayAvailability } from "../../../services/availability.ts";
import { addCalendarDays, tashkentDate, timeToMinutes } from "../../../services/booking.ts";
import { dateFromYmd, formatUzShortDay } from "../../date.ts";
import { getSettings, getUser, userApprovalStatus } from "../../../kv.ts";

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

  const settings = await getSettings();
  const user = userId === undefined ? null : await getUser(userId);
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

  const hasOwnedInvites = segments.some((segment) =>
    segment.kind === "busy" && Boolean(segment.inviteToken)
  );
  const botUsername = hasOwnedInvites ? await resolveBotUsername() : null;

  return (
    <AppShell>
      <UserAppHeader 
        title="BronQilish" 
        subtitle="Maydon band qilish tizimi" 
      />
      <div id="adminPanelLinkContainer" class="hidden px-5 pt-4">
          <button
            id="adminPanelLink"
            hx-get="/app/admin/requests"
            hx-target="#app-content"
            hx-push-url="true"
            aria-label="Boshqaruv paneli"
            onclick="localStorage.setItem('maydon_role_override', 'admin')"
            class="hidden w-full h-[44px] rounded-2xl bg-crm-primarySoft text-crm-primary items-center justify-center tap-scale focus-ring font-semibold text-[14px] gap-2"
          >
            <Icon name="settings" class="w-4 h-4" />
            Admin paneliga o'tish
          </button>
      </div>
      {!canBook
        ? (
          <div class="mx-5 mb-4 rounded-[16px] bg-crm-primarySoft px-4 py-3 text-[13px] font-semibold text-crm-primary">
            Admin tasdig'i kutilmoqda. Tasdiqlangandan keyin bo'sh vaqtni band qilishingiz mumkin.
          </div>
        )
        : null}
      <script>
        {raw(`
        (function revealAdminLink() {
          var link = document.getElementById('adminPanelLink');
          var container = document.getElementById('adminPanelLinkContainer');
          if (!link || !container) return;
          
          function showAdmin() {
            container.classList.remove('hidden');
            link.classList.remove('hidden');
            link.classList.add('flex');
          }
          function hideAdmin() {
            container.classList.add('hidden');
            link.classList.add('hidden');
            link.classList.remove('flex');
          }
          
          // Synchronous fast-path
          if (localStorage.getItem('maydon_is_admin') === 'true') {
            showAdmin();
          }
          
          // Background sync to update cache
          var initData = window.Telegram?.WebApp?.initData || '';
          fetch('/api/me', { headers: { 'Authorization': 'Bearer ' + initData } })
            .then(function(res) { return res.json(); })
            .then(function(data) {
              localStorage.setItem('maydon_is_admin', data.isAdmin ? 'true' : 'false');
              if (data.isOwner) localStorage.setItem('maydon_is_owner', 'true');
              else localStorage.removeItem('maydon_is_owner');
              
              if (data.isAdmin) showAdmin();
              else hideAdmin();
            }).catch(function(){});
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
        <div class="mt-4 flex gap-3 overflow-x-auto scrollbar-hide pb-2 gsap-stagger">
          {days.map((d) => (
            <button
              hx-get={`/app/user/week?date=${d.dateStr}`}
              hx-target="#app-content"
              hx-push-url="true"
              aria-label={`${d.display} jadvalini ko'rish`}
              aria-pressed={d.active ? "true" : "false"}
              class={`flex flex-col items-center justify-center min-w-[72px] h-[84px] rounded-2xl tap-scale focus-ring transition-colors duration-200 ${
                d.active
                  ? "bg-crm-primary text-white shadow-floating"
                  : "bg-crm-surface text-crm-textMain shadow-card border border-crm-borderSoft/50"
              }`}
            >
              <span
                class={`text-[13px] font-semibold tracking-wide ${
                  d.active ? "text-white/90" : "text-crm-textMuted"
                }`}
              >
                {d.display.split(",")[0]}
              </span>
              <span class="text-[22px] font-bold mt-0.5">
                {d.display.split(",")[1]}
              </span>
              {d.isToday
                ? (
                  <div
                    class={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                      d.active ? "bg-white" : "bg-crm-primary"
                    }`}
                  >
                  </div>
                )
                : <div class="h-3"></div>}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <Card class="p-0 overflow-hidden gsap-stagger">
          <div class="p-4 border-b border-crm-borderSoft/50 bg-crm-surface flex justify-between items-center gap-3">
            <span class="font-bold text-[16px] text-crm-textMain">Vaqtlar jadvali</span>
            <span class="text-[12px] font-medium text-crm-textMuted bg-crm-surfaceSoft/60 px-2 py-1 rounded-lg">
              Interval: {settings?.snapMin ?? 30} daqiqa
            </span>
          </div>
          <div class="px-4 py-2.5 border-b border-crm-borderSoft/50 flex flex-wrap items-center gap-x-4 gap-y-2 bg-crm-surfaceSoft/30">
            <span class="flex items-center gap-1.5 text-[11px] font-semibold text-crm-textMuted">
              <span class="w-2.5 h-2.5 rounded-full bg-crm-success shadow-[0_0_0_2px_rgba(52,199,89,0.2)]">
              </span>{" "}
              Bo'sh
            </span>
            <span class="flex items-center gap-1.5 text-[11px] font-semibold text-crm-textMuted">
              <span class="w-2.5 h-2.5 rounded-full bg-crm-surface border-2 border-crm-borderSoft/80">
              </span>{" "}
              Band
            </span>
            <span class="flex items-center gap-1.5 text-[11px] font-semibold text-crm-textMuted">
               <span class="w-2.5 h-2.5 rounded-full bg-crm-primary shadow-[0_0_0_2px_rgba(37,99,235,0.2)]">
               </span>{" "}
               So'rovingiz
            </span>
          </div>
          <div class="flex flex-col p-3 gap-2 bg-crm-surface">
            {segments.length === 0
              ? (
                <div class="p-8 text-center text-crm-textMuted text-sm font-medium">
                  Bu sana uchun ma'lumot yo'q
                </div>
              )
              : null}
            {segments.map((seg) =>
              seg.kind === "free"
                ? canBook && bookableStarts.has(seg.start)
                  ? (
                  <button
                    hx-get={`/app/user/book-card?date=${targetDate}&start=${seg.start}`}
                    hx-target="body"
                    hx-swap="beforeend"
                    aria-label={`${seg.start} uchun bron qilish`}
                    class="min-h-[56px] flex items-center justify-between px-4 py-2 rounded-2xl bg-crm-successSoft border border-crm-success/20 text-left transition-colors tap-scale focus-ring group hover:bg-crm-success/10"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-[14px] font-bold text-crm-success tabular-nums shrink-0">
                        {seg.start}
                      </span>
                      <span class="text-[13px] font-medium text-crm-success/80">
                        Bo'sh vaqt
                      </span>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-crm-success flex items-center justify-center text-white shadow-[0_4px_12px_rgba(52,199,89,0.3)] transition-transform group-active:scale-95">
                      <Icon name="plus" class="w-4 h-4 stroke-[3px]" />
                    </div>
                  </button>
                  )
                  : (
                    <div class="min-h-[56px] flex items-center gap-3 px-4 rounded-2xl bg-crm-surface border border-crm-borderSoft/50 opacity-60">
                      <span class="text-[14px] font-bold text-crm-textMuted tabular-nums shrink-0">{seg.start}</span>
                      <span class="text-[13px] font-medium text-crm-textMuted/70">
                        {canBook ? "Minimal davomiylikka yetarli vaqt yo'q" : "Tasdiq kutilmoqda"}
                      </span>
                    </div>
                  )
                : (
                  <div class={`min-h-[64px] flex items-center justify-between px-4 py-2.5 rounded-2xl border ${seg.userId === userId ? 'bg-crm-primarySoft border-crm-primary/30' : 'bg-crm-surface border-crm-borderSoft shadow-sm'}`}>
                    <div class="flex flex-col min-w-0 flex-1">
                       <div class="flex items-center gap-2 mb-0.5">
                         <span class={`text-[14px] font-bold tabular-nums shrink-0 ${seg.userId === userId ? 'text-crm-primary' : 'text-crm-textMain'}`}>
                          {seg.start} – {seg.end}
                         </span>
                         {seg.userId === userId && (
                           <span class="px-1.5 py-0.5 rounded-md bg-crm-primary text-white text-[10px] font-bold uppercase tracking-wider">Siz</span>
                         )}
                       </div>
                       <div class="flex items-center gap-1.5 text-[13px] font-medium text-crm-textMuted">
                         <Icon name="profile" class={`w-3.5 h-3.5 shrink-0 ${seg.userId === userId ? 'text-crm-primary/70' : 'text-crm-textMuted'}`} />
                         <span class="truncate">{seg.bookedBy ?? "Band qilingan"}</span>
                       </div>
                       {seg.participantCount !== undefined && seg.participantCount > 0 && (
                          <span class={`text-[11px] font-semibold mt-1 ${seg.userId === userId ? 'text-crm-primary/80' : 'text-crm-textMuted/70'}`}>
                            {seg.participantCount} kishi ishtirok etmoqda
                          </span>
                       )}
                    </div>
                    {seg.inviteToken && botUsername && (
                      <button
                        data-invite-link={`https://t.me/${botUsername}/app?startapp=invite_${seg.inviteToken}`}
                        class="hidden invite-copy-btn flex items-center justify-center min-w-[36px] h-[36px] rounded-full bg-crm-primary text-white shrink-0 tap-scale focus-ring shadow-[0_4px_12px_rgba(37,99,235,0.3)]"
                        aria-label="Taklifnoma havolasini nusxalash"
                      >
                        <Icon name="copy" class="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
            )}
          </div>
        </Card>
        <script>
          {raw(`
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
