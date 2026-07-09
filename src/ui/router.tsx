/** @jsxImportSource hono/jsx */
import { Hono } from "hono";
import { raw } from "hono/html";
import { UserWeekView } from "./pages/user/WeekView.tsx";
import { UserBookCard } from "./components/BookCard.tsx";
import { UserRequests } from "./pages/user/MyRequests.tsx";
import { AdminRequests } from "./pages/admin/Requests.tsx";
import { AdminSchedule } from "./pages/admin/Schedule.tsx";
import { AdminRecurring } from "./pages/admin/Recurring.tsx";
import { AdminSettings } from "./pages/admin/Settings.tsx";
import { UserProfile } from "./pages/user/Profile.tsx";
import { AdminAdmins } from "./pages/admin/Admins.tsx";
import { AdminUsers } from "./pages/admin/Users.tsx";
import { Layout } from "./layout.tsx";
import { authMiddleware, requireAdmin } from "../auth.ts";

export const uiRouter = new Hono();

const protectedPageBootstrapScript = `
(function loadProtectedPage() {
  var target = document.getElementById('app-content');
  if (!target) return;
  var initData = window.Telegram?.WebApp?.initData || '';
  if (!initData) {
    target.textContent = 'Telegram ilovasi orqali oching.';
    return;
  }

  fetch(window.location.pathname + window.location.search, {
    headers: {
      'Authorization': 'Bearer ' + initData,
      'HX-Request': 'true'
    }
  }).then(async function(res) {
    if (!res.ok) throw new Error(res.status === 403 ? "Bu bo'limga ruxsat yo'q." : 'Sessiya tasdiqlanmadi.');
    return await res.text();
  }).then(function(html) {
    target.innerHTML = html;
    var scripts = target.querySelectorAll('script');
    scripts.forEach(function(oldScript) {
      var newScript = document.createElement('script');
      for (var i = 0; i < oldScript.attributes.length; i++) {
        var attr = oldScript.attributes[i];
        newScript.setAttribute(attr.name, attr.value);
      }
      newScript.textContent = oldScript.textContent || '';
      oldScript.replaceWith(newScript);
    });
    if (window.htmx) window.htmx.process(target);
    if (window.runAnimations) window.runAnimations();
  }).catch(function(error) {
    target.textContent = error.message || 'Xatolik yuz berdi.';
  });
})();
`;

function ProtectedPageBootstrap() {
  return (
    <div class="min-h-[60vh] flex items-center justify-center p-8 text-center text-crm-textMuted text-sm font-medium">
      <span>Tekshirilmoqda...</span>
      <script>{raw(protectedPageBootstrapScript)}</script>
    </div>
  );
}

function isValidYmd(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isValidTime(value?: string): value is string {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function protectedPageAuth(options: { admin?: boolean } = {}) {
  const authenticate = authMiddleware();
  const authorizeAdmin = options.admin ? requireAdmin() : null;

  return async (c: any, next: () => Promise<void>) => {
    const hasAuthHeader = Boolean(c.req.header("Authorization"));
    const isHtmx = c.req.header("hx-request") === "true";
    if (!hasAuthHeader && !isHtmx) {
      return c.html(<ProtectedPageBootstrap />);
    }

    return authenticate(c, async () => {
      if (authorizeAdmin) return authorizeAdmin(c, next);
      return next();
    });
  };
}

// Middleware: wrap full-page loads in Layout shell; HTMX partials pass through
uiRouter.use("*", async (c, next) => {
  await next();
  const isHtmx = c.req.header("hx-request") === "true";
  if (!isHtmx && c.res.status === 200) {
    const content = await c.res.text();
    c.res = await c.html(
      <Layout>
        <div id="app-content" class="w-full h-full relative">
          {raw(content)}
        </div>
      </Layout>,
    );
  }
});

// User routes
uiRouter.get("/user/week", protectedPageAuth(), (c: any) => {
  const requestedDate = c.req.query("date");
  const auth = c.get("auth");
  return c.html(
    <UserWeekView
      selectedDate={isValidYmd(requestedDate) ? requestedDate : undefined}
      userId={auth.userId}
    />,
  );
});
uiRouter.get("/user/book-card", protectedPageAuth(), (c) => {
  const date = c.req.query("date");
  const start = c.req.query("start");
  if (!isValidYmd(date) || !isValidTime(start)) {
    return c.json({ error: "Sana yoki vaqt noto'g'ri" }, 400);
  }
  return c.html(
    <UserBookCard date={date} start={start} />,
  );
});
uiRouter.get("/user/requests", protectedPageAuth(), (c: any) => {
  const auth = c.get("auth");
  return c.html(<UserRequests userId={auth.userId} />);
});
uiRouter.get("/user/profile", protectedPageAuth(), (c: any) => {
  const auth = c.get("auth");
  return c.html(<UserProfile userId={auth.userId} />);
});

// Admin routes
uiRouter.get("/admin/requests", protectedPageAuth({ admin: true }), (c) =>
  c.html(<AdminRequests />)
);
uiRouter.get(
  "/admin/schedule",
  protectedPageAuth({ admin: true }),
  (c) => {
    const date = c.req.query("date");
    return c.html(
      <AdminSchedule selectedDate={isValidYmd(date) ? date : undefined} />,
    );
  },
);
uiRouter.get("/admin/recurring", protectedPageAuth({ admin: true }), (c) =>
  c.html(<AdminRecurring />)
);
uiRouter.get("/admin/users", protectedPageAuth({ admin: true }), (c) =>
  c.html(<AdminUsers />)
);
uiRouter.get("/admin/settings", protectedPageAuth({ admin: true }), (c) =>
  c.html(<AdminSettings />)
);
uiRouter.get("/admin/admins", protectedPageAuth({ admin: true }), (c) =>
  c.html(<AdminAdmins />)
);

// Default redirect
uiRouter.get("/", (c) => c.redirect("/app/user/week"));
