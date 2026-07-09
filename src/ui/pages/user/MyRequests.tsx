/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import { AppShell, PageHeader, Card, StatusBadge } from '../../components/UIComponents.tsx';
import { RoleBottomNav } from '../../components/RoleBottomNav.tsx';
import { Icon } from '../../components/LucideIcons.tsx';

export const UserRequests: FC = () => {
  const requests = [
    { id: '1', date: 'Dushanba, 10 Iyul', time: '16:00 - 17:00', status: 'pending', queue: 1 },
    { id: '2', date: 'Seshanba, 11 Iyul', time: '20:00 - 22:00', status: 'pending', queue: 3 },
    { id: '3', date: 'Juma, 14 Iyul', time: '19:00 - 20:30', status: 'confirmed' },
    { id: '4', date: "O'tgan hafta", time: '18:00 - 19:00', status: 'rejected' },
  ];

  return (
    <AppShell>
      <PageHeader title="So'rovlarim" subtitle="Sizning bron qilish so'rovlaringiz" />

      <div class="px-5 space-y-4">
        <div class="space-y-3">
          {requests.map(req => (
            <Card class="p-4 flex-row items-center justify-between active:scale-[0.98] transition-transform gsap-stagger">
              <div>
                <span class="block text-[14px] font-bold text-crm-textMain mb-1">{req.date}</span>
                <div class="flex items-center text-[18px] font-bold tabular-nums">
                  <Icon name="clock" class="w-4 h-4 text-crm-textMuted mr-2" />
                  {req.time}
                </div>
              </div>
              <div class="flex flex-col items-end">
                {req.status === 'pending'
                  ? <>
                      <StatusBadge status="pending" label="Kutilmoqda" />
                      <span class="text-[12px] font-semibold text-crm-textMuted mt-1.5 flex items-center">
                        Navbat: <span class="text-crm-primary ml-1 font-bold">#{req.queue}</span>
                      </span>
                    </>
                  : req.status === 'confirmed'
                  ? <StatusBadge status="success" label="Tasdiqlandi" />
                  : <StatusBadge status="danger" label="Rad etildi" />}
              </div>
            </Card>
          ))}
        </div>
      </div>

      <RoleBottomNav role="user" activeId="requests" />
    </AppShell>
  );
};
