/** @jsxImportSource hono/jsx */
import { html } from 'hono/html';
import { FC } from 'hono/jsx';

export const AdminPage: FC = () => {
  // MOCK DATA for Admin UI
  const bookings = [
    { time: '10:00 - 11:30', client: 'Ali Valiyev', phone: '+998901234567', status: 'completed' },
    { time: '14:00 - 15:00', client: 'Rustam (Telegram)', phone: '@rustam_dev', status: 'pending' },
    { time: '19:00 - 21:00', client: 'FC Do\'stlik', phone: '+998939876543', status: 'confirmed' },
  ];

  return html`
    <div class="pb-28 min-h-screen">
      
      <!-- App Bar -->
      <div class="bg-crm-bg/90 backdrop-blur-xl px-4 pt-6 pb-4 rounded-b-[28px] shadow-glass mb-6 sticky top-0 z-50 border-b border-crm-borderSoft/30 gsap-stagger">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h1 class="text-3xl font-bold tracking-tight text-crm-textMain">Admin Panel</h1>
            <p class="text-crm-textMuted text-sm mt-1">Today's Schedule</p>
          </div>
          <div class="h-11 w-11 bg-crm-primary/20 rounded-full flex items-center justify-center text-crm-primary font-bold border border-crm-primary/30 shadow-inner">
            A
          </div>
        </div>

        <!-- Segmented Control (Tabs) -->
        <div class="flex p-1.5 bg-crm-surfaceSoft rounded-[18px] relative border border-crm-borderSoft/50">
          <button class="flex-1 py-2 text-sm font-bold text-crm-onPrimary bg-crm-primary rounded-[14px] shadow-sm transition-transform active:scale-[0.96] relative z-10">
            Schedule
          </button>
          <button class="flex-1 py-2 text-sm font-semibold text-crm-textMuted rounded-[14px] transition-transform active:scale-[0.96] active:bg-crm-textMuted/10 relative z-10 flex items-center justify-center">
            Requests 
            <span class="ml-1.5 bg-crm-danger text-white tabular-nums font-bold text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">1</span>
          </button>
          <button class="flex-1 py-2 text-sm font-semibold text-crm-textMuted rounded-[14px] transition-transform active:scale-[0.96] active:bg-crm-textMuted/10 relative z-10">
            Settings
          </button>
        </div>
      </div>

      <!-- Content: Bookings List -->
      <div class="px-4 space-y-4">
        ${bookings.map(b => {
          let badgeClass = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ";
          if (b.status === 'completed') badgeClass += "bg-crm-successSoft text-crm-success";
          else if (b.status === 'pending') badgeClass += "bg-crm-warningSoft text-crm-warning ring-1 ring-crm-warning/20";
          else if (b.status === 'confirmed') badgeClass += "bg-crm-accent/10 text-crm-accent";

          return html`
            <div class="bg-crm-surface p-5 rounded-[24px] shadow-soft border border-crm-borderSoft/40 transition-transform active:scale-[0.98] gsap-stagger relative overflow-hidden">
              ${b.status === 'pending' ? html`<div class="absolute top-0 left-0 w-1 h-full bg-crm-warning"></div>` : ''}
              
              <div class="flex justify-between items-start mb-3">
                <span class="${badgeClass}">${b.status}</span>
                <span class="text-sm font-bold tabular-nums text-crm-textMuted/80 bg-crm-surfaceSoft px-2.5 py-1 rounded-lg">${b.time}</span>
              </div>
              <h3 class="text-xl font-bold mb-1 text-crm-textMain">${b.client}</h3>
              <p class="text-sm text-crm-textMuted flex items-center mb-4">
                <svg class="w-4 h-4 mr-1.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                <span class="tabular-nums font-medium">${b.phone}</span>
              </p>
              
              ${b.status === 'pending' ? html`
                <div class="flex space-x-3 mt-5 pt-5 border-t border-crm-borderSoft/50">
                  <button class="flex-1 h-12 rounded-[16px] bg-crm-dangerSoft text-crm-danger font-bold text-sm transition-transform active:scale-[0.96]">Decline</button>
                  <button class="flex-1 h-12 rounded-[16px] bg-crm-success text-white font-bold text-sm transition-transform active:scale-[0.96] shadow-md shadow-crm-success/20">Accept</button>
                </div>
              ` : ''}
            </div>
          `;
        })}
      </div>

      <!-- Floating Action Button -->
      <button class="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-crm-accent text-white rounded-[20px] shadow-floating flex items-center justify-center transition-transform active:scale-[0.96] z-40 gsap-stagger">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
      </button>

    </div>
  `;
};
