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
import { getBookingsByUser, getUser, userApprovalStatus } from "../../../kv.ts";
import { formatUzLongDate } from "../../date.ts";

export const UserProfile: FC<{ userId: number }> = async ({ userId }) => {
  const [user, bookings] = await Promise.all([
    getUser(userId),
    getBookingsByUser(userId),
  ]);

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
      <UserAppHeader title="Profil" subtitle="Shaxsiy ma'lumotlaringiz" />

      <div class="px-5 space-y-4 pt-4">
        <Card class="p-6 items-center text-center gsap-stagger relative overflow-hidden border border-crm-borderSoft/50">
          <div class="absolute inset-0 bg-gradient-to-b from-crm-primarySoft/30 to-transparent pointer-events-none"></div>
          
          <div class="relative w-24 h-24 rounded-full bg-crm-surface border-4 border-crm-surface shadow-soft flex items-center justify-center mb-2 z-10">
            <div class="w-full h-full rounded-full bg-gradient-to-tr from-crm-primary to-blue-400 flex items-center justify-center text-white">
              <span class="text-3xl font-bold">{name.charAt(0).toUpperCase()}</span>
            </div>
          </div>
          <span class="text-[20px] font-extrabold text-crm-textMain">
            {name}
          </span>
          {user?.username
            ? (
              <span class="text-[14px] font-medium text-crm-textMuted">
                @{user.username}
              </span>
            )
            : null}
          {user?.phone
            ? (
              <span class="text-[14px] font-semibold text-crm-textMain tabular-nums flex items-center gap-1.5 mt-1">
                <Icon name="profile" class="w-4 h-4 text-crm-textMuted" />
                {user.phone}
              </span>
            )
            : null}
          {memberSince
            ? (
              <span class="text-[12px] font-medium text-crm-textMuted mt-2 flex items-center gap-1.5">
                <Icon name="calendar" class="w-4 h-4" />
                A'zo bo'lgan sana: {memberSince}
              </span>
            )
            : null}
          <span class={`mt-3 inline-flex items-center rounded-full px-3 py-1 text-[12px] font-bold ${approval === "approved" ? "bg-crm-successSoft text-crm-success" : approval === "rejected" ? "bg-crm-dangerSoft text-crm-danger" : "bg-crm-primarySoft text-crm-primary"}`}>
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

        <div class="bg-crm-primarySoft/45 rounded-2xl p-4 gsap-stagger flex items-start gap-3 border border-crm-primary/10">
          <div class="w-10 h-10 shrink-0 rounded-xl bg-crm-primary/15 text-crm-primary flex items-center justify-center shadow-sm">
            <Icon name="message" class="w-5 h-5" />
          </div>
          <div class="flex flex-col">
            <span class="text-[13px] font-bold text-crm-textMain mb-0.5">Ma'lumotlarni yangilash</span>
            <p class="text-[12px] font-medium text-crm-textMuted leading-relaxed">
              Ism yoki telefon raqamingizni o'zgartirish uchun Telegram botga o'tib <span class="bg-crm-surfaceSoft px-1.5 py-0.5 rounded text-crm-textMain font-mono text-[11px]">/start</span> buyrug'ini yuboring.
            </p>
          </div>
        </div>
      </div>

      <RoleBottomNav role="user" activeId="profile" />
    </AppShell>
  );
};
