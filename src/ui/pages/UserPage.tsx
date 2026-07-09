/** @jsxImportSource hono/jsx */
import { html } from 'hono/html';
import { FC } from 'hono/jsx';

export const UserPage: FC = () => {
  // MOCK DATA for UI design
  const dates = [
    { day: 'Mon', date: '12', active: true },
    { day: 'Tue', date: '13', active: false },
    { day: 'Wed', date: '14', active: false },
    { day: 'Thu', date: '15', active: false },
    { day: 'Fri', date: '16', active: false },
    { day: 'Sat', date: '17', active: false },
    { day: 'Sun', date: '18', active: false },
  ];

  const timeSlots = [
    { time: '09:00', status: 'past' },
    { time: '10:00', status: 'past' },
    { time: '11:00', status: 'booked' },
    { time: '12:00', status: 'available' },
    { time: '13:00', status: 'available' },
    { time: '14:00', status: 'booked' },
    { time: '15:00', status: 'selected' },
    { time: '16:00', status: 'selected' },
    { time: '17:00', status: 'available' },
    { time: '18:00', status: 'available' },
    { time: '19:00', status: 'booked' },
    { time: '20:00', status: 'available' },
    { time: '21:00', status: 'available' },
    { time: '22:00', status: 'available' },
  ];

  return html`
    <div class="pb-28 px-4 pt-6">
      
      <!-- Header -->
      <header class="mb-8 gsap-stagger">
        <h1 class="text-3xl font-bold tracking-tight text-crm-textMain">Select a Time</h1>
        <p class="text-crm-textMuted text-sm mt-1">Book the field for your upcoming match.</p>
      </header>

      <!-- Date Selector (Horizontal Scroll) -->
      <div class="mb-8 gsap-stagger">
        <div class="flex space-x-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 snap-x">
          ${dates.map(d => html`
            <button class="snap-start flex flex-col items-center justify-center min-w-[68px] h-20 rounded-2xl transition-all active:scale-[0.96] ${
              d.active 
                ? 'bg-crm-primary text-crm-onPrimary shadow-soft ring-1 ring-crm-primary' 
                : 'bg-crm-surface text-crm-textMain shadow-glass border border-crm-borderSoft/50'
            }">
              <span class="text-xs font-medium uppercase opacity-70 mb-1">${d.day}</span>
              <span class="text-xl font-bold">${d.date}</span>
            </button>
          `)}
        </div>
      </div>

      <!-- Bento Card: Time Grid -->
      <div class="mb-6 p-5 bg-crm-surface rounded-3xl shadow-soft border border-crm-borderSoft/30 gsap-stagger">
        <div class="flex justify-between items-end mb-5">
          <h2 class="text-sm font-bold text-crm-textMain uppercase tracking-wider">Available Slots</h2>
          <span class="text-xs font-medium text-crm-textMuted bg-crm-surfaceSoft px-2 py-1 rounded-md">2h selected</span>
        </div>
        
        <div class="grid grid-cols-3 gap-3">
          ${timeSlots.map(slot => {
            let btnClass = "flex items-center justify-center h-12 rounded-[14px] text-sm font-semibold transition-all duration-200 tabular-nums ";
            let disabled = "";
            
            if (slot.status === 'past') {
              btnClass += "bg-crm-muted text-crm-textMuted opacity-40 cursor-not-allowed";
              disabled = "disabled";
            } else if (slot.status === 'booked') {
              btnClass += "bg-crm-surfaceSoft text-crm-textMuted cursor-not-allowed relative overflow-hidden line-through decoration-crm-textMuted/40";
              disabled = "disabled";
            } else if (slot.status === 'selected') {
              btnClass += "bg-crm-accent text-white shadow-floating scale-[1.02] ring-2 ring-crm-accent ring-offset-2 ring-offset-crm-surface z-10";
            } else {
              // available
              btnClass += "bg-crm-bg text-crm-textMain hover:bg-crm-primary/10 active:scale-[0.96] border border-crm-borderSoft/50";
            }

            return html`
              <button ${disabled} class="${btnClass}">
                ${slot.time}
              </button>
            `;
          })}
        </div>
      </div>

      <!-- Bento Card: Info (Optional extra card to show grid structure) -->
      <div class="mb-6 p-4 bg-crm-surfaceSoft rounded-[20px] border border-crm-borderSoft/40 flex items-center space-x-4 gsap-stagger">
        <div class="w-10 h-10 rounded-full bg-crm-primary/20 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <p class="text-sm text-crm-textMain leading-relaxed">
          Please arrive 15 minutes prior to your booking. Cancellations are allowed up to 2 hours before the start.
        </p>
      </div>

      <!-- Sticky Bottom Bar CTA -->
      <div class="fixed bottom-0 left-0 right-0 p-5 bg-crm-bg/80 backdrop-blur-xl border-t border-crm-borderSoft/50 pb-[calc(1.25rem+env(safe-area-inset-bottom))] z-50">
        <button class="w-full h-14 rounded-[20px] bg-crm-primary text-crm-onPrimary font-bold text-lg flex items-center justify-center transition-transform active:scale-[0.96] shadow-floating">
          Book for 2 hours
        </button>
      </div>

      <!-- Custom CSS -->
      <style>
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      </style>
    </div>
  `;
};

