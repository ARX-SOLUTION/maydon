/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";
import {
  AppShell,
  Card,
  MetricCard,
} from "../../components/UIComponents.tsx";
import { UserAppHeader } from "../../components/user/UserAppHeader.tsx";
import { RoleBottomNav } from "../../components/RoleBottomNav.tsx";
import { Icon } from "../../components/LucideIcons.tsx";
import { getBookingsByUser, getUser, userApprovalStatus, getPendingRequests } from "../../../kv.ts";
import { formatUzLongDate } from "../../date.ts";

export const UserProfile: FC<{ userId: number }> = async ({ userId }) => {
  const [user, bookings, pendingReqs] = await Promise.all([
    getUser(userId),
    getBookingsByUser(userId),
    getPendingRequests(),
  ]);

  const userPendingCount = pendingReqs.filter((r) => r.userId === userId).length;

  const name = user?.name || "Foydalanuvchi";
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const memberSince = user?.createdAt
    ? formatUzLongDate(new Date(user.createdAt))
    : null;
  const approval = user ? userApprovalStatus(user) : "pending";
  const approvalLabel = approval === "approved"
    ? "Tasdiqlangan"
    : approval === "rejected"
    ? "Rad etilgan"
    : "Admin tasdig'i kutilmoqda";

  return (
    <AppShell>
      <UserAppHeader 
        title="Profil" 
        subtitle="Shaxsiy ma'lumotlaringiz" 
        userName={name}
        userPhoto={user?.photoUrl}
        pendingCount={userPendingCount}
      />

      <div class="px-5 space-y-4 pt-4">
        <Card class="p-6 items-center text-center gsap-stagger relative overflow-hidden border border-crm-borderSoft/40 glass-card rounded-r-md">
          <div class="absolute inset-0 bg-gradient-to-b from-crm-primarySoft/30 to-transparent pointer-events-none"></div>
          
          <div class="relative w-24 h-24 rounded-full bg-crm-surface border-4 border-white/30 shadow-floating flex items-center justify-center mb-3 z-10 overflow-hidden">
            {user?.photoUrl ? (
              <img src={user.photoUrl} alt={name} class="w-full h-full object-cover" />
            ) : (
              <div class="w-full h-full rounded-full bg-gradient-to-tr from-crm-primary to-blue-400 flex items-center justify-center text-white font-display font-extrabold text-3xl">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h2 class="font-display text-[22px] font-extrabold text-crm-textMain leading-tight">
            {name}
          </h2>
          {user?.username
            ? (
              <span class="text-[14px] font-semibold text-crm-textMuted mt-0.5">
                @{user.username}
              </span>
            )
            : null}
          {user?.phone
            ? (
              <span class="text-[14px] font-bold text-crm-textMain tabular-nums flex items-center justify-center gap-1.5 mt-1 bg-crm-surfaceSoft/60 px-3 py-1 rounded-r-xs">
                <Icon name="profile" class="w-4 h-4 text-crm-textMuted shrink-0" />
                {user.phone}
              </span>
            )
            : null}
          {memberSince
            ? (
              <span class="text-[12px] font-medium text-crm-textMuted mt-2 flex items-center justify-center gap-1.5">
                <Icon name="calendar" class="w-4 h-4 shrink-0" />
                A'zo bo'lgan sana: {memberSince}
              </span>
            )
            : null}
          <span class={`mt-3 inline-flex items-center rounded-r-xs px-3 py-1 text-[12px] font-bold ${approval === "approved" ? "bg-crm-successSoft text-crm-success" : approval === "rejected" ? "bg-crm-dangerSoft text-crm-danger" : "bg-crm-primarySoft text-crm-primary"}`}>
            {approvalLabel}
          </span>
          {user?.approvalDecidedByName
            ? (
              <span class="text-[12px] font-medium text-crm-textMuted mt-1">
                Qaror bergan admin: {user.approvalDecidedByName}
              </span>
            )
            : null}
        </Card>

        <div class="grid grid-cols-2 gap-4 gsap-stagger">
          <MetricCard title="Jami so'rovlar" value={String(bookings.length)} />
          <MetricCard
            title="Tasdiqlangan"
            value={String(confirmed)}
            highlight
          />
        </div>

        <div class="glass-surface rounded-r-md p-4 gsap-stagger flex items-start gap-3 border border-crm-primary/15">
          <div class="w-10 h-10 shrink-0 rounded-r-sm bg-crm-primarySoft text-crm-primary flex items-center justify-center shadow-soft">
            <Icon name="message" class="w-5 h-5" />
          </div>
          <div class="flex flex-col">
            <span class="font-display text-[13px] font-bold text-crm-textMain mb-0.5">Ma'lumotlarni yangilash</span>
            <p class="text-[12px] font-medium text-crm-textMuted leading-relaxed">
              Ism yoki telefon raqamingizni o'zgartirish uchun Telegram botga o'tib <span class="bg-crm-surfaceSoft px-1.5 py-0.5 rounded-r-xs text-crm-textMain font-mono text-[11px]">/start</span> buyrug'ini yuboring.
            </p>
          </div>
        </div>
      </div>

      <RoleBottomNav role="user" activeId="profile" />
    </AppShell>
  );
};
