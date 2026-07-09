/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import { AppShell, PageHeader, Card, StatusBadge } from '../../components/UIComponents.tsx';
import { RoleBottomNav } from '../../components/RoleBottomNav.tsx';
import { Icon } from '../../components/LucideIcons.tsx';

export const AdminRecurring: FC = () => {
  const recurring = [
    { id: '1', client: 'Davron aka jamoasi', phone: '+998 90 999 88 77', day: 'Dushanba', time: '20:00 - 22:00', active: true },
    { id: '2', client: 'IT Park', phone: '+998 99 111 22 33', day: 'Payshanba', time: '18:00 - 20:00', active: true },
    { id: '3', client: 'Mahalla yoshlari', phone: '+998 93 444 55 66', day: 'Yakshanba', time: '09:00 - 11:00', active: false },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Doimiy mijozlar"
        subtitle="Haftalik avtomatik bronlar"
        rightNode={
          <button class="w-10 h-10 bg-crm-primary text-white rounded-full flex items-center justify-center shadow-floating active:scale-95">
            <Icon name="plus" />
          </button>
        }
      />

      <div class="px-5 space-y-4">
        <div class="space-y-3">
          {recurring.map(rec => (
            <Card class={`p-4 gsap-stagger ${rec.active ? '' : 'opacity-70'}`}>
              <div class="flex justify-between items-start mb-3">
                <div>
                  <h3 class="text-[16px] font-bold">{rec.client}</h3>
                  <p class="text-[13px] font-medium text-crm-textMuted mt-0.5">{rec.phone}</p>
                </div>
                <StatusBadge status={rec.active ? 'success' : 'inactive'} label={rec.active ? 'Faol' : "To'xtatilgan"} />
              </div>

              <div class="flex items-center gap-3 bg-crm-surfaceSoft p-3 rounded-[12px]">
                <div class="flex-1">
                  <span class="block text-[11px] font-semibold text-crm-textMuted uppercase tracking-wide mb-0.5">KUN</span>
                  <span class="block text-[14px] font-bold text-crm-textMain">{rec.day}</span>
                </div>
                <div class="w-px h-8 bg-crm-borderSoft"></div>
                <div class="flex-1 pl-2">
                  <span class="block text-[11px] font-semibold text-crm-textMuted uppercase tracking-wide mb-0.5">VAQT</span>
                  <span class="block text-[14px] font-bold text-crm-textMain tabular-nums">{rec.time}</span>
                </div>
              </div>

              <div class="flex gap-2 mt-3 pt-3 border-t border-crm-borderSoft">
                <button class="flex-1 py-2 text-[13px] font-semibold text-crm-primary bg-crm-primarySoft/30 rounded-[10px] active:scale-95 transition-transform">
                  Tahrirlash
                </button>
                <button class={`flex-1 py-2 text-[13px] font-semibold ${rec.active ? 'text-crm-danger bg-crm-dangerSoft/30' : 'text-crm-success bg-crm-successSoft/30'} rounded-[10px] active:scale-95 transition-transform`}>
                  {rec.active ? "To'xtatish" : "Faollashtirish"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <RoleBottomNav role="admin" activeId="recurring" />
    </AppShell>
  );
};
