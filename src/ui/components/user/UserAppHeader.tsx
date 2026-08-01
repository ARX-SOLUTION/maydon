/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx";
import { raw } from "hono/html";
import { Icon } from "../LucideIcons.tsx";

interface UserAppHeaderProps {
  title?: string;
  subtitle?: string;
  userName?: string;
  userPhoto?: string;
  pendingCount?: number;
}

export const UserAppHeader: FC<UserAppHeaderProps> = ({ 
  title = "Bron qilish", 
  subtitle = "Maydon band qilish tizimi",
  userName,
  userPhoto,
  pendingCount = 0
}) => {
  return (
    <header class="sticky top-0 z-40 glass-panel rounded-b-r-lg border-b border-crm-borderSoft/30 shadow-soft transition-colors duration-300">
      <div class="flex items-center justify-between px-5 min-h-[64px] py-2 tma-safe-top">
        <div class="flex items-center gap-3">
          <div id="userAvatarContainer" class="relative w-10 h-10 rounded-full bg-gradient-to-tr from-crm-primary to-blue-400 flex items-center justify-center shadow-soft text-white font-display font-extrabold text-base overflow-hidden shrink-0 border border-white/20">
            {userPhoto ? (
              <img src={userPhoto} alt={userName || "Foydalanuvchi"} class="w-full h-full object-cover" />
            ) : (
              <span id="userAvatarInitials">M</span>
            )}
          </div>
          <div class="flex flex-col min-w-0">
            <h1 id="userHeaderName" class="font-display text-[17px] font-extrabold text-crm-textMain leading-tight truncate">
              {userName || title}
            </h1>
            <p class="text-[12px] font-medium text-crm-textMuted truncate">
              {subtitle}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button
            onclick="scrollToHelp()"
            aria-label="Yordam"
            class="w-10 h-10 rounded-full glass-surface flex items-center justify-center text-crm-textMuted hover:text-crm-primary tap-scale focus-ring border border-crm-borderSoft/40"
          >
            <Icon name="message" class="w-4 h-4" />
          </button>
          
          <a
            href="/app/user/requests"
            hx-get="/app/user/requests"
            hx-target="#app-content"
            hx-push-url="true"
            aria-label="So'rovlarim"
            class="relative w-10 h-10 rounded-full glass-surface flex items-center justify-center text-crm-textMuted hover:text-crm-primary tap-scale focus-ring border border-crm-borderSoft/40"
          >
            <Icon name="bell" class="w-4 h-4" />
            <span 
              id="headerPendingBadge" 
              class={`absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-crm-danger text-white text-[11px] font-extrabold flex items-center justify-center shadow-sm ${pendingCount > 0 ? '' : 'hidden'}`}
            >
              {pendingCount}
            </span>
          </a>
        </div>
      </div>
      <script>
        {raw(`
          (function initHeaderUser() {
            if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
              var u = window.Telegram.WebApp.initDataUnsafe.user;
              var nameEl = document.getElementById('userHeaderName');
              var initialsEl = document.getElementById('userAvatarInitials');
              if (u.first_name && nameEl) {
                nameEl.textContent = u.first_name + (u.last_name ? ' ' + u.last_name : '');
              }
              if (u.first_name && initialsEl) {
                initialsEl.textContent = u.first_name.charAt(0).toUpperCase();
              }
            }
          })();

          function scrollToHelp() {
            var onboard = document.getElementById('onboardHint');
            if (onboard) {
              onboard.scrollIntoView({ behavior: 'smooth', block: 'center' });
              if (window.gsap) gsap.fromTo(onboard, { scale: 0.97 }, { scale: 1, duration: 0.3, ease: 'back.out(1.5)' });
            } else {
              window.toast("Har bir yashil katakcha — bo'sh vaqt. Bosib bron qilishingiz mumkin!", "info");
            }
          }
        `)}
      </script>
    </header>
  );
};

