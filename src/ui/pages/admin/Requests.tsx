/** @jsxImportSource hono/jsx */
import { raw } from 'hono/html';
import type { FC } from 'hono/jsx';
import { AppShell, PageHeader, Card } from '../../components/UIComponents.tsx';
import { RoleBottomNav } from '../../components/RoleBottomNav.tsx';
import { Icon } from '../../components/LucideIcons.tsx';
import { getPendingRequests } from '../../../kv.ts';

const actionScript = `
async function handleAction(id, action) {
  var btn = event.currentTarget;
  btn.disabled = true;

  try {
    var initData = window.Telegram?.WebApp?.initData || '';
    var res = await fetch('/api/admin/bookings/' + id + '/' + action, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + initData }
    });
    var data = await res.json();

    if (res.ok && data.success) {
      window.toast("So'rov " + (action === 'confirm' ? 'tasdiqlandi' : 'rad etildi') + "!", 'success');
      htmx.ajax('GET', '/app/admin/requests', '#app-content');
    } else {
      window.toast(data.error || "Xatolik yuz berdi", 'error');
      btn.disabled = false;
    }
  } catch(e) {
    window.toast("Xato: " + e.message, 'error');
    btn.disabled = false;
  }
}
`;

export const AdminRequests: FC = async () => {
  const requests = await getPendingRequests();
  requests.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const pendingRequests = requests.map((req, idx) => {
    const dateObj = new Date(req.date);
    const displayDate = dateObj.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' });
    return {
      id: req.id,
      user: req.clientName || "Noma'lum",
      phone: req.clientPhone || '',
      date: displayDate,
      time: `${req.start} - ${req.end}`,
      queue: idx + 1,
    };
  });

  return (
    <AppShell>
      <PageHeader title="So'rovlar" subtitle="Kutilayotgan bron so'rovlari (FIFO)" />

      <div class="px-5 space-y-4">
        <div class="space-y-4">
          {pendingRequests.length === 0
            ? <div class="p-8 text-center text-crm-textMuted text-sm font-medium gsap-stagger">So'rovlar mavjud emas</div>
            : null}
          {pendingRequests.map(req => (
            <Card class={`p-4 gsap-stagger ${req.queue === 1 ? 'border border-crm-primarySoft' : 'opacity-80'}`} id={`req-${req.id}`}>
              <div class="flex justify-between items-start mb-3">
                <div>
                  <h3 class="text-[16px] font-bold">{req.user}</h3>
                  <a href={`tel:${req.phone.replace(/\s+/g, '')}`} class="text-[13px] font-medium text-crm-textMuted mt-0.5 flex items-center hover:text-crm-primary">
                    <Icon name="profile" class="w-3.5 h-3.5 mr-1" /> {req.phone}
                  </a>
                </div>
                <div class="flex flex-col items-end">
                  <span class="text-[12px] font-bold px-2 py-1 bg-crm-surfaceSoft rounded-md text-crm-textMuted mb-1">Navbat: #{req.queue}</span>
                  <div class="flex gap-1 mt-1">
                    <a href={`https://t.me/${req.phone.replace(/\s+/g, '')}`} target="_blank" class="w-8 h-8 rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center active:scale-95">
                      <Icon name="check" class="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              <div class="bg-crm-surfaceSoft rounded-[12px] p-3 flex items-center justify-between mb-4">
                <span class="text-[13px] font-bold text-crm-textMain">{req.date}</span>
                <span class="text-[15px] font-bold tabular-nums">{req.time}</span>
              </div>

              <div class="flex gap-3">
                <button
                  onclick={`handleAction('${req.id}', 'reject')`}
                  class="flex-1 h-[44px] rounded-[14px] bg-crm-dangerSoft text-crm-danger font-semibold text-[14px] active:scale-95 transition-transform flex items-center justify-center"
                >
                  <Icon name="xCircle" class="w-4 h-4 mr-1.5" /> Rad etish
                </button>
                <button
                  onclick={`handleAction('${req.id}', 'confirm')`}
                  class="flex-1 h-[44px] rounded-[14px] bg-crm-primary text-white font-semibold text-[14px] active:scale-95 transition-transform shadow-floating flex items-center justify-center"
                >
                  <Icon name="check" class="w-4 h-4 mr-1.5" /> Tasdiqlash
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <script>{raw(actionScript)}</script>
      <RoleBottomNav role="admin" activeId="requests" />
    </AppShell>
  );
};
