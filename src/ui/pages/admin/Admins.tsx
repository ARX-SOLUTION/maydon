/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { AppShell, PageHeader } from "../../components/UIComponents.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";

const adminsScript = `
var PROFILE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
var TRASH_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>';

function adminsAuth() {
  return { "Authorization": "Bearer " + (window.Telegram?.WebApp?.initData || "") };
}

function escHtml(s) {
  var d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function roleChip(role) {
  var isOwner = role === "owner";
  var cls = isOwner ? "bg-crm-primarySoft text-crm-primary" : "bg-crm-borderSoft text-crm-textMuted";
  var label = isOwner ? "Asosiy" : "Yordamchi";
  return '<span class="px-[10px] h-[26px] inline-flex items-center rounded-r-xs text-[12px] font-bold whitespace-nowrap ' + cls + '">' + label + '</span>';
}

function adminRow(a, me) {
  var canDelete = a.role !== "owner" && a.telegramId !== me;
  var delBtn = canDelete
    ? '<button onclick="removeAdmin(' + a.telegramId + ', this)" aria-label="O\\'chirish" class="min-w-[44px] min-h-[44px] rounded-r-sm glass-surface text-crm-danger border border-crm-danger/20 flex items-center justify-center gap-1.5 px-3 text-[13px] font-bold tap-scale focus-ring shrink-0 disabled:opacity-50">' + TRASH_SVG + " O'chirish</button>"
    : "";
  return '<div class="glass-card rounded-r-md p-4 shadow-soft border border-crm-borderSoft/40 flex items-center justify-between gap-3">'
    + '<div class="flex items-center gap-3 min-w-0">'
    + '<div class="w-10 h-10 rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center shrink-0 shadow-soft">' + PROFILE_SVG + '</div>'
    + '<div class="min-w-0"><div class="font-display text-[15px] font-extrabold truncate text-crm-textMain">' + escHtml(a.name) + '</div><div class="mt-1">' + roleChip(a.role) + '</div></div>'
    + '</div>' + delBtn + '</div>';
}

async function loadAdmins() {
  var list = document.getElementById("adminsList");
  if (!list) return;
  list.innerHTML = '<div class="text-center text-crm-textMuted text-sm font-bold font-display py-8">Yuklanmoqda...</div>';
  try {
    var res = await fetch("/api/admin/admins", { headers: adminsAuth() });
    if (res.status === 403) {
      list.innerHTML = '<div class="glass-card rounded-r-md p-8 shadow-soft text-center text-crm-textMuted text-sm font-medium border border-crm-borderSoft/40">Bu bo\\'lim faqat asosiy admin (owner) uchun.</div>';
      var ib = document.getElementById("inviteBtn");
      if (ib) ib.classList.add("hidden");
      return;
    }
    var data = await res.json();
    if (!res.ok) {
      window.toast(data.error || "Xatolik yuz berdi", "error");
      list.innerHTML = "";
      return;
    }
    var me = data.me;
    var admins = data.admins || [];
    if (!admins.length) {
      list.innerHTML = '<div class="glass-card rounded-r-md p-8 shadow-soft text-center text-crm-textMuted text-sm font-medium border border-crm-borderSoft/40">Adminlar yo\\'q</div>';
      return;
    }
    list.innerHTML = admins.map(function (a) { return adminRow(a, me); }).join("");
  } catch (e) {
    window.toast("Xato: " + e.message, "error");
    list.innerHTML = "";
  }
}

async function removeAdmin(id, btn) {
  if (!confirm("Adminni o'chirasizmi?")) return;
  btn.disabled = true;
  try {
    var res = await fetch("/api/admin/admins/" + id, { method: "DELETE", headers: adminsAuth() });
    var data = await res.json();
    if (res.ok && data.success) {
      window.toast("Admin o'chirildi", "success");
      loadAdmins();
    } else {
      window.toast(data.error || "Xatolik yuz berdi", "error");
      btn.disabled = false;
    }
  } catch (e) {
    window.toast("Xato: " + e.message, "error");
    btn.disabled = false;
  }
}

async function generateInvite(btn) {
  btn.disabled = true;
  var oldLabel = btn.innerHTML;
  btn.innerHTML = '<span class="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin"></span> Yaratilmoqda...';
  try {
    var res = await fetch("/api/admin/admins/invite", { method: "POST", headers: adminsAuth() });
    var data = await res.json();
    if (res.ok && data.link) {
      window.__inviteLink = data.link;
      var box = document.getElementById("inviteResult");
      box.innerHTML = '<div class="text-[13px] font-bold text-crm-textMuted mb-2">Taklif havolasi (bir martalik):</div>'
        + '<div class="glass-surface rounded-r-xs p-3 text-[12px] break-all mb-3 font-mono border border-crm-borderSoft/30">' + escHtml(data.link) + '</div>'
        + '<button onclick="copyInvite()" class="w-full min-h-[44px] rounded-r-sm glass-surface text-crm-primary font-display font-bold text-[14px] tap-scale focus-ring flex items-center justify-center gap-1.5 border border-crm-primary/20">Nusxa olish</button>';
      box.classList.remove("hidden");
    } else {
      window.toast(data.error || "Xatolik yuz berdi", "error");
    }
  } catch (e) {
    window.toast("Xato: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = oldLabel;
  }
}

function copyInvite() {
  navigator.clipboard.writeText(window.__inviteLink || "").then(
    function () { window.toast("Havola nusxalandi", "success"); },
    function () { window.toast("Nusxalab bo'lmadi", "error"); }
  );
}

loadAdmins();
`;

export const AdminAdmins: FC = () => {
  return (
    <AppShell>
      <PageHeader
        title="Adminlar"
        subtitle="Yordamchi adminlarni boshqarish"
      />

      <div class="px-5 space-y-4">
        <button
          id="inviteBtn"
          onclick="generateInvite(this)"
          class="w-full min-h-[48px] rounded-r-sm bg-crm-primary text-white font-display font-bold text-[15px] shadow-floating tap-scale focus-ring flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Icon name="plus" class="w-5 h-5" /> Taklif havolasi
        </button>

        <div
          id="inviteResult"
          class="hidden glass-card rounded-r-md p-4 shadow-soft border border-crm-borderSoft/40"
        >
        </div>

        <div id="adminsList" class="space-y-3"></div>
      </div>

      <script>{raw(adminsScript)}</script>
      <RoleBottomNav role="admin" activeId="admins" />
    </AppShell>
  );
};
