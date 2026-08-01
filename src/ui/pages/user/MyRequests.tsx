/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import {
  AppShell,
  Card,
  StatusBadge,
} from "../../components/UIComponents.tsx";
import { UserAppHeader } from "../../components/user/UserAppHeader.tsx";
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

function setRequestFilter(status, btn) {
  var chips = document.querySelectorAll('.req-filter-chip');
  chips.forEach(function(c) {
    c.classList.remove('active', 'text-crm-primary', 'bg-crm-primarySoft/60', 'border-crm-primary/30', 'glass-card');
    c.classList.add('text-crm-textMuted', 'glass-surface');
  });
  btn.classList.remove('text-crm-textMuted', 'glass-surface');
  btn.classList.add('active', 'text-crm-primary', 'bg-crm-primarySoft/60', 'border-crm-primary/30', 'glass-card');

  var cards = document.querySelectorAll('.request-card-item');
  cards.forEach(function(card) {
    if (status === 'all' || card.getAttribute('data-status') === status) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
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

  const userPendingCount = pending.filter((r) => r.userId === userId).length;

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
      <UserAppHeader 
        title="So'rovlarim" 
        subtitle="Sizning bron qilish so'rovlaringiz"
        pendingCount={userPendingCount}
      />

      <div class="px-5 space-y-4 pt-4">
        {/* Status Filter Chips */}
        {requests.length > 0 && (
          <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1 gsap-stagger">
            <button
              onclick="setRequestFilter('all', this)"
              class="req-filter-chip active min-h-[38px] px-4 rounded-r-sm glass-card text-[13px] font-bold text-crm-primary bg-crm-primarySoft/60 border border-crm-primary/30 shrink-0 tap-scale"
            >
              Hammasi ({requests.length})
            </button>
            <button
              onclick="setRequestFilter('pending', this)"
              class="req-filter-chip min-h-[38px] px-4 rounded-r-sm glass-surface text-[13px] font-bold text-crm-textMuted shrink-0 tap-scale hover:text-crm-textMain"
            >
              Kutilmoqda ({requests.filter(r => r.status === 'pending').length})
            </button>
            <button
              onclick="setRequestFilter('confirmed', this)"
              class="req-filter-chip min-h-[38px] px-4 rounded-r-sm glass-surface text-[13px] font-bold text-crm-textMuted shrink-0 tap-scale hover:text-crm-textMain"
            >
              Tasdiqlangan ({requests.filter(r => r.status === 'confirmed').length})
            </button>
            <button
              onclick="setRequestFilter('rejected', this)"
              class="req-filter-chip min-h-[38px] px-4 rounded-r-sm glass-surface text-[13px] font-bold text-crm-textMuted shrink-0 tap-scale hover:text-crm-textMain"
            >
              Rad etilgan ({requests.filter(r => r.status === 'rejected' || r.status === 'cancelled').length})
            </button>
          </div>
        )}

        {requests.length === 0
          ? (
            <Card class="p-8 text-center items-center text-crm-textMuted text-sm font-medium gsap-stagger glass-card rounded-r-md">
              <div class="w-12 h-12 rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center mb-1 shadow-soft">
                <Icon name="calendar" class="w-6 h-6" />
              </div>
              <p class="font-display font-bold text-crm-textMain text-[16px]">Hali so'rov yubormagansiz</p>
              <p class="text-[13px] text-crm-textMuted mt-0.5">Jadvaldan bo'sh vaqt tanlab so'rov yuboring</p>
              <button
                hx-get="/app/user/week"
                hx-target="#app-content"
                hx-push-url="true"
                class="mt-3 min-h-[46px] rounded-r-sm px-5 bg-crm-primary text-white font-display font-bold text-[14px] tap-scale focus-ring shadow-floating"
              >
                Jadvalni ochish
              </button>
            </Card>
          )
          : null}
        <div class="space-y-3">
          {requests.map((req) => (
            <div 
              class="request-card-item glass-card rounded-r-md p-4 shadow-soft border border-crm-borderSoft/40 gsap-stagger relative overflow-hidden transition-all duration-200" 
              id={`req-${req.id}`}
              data-status={req.status}
            >
              {/* Status indicator edge */}
              <div class={`absolute left-0 top-0 bottom-0 w-1.5 ${
                req.status === 'pending' ? 'bg-crm-warning' : 
                req.status === 'confirmed' ? 'bg-crm-success' : 
                req.status === 'rejected' || req.status === 'cancelled' ? 'bg-crm-danger' : 
                'bg-crm-textMuted'
              }`}></div>
              
              <div class="flex items-center justify-between pl-2">
                <div>
                  <span class="block text-[14px] font-bold text-crm-textMuted mb-0.5">
                    {req.date}
                  </span>
                  <div class="flex items-center font-display text-[18px] font-extrabold text-crm-textMain tabular-nums">
                    <Icon
                      name="clock"
                      class="w-4 h-4 text-crm-textMuted mr-2 shrink-0"
                    />
                    {req.time}
                  </div>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <StatusBadge status={req.info.badge} label={req.info.label} />
                  {req.status === "pending"
                    ? (
                      <span class="text-[12px] font-bold text-crm-textMuted flex items-center glass-surface px-2 py-0.5 rounded-r-xs border border-crm-borderSoft/30">
                        Navbat:{" "}
                        <span class="text-crm-primary ml-1 font-extrabold">
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
                    class="mt-3.5 w-full h-[46px] rounded-r-sm glass-surface text-crm-danger font-display font-bold text-[14px] tap-scale focus-ring flex items-center justify-center gap-2 disabled:opacity-50 transition-colors hover:bg-crm-dangerSoft border border-crm-danger/20 group"
                  >
                    <Icon name="xCircle" class="w-4 h-4 transition-transform group-active:scale-90" /> 
                    {req.status === "confirmed" ? "Bekor qilish" : "So'rovni bekor qilish"}
                  </button>
                )
                : null}
              {req.decidedByName
                ? (
                  <div class="mt-3 pt-2.5 border-t border-crm-borderSoft/40 flex items-center justify-between text-[12px] font-medium text-crm-textMuted">
                    <span>Qaror bergan admin:</span> 
                    <span class="font-bold text-crm-textMain glass-surface px-2 py-0.5 rounded-r-xs border border-crm-borderSoft/30">{req.decidedByName}</span>
                  </div>
                )
                : null}
            </div>
          ))}
        </div>
      </div>

      <script>{raw(cancelScript)}</script>
      <RoleBottomNav role="user" activeId="requests" />
    </AppShell>
  );
};
