/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";
import {
  AppShell,
  Card,
  MetricCard,
  PageHeader,
} from "../../components/UIComponents.tsx";
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
      <PageHeader title="Profil" subtitle="Shaxsiy ma'lumotlaringiz" />

      <div class="px-5 space-y-4">
        <Card class="p-6 items-center text-center gsap-stagger">
          <div class="w-20 h-20 rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center mb-1">
            <Icon name="profile" class="w-10 h-10" />
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

        <Card class="p-4 gsap-stagger flex-row items-start gap-3">
          <div class="w-9 h-9 shrink-0 rounded-full bg-crm-primarySoft text-crm-primary flex items-center justify-center">
            <Icon name="message" class="w-5 h-5" />
          </div>
          <p class="text-[13px] font-medium text-crm-textMuted leading-relaxed">
            Ism yoki telefonni o'zgartirish uchun Telegram botga /start yozing.
          </p>
        </Card>
      </div>

      <RoleBottomNav role="user" activeId="profile" />
    </AppShell>
  );
};
