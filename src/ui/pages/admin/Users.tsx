/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";
import { AppShell, PageHeader } from "../../components/UIComponents.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";

const usersScript = `
var PROFILE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
var LOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
var UNLOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';

function auth() {
  return { "Authorization": "Bearer " + (window.Telegram?.WebApp?.initData || "") };
}

function escHtml(s) {
  var d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function userRow(u) {
  var isBlocked = u.isBlocked;
  var btnClass = isBlocked 
    ? "bg-crm-primarySoft text-crm-primary" 
    : "bg-crm-dangerSoft text-crm-danger";
  var btnIcon = isBlocked ? UNLOCK_SVG : LOCK_SVG;
  var btnText = isBlocked ? "Ochish" : "Bloklash";
  
  var noShowClass = u.noShows > 0 ? "text-crm-danger" : "text-crm-textMuted";

  return '<div class="bg-crm-surface rounded-[24px] p-4 shadow-soft flex flex-col gap-3">'
    + '<div class="flex items-center justify-between gap-3">'
      + '<div class="flex items-center gap-3 min-w-0">'
        + '<div class="w-10 h-10 rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center shrink-0">' + PROFILE_SVG + '</div>'
        + '<div class="min-w-0">'
          + '<div class="text-[15px] font-bold truncate">' + escHtml(u.name || 'Nomsiz') + '</div>'
          + '<div class="text-[13px] text-crm-textMuted truncate">' + escHtml(u.phone || 'Nomer yo\\'q') + '</div>'
        + '</div>'
      + '</div>'
      + '<button onclick="toggleBlock(' + u.telegramId + ', this)" aria-label="' + btnText + '" class="min-w-[44px] min-h-[44px] rounded-[14px] ' + btnClass + ' flex items-center justify-center gap-1.5 px-3 text-[13px] font-semibold tap-scale focus-ring shrink-0 disabled:opacity-50">' + btnIcon + ' ' + btnText + '</button>'
    + '</div>'
    + '<div class="flex items-center gap-4 text-[13px] pt-3 border-t border-crm-borderSoft mt-1">'
      + '<div>Jami: <span class="font-bold text-crm-text">' + u.totalBookings + '</span> ta</div>'
      + '<div>No-show: <span class="font-bold ' + noShowClass + '">' + u.noShows + '</span> ta</div>'
    + '</div>'
  + '</div>';
}

async function loadUsers() {
  var list = document.getElementById("usersList");
  if (!list) return;
  list.innerHTML = '<div class="text-center text-crm-textMuted text-sm font-medium py-8">Yuklanmoqda...</div>';
  try {
    var res = await fetch("/api/admin/users", { headers: auth() });
    if (!res.ok) {
      list.innerHTML = '<div class="bg-crm-surface rounded-[24px] p-8 shadow-soft text-center text-crm-textMuted text-sm font-medium">Xatolik yuz berdi.</div>';
      return;
    }
    var data = await res.json();
    if (data.length === 0) {
      list.innerHTML = '<div class="bg-crm-surface rounded-[24px] p-8 shadow-soft text-center text-crm-textMuted text-sm font-medium flex flex-col items-center"><div class="w-12 h-12 rounded-full bg-crm-background flex items-center justify-center text-crm-textMuted mb-3">' + PROFILE_SVG + '</div>Hozircha mijozlar yo\\'q</div>';
      return;
    }
    
    // Sort logic: blocked users at bottom, then those with most no-shows
    data.sort((a, b) => {
      if (a.isBlocked !== b.isBlocked) return a.isBlocked ? 1 : -1;
      return b.noShows - a.noShows;
    });

    list.innerHTML = data.map(function(u) { return userRow(u); }).join("");
  } catch(e) {
    list.innerHTML = '<div class="text-center text-crm-danger text-sm font-medium py-8">Xatolik yuz berdi</div>';
  }
}

window.toggleBlock = async function(id, btn) {
  var isBlocking = btn.textContent.includes("Bloklash");
  if (isBlocking) {
    if (!confirm("Haqiqatan ham bu foydalanuvchini bloklamoqchimisiz?")) return;
  }
  
  btn.disabled = true;
  var oldHtml = btn.innerHTML;
  btn.innerHTML = '<span class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>';
  
  try {
    var res = await fetch("/api/admin/users/" + id + "/toggle-block", {
      method: "POST",
      headers: auth()
    });
    var data = await res.json();
    if (!res.ok) {
      window.toast(data.error || "Xatolik yuz berdi", "error");
      btn.innerHTML = oldHtml;
      btn.disabled = false;
      return;
    }
    
    // success: toggle UI
    window.toast(data.isBlocked ? "Bloklandi" : "Blokdan chiqarildi");
    
    var isBlocked = data.isBlocked;
    btn.className = "min-w-[44px] min-h-[44px] rounded-[14px] flex items-center justify-center gap-1.5 px-3 text-[13px] font-semibold tap-scale focus-ring shrink-0 disabled:opacity-50 " + (isBlocked ? "bg-crm-primarySoft text-crm-primary" : "bg-crm-dangerSoft text-crm-danger");
    btn.innerHTML = (isBlocked ? UNLOCK_SVG : LOCK_SVG) + " " + (isBlocked ? "Ochish" : "Bloklash");
    btn.disabled = false;
  } catch (e) {
    window.toast("Xatolik", "error");
    btn.innerHTML = oldHtml;
    btn.disabled = false;
  }
};

document.addEventListener("DOMContentLoaded", loadUsers);
`;

export const AdminUsers: FC = () => {
  return (
    <AppShell>
      <PageHeader
        title="Mijozlar"
        subtitle="Mijozlar reytingi va bloklash"
      />

      <div class="px-4 pb-[100px] mt-4 flex flex-col gap-3">
        <div id="usersList" class="flex flex-col gap-3">
          {/* Loaded via client-side script */}
        </div>
      </div>

      <RoleBottomNav role="admin" activeId="users" />

      <script
        type="text/javascript"
        dangerouslySetInnerHTML={{ __html: raw(usersScript) }}
      />
    </AppShell>
  );
};
