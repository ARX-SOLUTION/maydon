/** @jsxImportSource hono/jsx */
// Regression test for the template-literal quote-collapse bug: an inner \' written
// inside a backtick `...` script const collapses to a bare ' at runtime, producing
// invalid JS that aborts the WHOLE inline <script> — silently blanking the admin
// Users page and killing all admin Schedule interactivity in production. A code-only
// review can't see it (the source *looks* escaped); only executing the emitted JS does.
Deno.env.set("KV_PATH", `maydon_kv_script_syntax_test_${Date.now()}`);
Deno.env.set("TELEGRAM_BOT_TOKEN", "test-token-for-script-syntax-spec");

import { Hono } from "hono";
const { initDefaultSettings } = await import("./kv.ts");
const { AdminUsers } = await import("./ui/pages/admin/Users.tsx");
const { AdminSchedule } = await import("./ui/pages/admin/Schedule.tsx");
const { AdminRequests } = await import("./ui/pages/admin/Requests.tsx");
const { AdminRecurring } = await import("./ui/pages/admin/Recurring.tsx");
const { AdminAdmins } = await import("./ui/pages/admin/Admins.tsx");
const { AdminSettings } = await import("./ui/pages/admin/Settings.tsx");
const { UserWeekView } = await import("./ui/pages/user/WeekView.tsx");
const { UserRequests } = await import("./ui/pages/user/MyRequests.tsx");
const { UserProfile } = await import("./ui/pages/user/Profile.tsx");
const { UserBookCard } = await import("./ui/components/BookCard.tsx");
const { addCalendarDays, tashkentDate } = await import("./services/booking.ts");

await initDefaultSettings();

function extractScriptBodies(html: string): string[] {
  const bodies: string[] = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[1].trim()) bodies.push(m[1]);
  }
  return bodies;
}

async function renderToHtml(node: unknown): Promise<string> {
  const app = new Hono();
  app.get("/", (c) => c.html(node as any));
  return await (await app.request("/")).text();
}

Deno.test("admin + user inline client scripts emit syntactically valid JS (no template-literal quote collapse)", async () => {
  const bookableDate = addCalendarDays(tashkentDate(), 1);
  const pages: Array<[string, string]> = [
    ["AdminUsers", await renderToHtml(<AdminUsers />)],
    ["AdminSchedule", await renderToHtml(<AdminSchedule />)],
    ["AdminRequests", await renderToHtml(<AdminRequests />)],
    ["AdminRecurring", await renderToHtml(<AdminRecurring />)],
    ["AdminAdmins", await renderToHtml(<AdminAdmins />)],
    ["AdminSettings", await renderToHtml(<AdminSettings />)],
    ["UserWeekView", await renderToHtml(<UserWeekView />)],
    ["UserRequests", await renderToHtml(<UserRequests userId={900001} />)],
    ["UserProfile", await renderToHtml(<UserProfile userId={900001} />)],
    ["UserBookCard", await renderToHtml(<UserBookCard date={bookableDate} start="12:00" />)],
  ];

  for (const [name, html] of pages) {
    const bodies = extractScriptBodies(html);
    // A page with zero inline scripts (e.g. Profile) is fine — nothing to parse.
    for (const body of bodies) {
      // `new Function` parses without executing — throws SyntaxError on invalid JS.
      // Before the fix this threw "Unexpected identifier 'approve'" / "missing )".
      try {
        new Function(body);
      } catch (e) {
        throw new Error(`${name}: inline <script> is not valid JS — ${e}`);
      }
    }
  }
});
