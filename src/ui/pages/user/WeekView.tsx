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
      />
      <div class="px-5 space-y-4">
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
                      class={`flex-1 border-b border-crm-borderSoft border-dashed last:border-b-0 transition-colors flex items-center px-3 ${slot.isBusy ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'hover:bg-crm-primarySoft/30 active:bg-gray-100 group'}`}
                      disabled={slot.isBusy}
                    >
                      {slot.isBusy
                        ? <span class="text-[12px] font-bold text-crm-textMuted flex items-center"><Icon name="xCircle" class="w-3.5 h-3.5 mr-1.5" /> Band</span>
                        : <span class="text-[12px] font-semibold text-crm-primary opacity-0 group-hover:opacity-100 transition-opacity">+ {slot.start} Bron qilish</span>}
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
