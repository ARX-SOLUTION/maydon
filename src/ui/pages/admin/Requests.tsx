/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { AppShell, Card, PageHeader } from "../../components/UIComponents.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getPendingRequests } from "../../../kv.ts";
import { dateFromYmd, formatUzShortDate } from "../../date.ts";

const actionScript = `
async function handleAction(id, action, btn, reason) {
  btn.disabled = true;
  var oldLabel = btn.innerHTML;
  btn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin"></span> Kutilmoqda...';

  try {
    var initData = window.Telegram?.WebApp?.initData || '';
    var res = await fetch('/api/admin/bookings/' + id + '/' + action, {
      method: 'POST',
      headers: Object.assign(
        { 'Authorization': 'Bearer ' + initData },
        reason ? { 'Content-Type': 'application/json' } : {}
      ),
      body: reason ? JSON.stringify({ reason: reason }) : undefined
    });
    var data = await res.json();

    if (res.ok && data.success) {
      var labels = { confirm: 'tasdiqlandi', reject: 'rad etildi', cancel: 'bekor qilindi' };
      window.toast("So'rov " + (labels[action] || 'yangilandi') + "!", 'success');
      htmx.ajax('GET', '/app/admin/requests', '#app-content');
    } else if (data.error === 'Slot conflict detected') {
      window.toast("Vaqt konflikti: bu oraliq boshqa bron bilan to'qnashdi.", 'error');
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

var rejectSheetRequestId = null;
var rejectSheetReason = '';

function openRejectSheet(id) {
  rejectSheetRequestId = id;
  rejectSheetReason = '';
  var sheet = document.getElementById('rejectSheet');
  var chips = document.querySelectorAll('.reject-reason-chip');
  chips.forEach(function(c) { c.setAttribute('aria-pressed', 'false'); c.className = c.className.replace('bg-crm-primary text-white', 'glass-surface text-crm-textMain'); });
  var custom = document.getElementById('rejectCustomNote');
  if (custom) { custom.value = ''; custom.classList.add('hidden'); }
  if (sheet) sheet.classList.remove('hidden');
}

function closeRejectSheet() {
  var sheet = document.getElementById('rejectSheet');
  if (sheet) sheet.classList.add('hidden');
  rejectSheetRequestId = null;
}

function pickRejectReason(reason, chip) {
  rejectSheetReason = reason;
  var chips = document.querySelectorAll('.reject-reason-chip');
  chips.forEach(function(c) {
    var isActive = c === chip;
    c.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    c.className = c.className.replace(
      isActive ? 'glass-surface text-crm-textMain' : 'bg-crm-primary text-white',
      isActive ? 'bg-crm-primary text-white' : 'glass-surface text-crm-textMain'
    );
  });
  var custom = document.getElementById('rejectCustomNote');
  if (!custom) return;
  if (reason === 'other') {
    custom.classList.remove('hidden');
    custom.focus();
  } else {
    custom.classList.add('hidden');
  }
}

function confirmReject(btn) {
  var custom = document.getElementById('rejectCustomNote');
  var reason = rejectSheetReason === 'other' ? (custom ? custom.value.trim() : '') : rejectSheetReason;
  if (rejectSheetReason === 'other' && !reason) {
    window.toast("Sababni yozing", 'error');
    return;
  }
  var id = rejectSheetRequestId;
  closeRejectSheet();
  var cardBtn = document.querySelector('#req-' + id + ' [data-reject-btn]');
  handleAction(id, 'reject', cardBtn || btn, reason || undefined);
}
`;

function formatRequestAge(createdAt: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 1) return "hozirgina";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.round(hours / 24)} kun oldin`;
}

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
      age: formatRequestAge(req.createdAt),
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
            class="min-w-[44px] min-h-[44px] rounded-full glass-surface text-crm-primary flex items-center justify-center tap-scale focus-ring border border-crm-borderSoft/40"
          >
            <Icon name="profile" class="w-5 h-5" />
          </button>
        }
      />

      <div class="px-5 space-y-4">
        {pendingRequests.length > 0
          ? (
            <div class="flex items-center gap-2 gsap-stagger">
              <span class="inline-flex items-center justify-center min-w-[26px] h-[26px] px-2 rounded-r-xs bg-crm-warningSoft text-crm-warning text-[13px] font-extrabold tabular-nums">
                {pendingRequests.length}
              </span>
              <span class="text-[13px] font-bold text-crm-textMuted">
                {pendingRequests.length === 1 ? "kutilayotgan so'rov" : "ta kutilayotgan so'rov"}
              </span>
            </div>
          )
          : null}
        <div class="space-y-4">
          {pendingRequests.length === 0
            ? (
              <Card class="p-8 text-center items-center text-crm-textMuted text-sm font-medium gsap-stagger glass-card rounded-r-md border border-crm-borderSoft/40">
                <div class="w-12 h-12 rounded-full bg-crm-successSoft text-crm-success flex items-center justify-center mb-1 shadow-soft">
                  <Icon name="checkCircle" class="w-6 h-6" />
                </div>
                <p class="font-display font-bold text-crm-textMain text-[16px]">Hozircha yangi so'rov yo'q</p>
              </Card>
            )
            : null}
          {pendingRequests.map((req) => (
            <Card
              class={`p-4 gsap-stagger glass-card rounded-r-md border border-crm-borderSoft/40 ${
                req.queue === 1 ? "shadow-floating border-crm-primary/30" : "opacity-90"
              }`}
              id={`req-${req.id}`}
            >
              <div class="flex justify-between items-start mb-3">
                <div>
                  <h3 class="font-display text-[16px] font-extrabold text-crm-textMain">{req.user}</h3>
                  <a
                    href={`tel:${req.phone.replace(/\s+/g, "")}`}
                    class="text-[13px] font-semibold text-crm-textMuted mt-0.5 flex items-center hover:text-crm-primary focus-ring rounded-r-xs"
                  >
                    <Icon name="profile" class="w-3.5 h-3.5 mr-1" /> {req.phone}
                  </a>
                </div>
                <div class="flex flex-col items-end">
                  <span class="text-[12px] font-bold px-2 py-0.5 glass-surface rounded-r-xs text-crm-textMuted mb-1 border border-crm-borderSoft/30">
                    Navbat: #{req.queue}
                  </span>
                  <span class="text-[11px] font-medium text-crm-textMuted/70">
                    {req.age}
                  </span>
                  {req.userId
                    ? (
                      <div class="flex gap-1 mt-1">
                        <a
                          href={`tg://user?id=${req.userId}`}
                          aria-label="Telegram orqali yozish"
                          class="min-w-[38px] min-h-[38px] rounded-full glass-surface text-crm-primary flex items-center justify-center tap-scale focus-ring border border-crm-borderSoft/30"
                        >
                          <Icon name="message" class="w-4 h-4" />
                        </a>
                      </div>
                    )
                    : null}
                </div>
              </div>

              <div class="glass-surface rounded-r-sm p-3 flex items-center justify-between mb-4 border border-crm-borderSoft/30">
                <span class="text-[13px] font-bold text-crm-textMain">
                  {req.date}
                </span>
                <span class="font-display text-[15px] font-extrabold tabular-nums text-crm-primary">
                  {req.time}
                </span>
              </div>

              <div class="flex gap-3">
                <button
                  data-reject-btn
                  onclick={`openRejectSheet('${req.id}')`}
                  aria-label={`${req.user} so'rovini rad etish`}
                  class="flex-1 min-h-[44px] rounded-r-sm glass-surface text-crm-danger font-display font-bold text-[14px] tap-scale focus-ring flex items-center justify-center gap-1.5 disabled:opacity-50 border border-crm-danger/20"
                >
                  <Icon name="xCircle" class="w-4 h-4 mr-1" /> Rad etish
                </button>
                <button
                  onclick={`handleAction('${req.id}', 'confirm', this)`}
                  aria-label={`${req.user} so'rovini tasdiqlash`}
                  class="flex-1 min-h-[44px] rounded-r-sm bg-crm-primary text-white font-display font-bold text-[14px] tap-scale focus-ring shadow-floating flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Icon name="check" class="w-4 h-4 mr-1" /> Tasdiqlash
                </button>
              </div>
              <button
                onclick={`handleAction('${req.id}', 'cancel', this)`}
                aria-label={`${req.user} so'rovini butunlay bekor qilish`}
                class="mt-2.5 w-full min-h-[44px] rounded-r-sm glass-surface text-crm-danger font-display font-bold text-[14px] tap-scale focus-ring flex items-center justify-center gap-1.5 disabled:opacity-50 border border-crm-danger/20"
              >
                <Icon name="xCircle" class="w-4 h-4" /> Bekor qilish
              </button>
            </Card>
          ))}
        </div>
      </div>

      {/* Reject reason sheet */}
      <div
        id="rejectSheet"
        class="hidden fixed inset-0 z-[70]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rejectSheetTitle"
      >
        <div
          class="absolute inset-0 bg-crm-textMain/40 backdrop-blur-sm"
          onclick="closeRejectSheet()"
          aria-hidden="true"
        >
        </div>
        <div class="absolute inset-x-0 bottom-0 glass-panel rounded-t-r-xl p-5 pb-safe shadow-floating max-w-[480px] mx-auto border-t border-crm-borderSoft/30">
          <div class="w-12 h-1.5 bg-crm-borderSoft/80 rounded-full mx-auto mb-4"></div>
          <h2 id="rejectSheetTitle" class="font-display text-[18px] font-extrabold text-crm-textMain">
            So'rovni rad etish
          </h2>
          <p class="text-[13px] text-crm-textMuted mt-0.5 mb-4">
            Foydalanuvchiga sabab ko'rsatiladimi?
          </p>
          <div class="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              class="reject-reason-chip min-h-[42px] px-4 rounded-r-sm glass-surface text-crm-textMain text-[13px] font-bold tap-scale focus-ring"
              aria-pressed="false"
              onclick="pickRejectReason('Vaqt mavjud emas', this)"
            >
              Vaqt mavjud emas
            </button>
            <button
              type="button"
              class="reject-reason-chip min-h-[42px] px-4 rounded-r-sm glass-surface text-crm-textMain text-[13px] font-bold tap-scale focus-ring"
              aria-pressed="false"
              onclick="pickRejectReason(&quot;Jadval o'zgardi&quot;, this)"
            >
              Jadval o'zgardi
            </button>
            <button
              type="button"
              class="reject-reason-chip min-h-[42px] px-4 rounded-r-sm glass-surface text-crm-textMain text-[13px] font-bold tap-scale focus-ring"
              aria-pressed="false"
              onclick="pickRejectReason(&quot;Noto'g'ri ma'lumot&quot;, this)"
            >
              Noto'g'ri ma'lumot
            </button>
            <button
              type="button"
              class="reject-reason-chip min-h-[42px] px-4 rounded-r-sm glass-surface text-crm-textMain text-[13px] font-bold tap-scale focus-ring"
              aria-pressed="false"
              onclick="pickRejectReason('other', this)"
            >
              Boshqa sabab
            </button>
          </div>
          <textarea
            id="rejectCustomNote"
            rows={2}
            placeholder="Sababni yozing..."
            aria-label="Rad etish sababi"
            class="hidden w-full glass-surface rounded-r-xs px-4 py-3 text-[14px] font-medium border border-crm-borderSoft placeholder:text-crm-textMuted/50 focus:outline-none focus:ring-2 focus:ring-crm-primary/40 mb-3 resize-none"
          >
          </textarea>
          <div class="flex gap-3 mt-3">
            <button
              type="button"
              onclick="closeRejectSheet()"
              class="flex-1 min-h-[48px] rounded-r-sm glass-surface text-crm-textMain font-display font-bold tap-scale focus-ring"
            >
              Bekor qilish
            </button>
            <button
              type="button"
              onclick="confirmReject(this)"
              class="flex-1 min-h-[48px] rounded-r-sm bg-crm-danger text-white font-display font-bold tap-scale focus-ring shadow-floating"
            >
              Rad etishni tasdiqlash
            </button>
          </div>
        </div>
      </div>

      <script>{raw(actionScript)}</script>
      <RoleBottomNav role="admin" activeId="requests" />
    </AppShell>
  );
};
