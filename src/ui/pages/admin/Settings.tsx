/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';
import { AppShell, PageHeader, Card } from '../../components/UIComponents.tsx';
import { RoleBottomNav } from '../../components/RoleBottomNav.tsx';
import { Icon } from '../../components/LucideIcons.tsx';

export const AdminSettings: FC = () => {
  return (
    <AppShell>
      <PageHeader title="Sozlamalar" />

      <div class="px-5 space-y-5">
        {/* Working Hours */}
        <div class="gsap-stagger">
          <h2 class="text-[15px] font-bold px-1 mb-2">Ish vaqti</h2>
          <Card class="p-4">
            <div class="flex items-center justify-between gap-4">
              <div class="flex-1">
                <span class="block text-[12px] font-semibold text-crm-textMuted uppercase mb-1">Ochilish</span>
                <div class="h-[44px] bg-crm-surfaceSoft rounded-[12px] flex items-center px-3 text-[16px] font-bold tabular-nums">
                  08:00
                </div>
              </div>
              <div class="text-crm-textMuted mt-4">—</div>
              <div class="flex-1">
                <span class="block text-[12px] font-semibold text-crm-textMuted uppercase mb-1">Yopilish</span>
                <div class="h-[44px] bg-crm-surfaceSoft rounded-[12px] flex items-center px-3 text-[16px] font-bold tabular-nums">
                  23:00
                </div>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-crm-borderSoft flex justify-between items-center">
              <div>
                <span class="block text-[14px] font-bold">Bron qilish gorizonti</span>
                <span class="block text-[12px] text-crm-textMuted">Oldinga necha kun ochiladi</span>
              </div>
              <div class="h-[44px] w-[80px] bg-crm-surfaceSoft rounded-[12px] flex items-center justify-between px-3 text-[16px] font-bold tabular-nums">
                7 <span class="text-[12px] text-crm-textMuted font-medium">kun</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Admins */}
        <div class="gsap-stagger">
          <div class="flex justify-between items-center px-1 mb-2">
            <h2 class="text-[15px] font-bold">Adminlar</h2>
            <button class="text-[13px] font-bold text-crm-primary">Qo'shish</button>
          </div>
          <Card class="p-2">
            <div class="flex items-center justify-between p-2">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-crm-primary text-white flex items-center justify-center font-bold mr-3">S</div>
                <div>
                  <span class="block text-[15px] font-bold text-crm-textMain">Sardor (Siz)</span>
                  <span class="block text-[12px] text-crm-textMuted">Asosiy admin</span>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between p-2">
              <div class="flex items-center">
                <div class="w-10 h-10 rounded-full bg-crm-surfaceSoft text-crm-textMain flex items-center justify-center font-bold mr-3">A</div>
                <div>
                  <span class="block text-[15px] font-bold text-crm-textMain">Alisher</span>
                  <span class="block text-[12px] text-crm-textMuted">Yordamchi</span>
                </div>
              </div>
              <button class="w-8 h-8 flex items-center justify-center text-crm-danger">
                <Icon name="xCircle" class="w-5 h-5" />
              </button>
            </div>
          </Card>
        </div>

        {/* Blocked users */}
        <div class="gsap-stagger px-1">
          <button class="w-full flex justify-between items-center p-4 rounded-[16px] bg-crm-surface shadow-soft active:scale-95 transition-transform">
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full bg-crm-dangerSoft text-crm-danger flex items-center justify-center mr-3">
                <Icon name="xCircle" class="w-4 h-4" />
              </div>
              <span class="text-[15px] font-bold text-crm-textMain">Bloklangan foydalanuvchilar</span>
            </div>
            <span class="bg-crm-surfaceSoft text-crm-textMuted text-[12px] font-bold px-2 py-1 rounded-md">12 ta</span>
          </button>
        </div>

        <div class="h-4"></div>
      </div>

      <RoleBottomNav role="admin" activeId="settings" />
    </AppShell>
  );
};
