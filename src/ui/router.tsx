/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { raw } from 'hono/html';
import { UserWeekView } from './pages/user/WeekView.tsx';
import { UserDayView } from './pages/user/DayView.tsx';
import { UserRequests } from './pages/user/MyRequests.tsx';
import { AdminRequests } from './pages/admin/Requests.tsx';
import { AdminSchedule } from './pages/admin/Schedule.tsx';
import { AdminRecurring } from './pages/admin/Recurring.tsx';
import { AdminSettings } from './pages/admin/Settings.tsx';
import { Layout } from './layout.tsx';

export const uiRouter = new Hono();

// Middleware: wrap full-page loads in Layout shell; HTMX partials pass through
uiRouter.use('*', async (c, next) => {
  await next();
  const isHtmx = c.req.header('hx-request') === 'true';
  if (!isHtmx && c.res.status === 200) {
    const content = await c.res.text();
    c.res = await c.html(
      <Layout>
        <div id="app-content" class="w-full h-full relative">
          {raw(content)}
        </div>
      </Layout>
    );
  }
});

// User routes
uiRouter.get('/user/week', (c) => {
  const date = c.req.query('date');
  return c.html(<UserWeekView selectedDate={date} />);
});
uiRouter.get('/user/day', (c) => {
  return c.html(<UserDayView date={c.req.query('date')} start={c.req.query('start')} />);
});
uiRouter.get('/user/requests', (c) => c.html(<UserRequests />));

// Admin routes
uiRouter.get('/admin/requests', (c) => c.html(<AdminRequests />));
uiRouter.get('/admin/schedule', (c) => c.html(<AdminSchedule />));
uiRouter.get('/admin/recurring', (c) => c.html(<AdminRecurring />));
uiRouter.get('/admin/settings', (c) => c.html(<AdminSettings />));

// Default redirect
uiRouter.get('/', (c) => c.redirect('/app/user/week'));
