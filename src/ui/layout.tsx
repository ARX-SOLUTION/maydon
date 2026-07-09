/** @jsxImportSource hono/jsx */
import { raw } from "hono/html";
import type { FC } from "hono/jsx";

const inlineStyles = `
:root {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
body {
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.10), transparent 32rem),
    linear-gradient(180deg, #F8FAFC 0%, #EEF6F1 100%);
  color: #0F172A;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: none;
  touch-action: manipulation;
}
h1, h2, h3 { text-wrap: balance; }
p { text-wrap: pretty; }
.tabular-nums { font-variant-numeric: tabular-nums; }
.focus-ring:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.38);
  outline-offset: 3px;
}
.tap-scale {
  transition-property: transform, box-shadow, background-color, color, opacity;
  transition-duration: 180ms;
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);
}
.tap-scale:active:not(:disabled) {
  transform: scale(0.96);
}
.tap-scale:disabled {
  cursor: not-allowed;
}
.htmx-indicator {
  opacity: 0;
  transition: opacity 200ms ease-in;
}
.htmx-request .htmx-indicator,
.htmx-request.htmx-indicator {
  opacity: 1;
}
.tma-safe-top {
  padding-top: max(16px, env(safe-area-inset-top));
}
.gsap-stagger {
  visibility: hidden;
  will-change: transform, opacity;
}
.scrollbar-hide {
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
`;

const clientScript = `
// Initialize Telegram Web App
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand();
  window.Telegram.WebApp.setHeaderColor('#F8FAFC');
  window.Telegram.WebApp.setBackgroundColor('#F8FAFC');
}

// HTMX config — inject auth header
document.body.addEventListener('htmx:configRequest', function(evt) {
  if (window.Telegram?.WebApp?.initData) {
    evt.detail.headers['Authorization'] = 'Bearer ' + window.Telegram.WebApp.initData;
  }
});

// Global Toast System (GSAP powered)
window.toast = function(message, type) {
  type = type || 'info';
  var toastWrap = document.getElementById('toastWrap');
  if (!toastWrap) {
    toastWrap = document.createElement('div');
    toastWrap.id = 'toastWrap';
    toastWrap.className = 'fixed right-4 bottom-4 z-60 flex flex-col gap-2 w-[min(380px,calc(100%-2rem))] pointer-events-none';
    toastWrap.setAttribute('aria-live', 'polite');
    toastWrap.setAttribute('aria-atomic', 'true');
    document.body.appendChild(toastWrap);
  }
  var box = document.createElement('div');
  box.className = 'px-4 py-3 rounded-[18px] bg-crm-onPrimary/95 text-white shadow-floating text-sm font-bold pointer-events-auto';
  box.setAttribute('role', 'status');
  if (type === 'error') box.className += ' !bg-crm-danger';
  if (type === 'success') box.className += ' !bg-crm-success';
  box.textContent = message;
  toastWrap.appendChild(box);
  if (window.gsap) {
    gsap.fromTo(box, { y: 18, autoAlpha: 0, scale: .96 }, { y: 0, autoAlpha: 1, scale: 1, duration: .26, ease: 'back.out(1.5)' });
    setTimeout(function() {
      gsap.to(box, { y: 12, autoAlpha: 0, duration: .22, ease: 'power2.in', onComplete: function() { box.remove(); } });
    }, 4400);
  } else {
    setTimeout(function() { box.remove(); }, 4400);
  }
};

// HTMX Error Handling
document.body.addEventListener('htmx:responseError', function(evt) {
  var errorMsg = 'Xatolik yuz berdi';
  try {
    var res = JSON.parse(evt.detail.xhr.response);
    if (res.error) errorMsg = res.error;
  } catch(e) {}
  window.toast(errorMsg, 'error');
});

// Top progress bar during htmx navigation (SSR page swaps have no built-in feedback)
var navBar = document.createElement('div');
navBar.style.cssText = 'position:fixed;top:0;left:0;height:3px;background:#2563EB;z-index:70;width:0%;opacity:0;pointer-events:none;';
document.body.appendChild(navBar);
document.body.addEventListener('htmx:beforeRequest', function() {
  if (window.gsap) {
    gsap.killTweensOf(navBar);
    gsap.set(navBar, { width: '0%', opacity: 1 });
    gsap.to(navBar, { width: '70%', duration: 0.5, ease: 'power1.out' });
  } else {
    navBar.style.opacity = 1;
    navBar.style.width = '70%';
  }
});
document.body.addEventListener('htmx:afterRequest', function() {
  if (window.gsap) {
    gsap.to(navBar, { width: '100%', duration: 0.2, ease: 'power1.out', onComplete: function() {
      gsap.to(navBar, { opacity: 0, duration: 0.2, delay: 0.1, onComplete: function() { gsap.set(navBar, { width: '0%' }); } });
    }});
  } else {
    navBar.style.width = '100%';
    setTimeout(function() { navBar.style.opacity = 0; navBar.style.width = '0%'; }, 200);
  }
});

// GSAP stagger entrance animation
function runAnimations() {
  var elements = document.querySelectorAll('.gsap-stagger');
  if (!elements.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (window.gsap) gsap.set(elements, { autoAlpha: 1, clearProps: 'willChange' });
    else elements.forEach(function(el) { el.style.visibility = 'visible'; el.style.opacity = '1'; });
    return;
  }
  if (!window.gsap) {
    elements.forEach(function(el) { el.style.visibility = 'visible'; el.style.opacity = '1'; });
    return;
  }
  gsap.fromTo(elements,
    { autoAlpha: 0, y: 12 },
    { autoAlpha: 1, y: 0, duration: 0.36, stagger: 0.06, ease: "power2.out", clearProps: "transform,willChange" }
  );
}
document.addEventListener('DOMContentLoaded', runAnimations);
document.body.addEventListener('htmx:afterSettle', runAnimations);
`;

export const Layout: FC = ({ children }) => (
  <html lang="uz">
    <head>
      <meta charset="UTF-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, viewport-fit=cover"
      />
      <title>Maydon Booking</title>
      {/* Precompiled Tailwind (deno task build:css) — replaces the in-browser
          cdn.tailwindcss.com compiler, which recompiled CSS on every HTMX DOM
          swap and was the app's biggest slowdown. */}
      <link rel="stylesheet" href="/static/app.css" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossorigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />
      <script src="https://telegram.org/js/telegram-web-app.js"></script>
      {/* defer: non-blocking; the inline body script guards on window.gsap/htmx */}
      <script defer src="https://unpkg.com/htmx.org@1.9.10"></script>
      <script
        defer
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
      >
      </script>
      <style>{raw(inlineStyles)}</style>
    </head>
    <body class="antialiased min-h-screen">
      {children}
      <script>{raw(clientScript)}</script>
    </body>
  </html>
);
