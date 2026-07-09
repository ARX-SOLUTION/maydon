/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";
import { Icon } from "./LucideIcons.tsx";

type Role = "admin" | "user";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

const adminNav: NavItem[] = [
  {
    id: "requests",
    label: "So'rovlar",
    icon: "bell",
    href: "/app/admin/requests",
  },
  {
    id: "schedule",
    label: "Jadval",
    icon: "calendar",
    href: "/app/admin/schedule",
  },
  {
    id: "recurring",
    label: "Doimiy",
    icon: "refresh",
    href: "/app/admin/recurring",
  },
  {
    id: "settings",
    label: "Sozlamalar",
    icon: "settings",
    href: "/app/admin/settings",
  },
];

const userNav: NavItem[] = [
  { id: "week", label: "Hafta", icon: "calendar", href: "/app/user/week" },
  { id: "day", label: "Kun", icon: "clock", href: "/app/user/day" },
  {
    id: "requests",
    label: "So'rovlarim",
    icon: "list",
    href: "/app/user/requests",
  },
];

export const RoleBottomNav: FC<{ role: Role; activeId: string }> = (
  { role, activeId },
) => {
  const items = role === "admin" ? adminNav : userNav;

  return (
    <nav
      class="fixed bottom-0 left-0 right-0 mx-auto max-w-[480px] bg-crm-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] z-50 rounded-t-[28px] shadow-[0_-8px_28px_rgba(15,23,42,0.10)]"
      aria-label={role === "admin"
        ? "Admin navigatsiyasi"
        : "Foydalanuvchi navigatsiyasi"}
    >
      <div class="flex justify-around items-center min-h-[68px] px-2 gap-1">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <a
              href={item.href}
              hx-get={item.href}
              hx-target="#app-content"
              hx-swap="innerHTML"
              hx-push-url="true"
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              class={`flex flex-col items-center justify-center min-w-[44px] flex-1 min-h-[60px] rounded-[18px] tap-scale focus-ring ${
                isActive
                  ? "text-crm-primary bg-crm-primarySoft/45"
                  : "text-crm-textMuted hover:text-crm-textMain hover:bg-crm-surfaceSoft"
              }`}
            >
              <div class="relative flex items-center justify-center w-8 h-8 mb-0.5">
                <div class="relative z-10">
                  <Icon
                    name={item.icon}
                    class={`w-5 h-5 ${
                      isActive ? "stroke-[2.5px]" : "stroke-2"
                    }`}
                  />
                </div>
              </div>
              <span class="text-[10px] font-bold tracking-normal leading-tight">
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
};
