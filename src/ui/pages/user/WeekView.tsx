/** @jsxImportSource hono/jsx */
import { raw } from 'hono/html';
import type { FC } from 'hono/jsx';
import { AppShell, PageHeader, Card } from '../../components/UIComponents.tsx';
import { RoleBottomNav } from '../../components/RoleBottomNav.tsx';
import { Icon } from '../../components/LucideIcons.tsx';
import { getDayAvailability } from '../../../services/availability.ts';

export const UserWeekView: FC<{ selectedDate?: string }> = async ({ selectedDate }) => {
  const targetDateObj = selectedDate ? new Date(selectedDate) : new Date();
  const targetDate = targetDateObj.toISOString().slice(0, 10);

  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString('uz-UZ', { weekday: 'short' });
    const dayNum = d.getDate();
    return { dateStr, display: `${dayName}, ${dayNum}`, isToday: i === 0, active: dateStr === targetDate };
  });

  let dayData: { slots: any[]; openTime: string; closeTime: string };
  try {
    dayData = await getDayAvailability(targetDate);
  } catch {
    dayData = { slots: [], openTime: '08:00', closeTime: '23:00' };
  }

  // Group slots by hour
  const groupedSlots: { hour: string; slots: any[] }[] = [];
  let currentGroup: { hour: string; slots: any[] } | null = null;
  for (const slot of dayData.slots) {
    const hour = slot.start.split(':')[0] + ':00';
    if (!currentGroup || currentGroup.hour !== hour) {
      if (currentGroup) groupedSlots.push(currentGroup);
      currentGroup = { hour, slots: [slot] };
    } else {
      currentGroup.slots.push(slot);
    }
  }
  if (currentGroup) groupedSlots.push(currentGroup);

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
            class="hidden w-10 h-10 rounded-full bg-crm-primarySoft text-crm-primary items-center justify-center active:scale-95"
          >
            <Icon name="settings" class="w-5 h-5" />
          </button>
        }
      />
      <script>{raw(`
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
      `)}</script>
      <div class="px-5 space-y-4">
        {/* First-time explainer — dismissible, remembered via localStorage */}
        <div id="onboardHint" class="p-4 bg-crm-primarySoft/40 border border-crm-primary/20 rounded-[18px] flex items-start gap-3 gsap-stagger">
          <div class="w-8 h-8 rounded-full bg-crm-primary/15 flex items-center justify-center shrink-0">
            <Icon name="calendar" class="w-4 h-4 text-crm-primary" />
          </div>
          <div class="flex-1">
            <p class="text-[13px] font-bold text-crm-textMain mb-0.5">Qanday ishlaydi?</p>
            <p class="text-[12px] text-crm-textMuted leading-relaxed">
              Yashil katakchalar — bo'sh vaqtlar. Birontasini bosing, davomiylikni tanlang va so'rov yuboring. Admin tasdiqlagach, joyingiz band bo'ladi.
            </p>
          </div>
          <button onclick="dismissWeekHint()" aria-label="Yopish" class="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-crm-textMuted active:bg-black/5">
            <Icon name="xCircle" class="w-4 h-4" />
          </button>
        </div>
        <script>{raw(`
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
        `)}</script>

        {/* Date selector */}
        <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-2 gsap-stagger">
          {days.map(d => (
            <button
              hx-get={`/app/user/week?date=${d.dateStr}`}
              hx-target="#app-content"
              class={`flex flex-col items-center justify-center min-w-[64px] h-[72px] rounded-[20px] transition-transform active:scale-95 ${d.active ? 'bg-crm-primary text-white shadow-floating' : 'bg-crm-surface text-crm-textMain border border-crm-borderSoft'}`}
            >
              <span class={`text-[12px] font-semibold ${d.active ? 'text-white/80' : 'text-crm-textMuted'}`}>{d.display.split(',')[0]}</span>
              <span class="text-[20px] font-bold mt-0.5">{d.display.split(',')[1]}</span>
              {d.isToday
                ? <div class={`w-1 h-1 rounded-full mt-1 ${d.active ? 'bg-white' : 'bg-crm-primary'}`}></div>
                : <div class="h-2"></div>}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <Card class="p-0 overflow-hidden gsap-stagger">
          <div class="p-4 border-b border-crm-borderSoft bg-crm-surfaceSoft flex justify-between items-center">
            <span class="font-bold text-[15px]">Bo'sh vaqtlar</span>
            <span class="text-[12px] font-medium text-crm-textMuted bg-crm-surface px-2 py-1 rounded-md shadow-sm">30 daqiqa</span>
          </div>
          <div class="px-4 py-2 border-b border-crm-borderSoft flex items-center gap-4 bg-crm-surface">
            <span class="flex items-center gap-1.5 text-[11px] font-semibold text-crm-textMuted"><span class="w-2.5 h-2.5 rounded-full bg-crm-successSoft border border-crm-success/40"></span> Bo'sh — bosing va band qiling</span>
            <span class="flex items-center gap-1.5 text-[11px] font-semibold text-crm-textMuted"><span class="w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-300"></span> Band</span>
          </div>
          <div class="flex flex-col">
            {groupedSlots.length === 0
              ? <div class="p-8 text-center text-crm-textMuted text-sm font-medium">Bu sana uchun ma'lumot yo'q</div>
              : null}
            {groupedSlots.map(group => (
              <div class="flex border-b border-crm-borderSoft last:border-b-0 h-[80px]">
                <div class="w-[60px] shrink-0 border-r border-crm-borderSoft flex flex-col justify-between py-1 items-center bg-crm-surfaceSoft/30">
                  <span class="text-[12px] font-semibold text-crm-textMuted -mt-3 bg-crm-surface px-1">{group.hour}</span>
                </div>
                <div class="flex-1 flex flex-col">
                  {group.slots.map((slot: any) => (
                    <button
                      {...(!slot.isBusy ? { 'hx-get': `/app/user/day?date=${targetDate}&start=${slot.start}` } : {})}
                      hx-target="#app-content"
                      class={`flex-1 border-b border-crm-borderSoft border-dashed last:border-b-0 transition-colors flex items-center px-3 ${slot.isBusy ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-crm-successSoft/40 hover:bg-crm-successSoft active:bg-crm-successSoft'}`}
                      disabled={slot.isBusy}
                    >
                      {slot.isBusy
                        ? <span class="text-[12px] font-bold text-crm-textMuted flex items-center"><Icon name="xCircle" class="w-3.5 h-3.5 mr-1.5" /> Band</span>
                        : <span class="text-[12px] font-semibold text-crm-success transition-opacity">+ {slot.start} Bron qilish</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <div class="h-4"></div>
      </div>
      <RoleBottomNav role="user" activeId="week" />
    </AppShell>
  );
};
