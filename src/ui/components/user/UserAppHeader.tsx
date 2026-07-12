/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";

interface UserAppHeaderProps {
  title?: string;
  subtitle?: string;
}

export const UserAppHeader: FC<UserAppHeaderProps> = ({ 
  title = "BronQilish", 
  subtitle = "Maydon band qilish tizimi" 
}) => {
  return (
    <header class="sticky top-0 z-40 bg-crm-header/90 backdrop-blur-md border-b border-crm-borderSoft/30 shadow-sm transition-colors duration-300">
      <div class="flex items-center justify-between px-4 min-h-[56px] tma-safe-top">
        <div class="flex items-center gap-3 py-2">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-crm-primary to-blue-400 flex items-center justify-center shadow-soft text-white font-bold text-lg">
            M
          </div>
          <div class="flex flex-col">
            <h1 class="text-[17px] font-bold text-crm-textMain leading-tight">
              {title}
            </h1>
            <p class="text-[12px] font-medium text-crm-textMuted">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
