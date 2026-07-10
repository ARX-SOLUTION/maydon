/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import {
  AppShell,
  Card,
  PageHeader,
  StatusBadge,
} from "../../components/UIComponents.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getBookingsByUser, getPendingRequests } from "../../../kv.ts";
import { dateFromYmd, formatUzLongDate } from "../../date.ts";

const cancelScript = `
async function cancelRequest(id, btn) {
  if (!confirm("So'rovni bekor qilasizmi?")) return;
  btn.disabled = true;
  var oldLabel = btn.innerHTML;
  btn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-crm-danger/30 border-t-crm-danger animate-spin"></span> Bekor qilinmoqda...';
  try {
    var initData = window.Telegram?.WebApp?.initData || '';
    var res = await fetch('/api/bookings/' + id + '/cancel', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + initData }
    });
    var data = await res.json();
    if (res.ok && data.success) {
      window.toast('Bekor qilindi', 'success');
      htmx.ajax('GET', '/app/user/requests', '#app-content');
    } else {
      window.toast(data.error || 'Xatolik yuz berdi', 'error');
      btn.disabled = false;
      btn.innerHTML = oldLabel;
    }
  } catch (e) {
    window.toast('Xato: ' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = oldLabel;
  }
}
`;

const statusLabel: Record<string, { label: string; badge: string }> = {
  pending: { label: "Kutilmoqda", badge: "pending" },
  confirmed: { label: "Tasdiqlandi", badge: "success" },
  rejected: { label: "Rad etildi", badge: "danger" },
  cancelled: { label: "Bekor qilindi", badge: "danger" },
  expired: { label: "Muddati o'tdi", badge: "muted" },
  completed: { label: "Yakunlandi", badge: "muted" },
};

export const UserRequests: FC<{ userId: number }> = async ({ userId }) => {
  const [bookings, pending] = await Promise.all([
    getBookingsByUser(userId),
    getPendingRequests(),
  ]);
  pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const requests = bookings
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((b) => {
      const dateObj = dateFromYmd(b.date);
      const displayDate = formatUzLongDate(dateObj);
      const queuePos = b.status === "pending"
        ? pending.findIndex((p) => p.id === b.id) + 1
        : 0;
      const info = statusLabel[b.status] ?? { label: b.status, badge: "muted" };
      return {
        id: b.id,
        date: displayDate,
        time: `${b.start} - ${b.end}`,
        status: b.status,
        info,
        queuePos,
        cancellable: b.status === "pending" || b.status === "confirmed",
        decidedByName: b.decidedByName,
      };
    });

  return (
    <AppShell>
      <PageHeader
        title="So'rovlarim"
        subtitle="Sizning bron qilish so'rovlaringiz"
      />

      <div class="px-5 space-y-4">
        {requests.length === 0
          ? (
            <Card class="p-8 text-center items-center text-crm-textMuted text-sm font-medium gsap-stagger">
              <div class="w-12 h-12 rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center mb-1">
                <Icon name="calendar" class="w-6 h-6" />
              </div>
              <p>Hali so'rov yubormagansiz</p>
              <button
                hx-get="/app/user/week"
                hx-target="#app-content"
                hx-push-url="true"
                class="mt-2 min-h-[44px] rounded-[14px] px-4 bg-crm-primary text-white font-bold tap-scale focus-ring"
              >
                Jadvalni ochish
              </button>
            </Card>
          )
          : null}
        <div class="space-y-3">
          {requests.map((req) => (
            <Card class="p-4 gsap-stagger" id={`req-${req.id}`}>
              <div class="flex items-center justify-between">
                <div>
                  <span class="block text-[14px] font-bold text-crm-textMain mb-1">
                    {req.date}
                  </span>
                  <div class="flex items-center text-[18px] font-bold tabular-nums">
                    <Icon
                      name="clock"
                      class="w-4 h-4 text-crm-textMuted mr-2"
                    />
                    {req.time}
                  </div>
                </div>
                <div class="flex flex-col items-end">
                  <StatusBadge status={req.info.badge} label={req.info.label} />
                  {req.status === "pending"
                    ? (
                      <span class="text-[12px] font-semibold text-crm-textMuted mt-1.5 flex items-center">
                        Navbat:{" "}
                        <span class="text-crm-primary ml-1 font-bold">
                          #{req.queuePos}
                        </span>
                      </span>
                    )
                    : null}
                </div>
              </div>
              {req.cancellable
                ? (
                  <button
                    onclick={`cancelRequest('${req.id}', this)`}
                    class="mt-3 pt-3 border-t border-crm-borderSoft w-full min-h-[44px] rounded-[14px] bg-crm-dangerSoft text-crm-danger font-semibold text-[13px] tap-scale focus-ring flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Icon name="xCircle" class="w-4 h-4" /> Bekor qilish
                  </button>
                )
                : null}
              {req.decidedByName
                ? (
                  <div class="mt-3 pt-3 border-t border-crm-borderSoft text-[12px] font-medium text-crm-textMuted">
                    Qaror bergan admin: <span class="font-bold text-crm-textMain">{req.decidedByName}</span>
                  </div>
                )
                : null}
            </Card>
          ))}
        </div>
      </div>

      <script>{raw(cancelScript)}</script>
      <RoleBottomNav role="user" activeId="requests" />
    </AppShell>
  );
};
