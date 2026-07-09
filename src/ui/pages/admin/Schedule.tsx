/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import { AppShell, PageHeader, Card } from '../../components/UIComponents.tsx';
import { RoleBottomNav } from '../../components/RoleBottomNav.tsx';
import { Icon } from '../../components/LucideIcons.tsx';

export const AdminSchedule: FC = () => {
  const days = [
    { date: 'Dush, 10', isToday: true, active: true },
    { date: 'Sesh, 11', isToday: false, active: false },
    { date: 'Chor, 12', isToday: false, active: false },
  ];

  const hours = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  const bookedSlots = ['15:00', '15:30', '18:00', '18:30'];

  return (
    <AppShell>
      <PageHeader
        title="Jadval"
        rightNode={
          <button class="w-10 h-10 bg-crm-primary text-white rounded-full flex items-center justify-center shadow-floating active:scale-95">
            <Icon name="plus" />
          </button>
        }
      />

      <div class="px-5 space-y-4">
        {/* Date selector */}
        <div class="flex gap-3 overflow-x-auto scrollbar-hide pb-2 gsap-stagger">
          {days.map(d => (
            <div class={`flex flex-col items-center justify-center min-w-[64px] h-[72px] rounded-[20px] transition-transform active:scale-95 ${d.active ? 'bg-crm-primary text-white shadow-floating' : 'bg-crm-surface text-crm-textMain border border-crm-borderSoft'}`}>
              <span class={`text-[12px] font-semibold ${d.active ? 'text-white/80' : 'text-crm-textMuted'}`}>{d.date.split(',')[0]}</span>
              <span class="text-[20px] font-bold mt-0.5">{d.date.split(',')[1]}</span>
              {d.isToday
                ? <div class={`w-1 h-1 rounded-full mt-1 ${d.active ? 'bg-white' : 'bg-crm-primary'}`}></div>
                : <div class="h-2"></div>}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <Card class="p-0 overflow-hidden gsap-stagger">
          <div class="flex flex-col">
            {hours.map(hour => {
              const slots = [
                { time: hour, isBooked: bookedSlots.includes(hour), client: bookedSlots.includes(hour) ? 'Ali' : null },
                { time: hour.replace(':00', ':30'), isBooked: bookedSlots.includes(hour.replace(':00', ':30')), client: bookedSlots.includes(hour.replace(':00', ':30')) ? 'Ali' : null },
              ];

              return (
                <div class="flex border-b border-crm-borderSoft last:border-b-0 h-[80px]">
                  <div class="w-[60px] shrink-0 border-r border-crm-borderSoft flex flex-col justify-between py-1 items-center bg-crm-surfaceSoft/30">
                    <span class="text-[12px] font-semibold text-crm-textMuted -mt-3 bg-crm-surface px-1">{hour}</span>
                  </div>
                  <div class="flex-1 flex flex-col">
                    {slots.map(slot => (
                      <button class={`flex-1 border-b border-crm-borderSoft border-dashed last:border-b-0 transition-colors active:bg-gray-100 flex items-center px-3 ${slot.isBooked ? 'bg-crm-primarySoft/50' : 'hover:bg-crm-primarySoft/30'}`}>
                        {slot.isBooked
                          ? <span class="text-[13px] font-bold text-crm-primary flex items-center"><Icon name="checkCircle" class="w-3.5 h-3.5 mr-1.5" /> {slot.client}</span>
                          : <span class="text-[12px] font-semibold text-crm-textMuted opacity-0 group-hover:opacity-100">+ Bron qo'shish</span>}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <div class="h-4"></div>
      </div>

      <RoleBottomNav role="admin" activeId="schedule" />
    </AppShell>
  );
};
