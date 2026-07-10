/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { AppShell, Card, PageHeader } from "../../components/UIComponents.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getPendingRequests } from "../../../kv.ts";
import { dateFromYmd, formatUzShortDate } from "../../date.ts";

const actionScript = `
async function handleAction(id, action, btn) {
  btn.disabled = true;
  var oldLabel = btn.innerHTML;
  btn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin"></span> Kutilmoqda...';

  try {
    var initData = window.Telegram?.WebApp?.initData || '';
    var res = await fetch('/api/admin/bookings/' + id + '/' + action, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + initData }
    });
    var data = await res.json();

    if (res.ok && data.success) {
      var labels = { confirm: 'tasdiqlandi', reject: 'rad etildi', cancel: 'bekor qilindi' };
      window.toast("So'rov " + (labels[action] || 'yangilandi') + "!", 'success');
      htmx.ajax('GET', '/app/admin/requests', '#app-content');
    } else {
      window.toast(data.error || "Xatolik yuz berdi", 'error');
      btn.disabled = false;
      btn.innerHTML = oldLabel;
    }
  } catch(e) {
    window.toast("Xato: " + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = oldLabel;
  }
}
`;

export const AdminRequests: FC = async () => {
  const requests = await getPendingRequests();
  requests.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const pendingRequests = requests.map((req, idx) => {
    const dateObj = dateFromYmd(req.date);
    const displayDate = formatUzShortDate(dateObj);
    return {
      id: req.id,
      userId: req.userId,
      user: req.clientName || "Noma'lum",
      phone: req.clientPhone || "",
      date: displayDate,
      time: `${req.start} - ${req.end}`,
      queue: idx + 1,
    };
  });

  return (
    <AppShell>
      <PageHeader
        title="So'rovlar"
        subtitle="Kutilayotgan bron so'rovlari (FIFO)"
        rightNode={
          <button
            id="userPanelLink"
            hx-get="/app/user/week"
            hx-target="#app-content"
            hx-push-url="true"
            aria-label="Foydalanuvchi rejimi"
            onclick="localStorage.setItem('maydon_role_override', 'user')"
            class="min-w-[44px] min-h-[44px] rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center tap-scale focus-ring"
          >
            <Icon name="profile" class="w-5 h-5" />
          </button>
        }
      />

      <div class="px-5 space-y-4">
        <div class="space-y-4">
          {pendingRequests.length === 0
            ? (
              <Card class="p-8 text-center items-center text-crm-textMuted text-sm font-medium gsap-stagger">
                <div class="w-12 h-12 rounded-full bg-crm-successSoft text-crm-success flex items-center justify-center mb-1">
                  <Icon name="checkCircle" class="w-6 h-6" />
                </div>
                <p>Kutilayotgan so'rovlar yo'q</p>
              </Card>
            )
            : null}
          {pendingRequests.map((req) => (
            <Card
              class={`p-4 gsap-stagger ${
                req.queue === 1 ? "shadow-softHover" : "opacity-85"
              }`}
              id={`req-${req.id}`}
            >
              <div class="flex justify-between items-start mb-3">
                <div>
                  <h3 class="text-[16px] font-bold">{req.user}</h3>
                  <a
                    href={`tel:${req.phone.replace(/\s+/g, "")}`}
                    class="text-[13px] font-medium text-crm-textMuted mt-0.5 flex items-center hover:text-crm-primary focus-ring rounded-md"
                  >
                    <Icon name="profile" class="w-3.5 h-3.5 mr-1" /> {req.phone}
                  </a>
                </div>
                <div class="flex flex-col items-end">
                  <span class="text-[12px] font-bold px-2 py-1 bg-crm-surfaceSoft rounded-md text-crm-textMuted mb-1">
                    Navbat: #{req.queue}
                  </span>
                  {req.userId
                    ? (
                      <div class="flex gap-1 mt-1">
                        <a
                          href={`tg://user?id=${req.userId}`}
                          aria-label="Telegram orqali yozish"
                          class="min-w-[44px] min-h-[44px] rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center tap-scale focus-ring"
                        >
                          <Icon name="message" class="w-4 h-4" />
                        </a>
                      </div>
                    )
                    : null}
                </div>
              </div>

              <div class="bg-crm-surfaceSoft rounded-[12px] p-3 flex items-center justify-between mb-4">
                <span class="text-[13px] font-bold text-crm-textMain">
                  {req.date}
                </span>
                <span class="text-[15px] font-bold tabular-nums">
                  {req.time}
                </span>
              </div>

              <div class="flex gap-3">
                <button
                  onclick={`handleAction('${req.id}', 'reject', this)`}
                  class="flex-1 min-h-[44px] rounded-[14px] bg-crm-dangerSoft text-crm-danger font-semibold text-[14px] tap-scale focus-ring flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Icon name="xCircle" class="w-4 h-4 mr-1.5" /> Rad etish
                </button>
                <button
                  onclick={`handleAction('${req.id}', 'confirm', this)`}
                  class="flex-1 min-h-[44px] rounded-[14px] bg-crm-primary text-white font-semibold text-[14px] tap-scale focus-ring shadow-floating flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Icon name="check" class="w-4 h-4 mr-1.5" /> Tasdiqlash
                </button>
              </div>
              <button
                onclick={`handleAction('${req.id}', 'cancel', this)`}
                class="mt-3 w-full min-h-[44px] rounded-[14px] bg-crm-dangerSoft text-crm-danger font-semibold text-[14px] tap-scale focus-ring flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Icon name="xCircle" class="w-4 h-4" /> Bekor qilish
              </button>
            </Card>
          ))}
        </div>
      </div>

      <script>{raw(actionScript)}</script>
      <RoleBottomNav role="admin" activeId="requests" />
    </AppShell>
  );
};
