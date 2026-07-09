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
import { Layout } from "./layout.tsx";
import { authMiddleware } from "../auth.ts";

export const uiRouter = new Hono();

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
uiRouter.get("/user/week", (c) => {
  const date = c.req.query("date");
  return c.html(<UserWeekView selectedDate={date} />);
});
uiRouter.get("/user/book-card", (c) => {
  return c.html(
    <UserBookCard date={c.req.query("date")} start={c.req.query("start")} />,
  );
});
uiRouter.get("/user/requests", authMiddleware(), (c: any) => {
  const auth = c.get("auth");
  return c.html(<UserRequests userId={auth.userId} />);
});
uiRouter.get("/user/profile", authMiddleware(), (c: any) => {
  const auth = c.get("auth");
  return c.html(<UserProfile userId={auth.userId} />);
});

// Admin routes
uiRouter.get("/admin/requests", (c) => c.html(<AdminRequests />));
uiRouter.get(
  "/admin/schedule",
  (c) => c.html(<AdminSchedule selectedDate={c.req.query("date")} />),
);
uiRouter.get("/admin/recurring", (c) => c.html(<AdminRecurring />));
uiRouter.get("/admin/settings", (c) => c.html(<AdminSettings />));
uiRouter.get("/admin/admins", (c) => c.html(<AdminAdmins />));

// Default redirect
uiRouter.get("/", (c) => c.redirect("/app/user/week"));
