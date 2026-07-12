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

Deno.test("admin inline client scripts emit syntactically valid JS (no template-literal quote collapse)", async () => {
  const pages: Array<[string, string]> = [
    ["AdminUsers", await renderToHtml(<AdminUsers />)],
    ["AdminSchedule", await renderToHtml(<AdminSchedule />)],
  ];

  for (const [name, html] of pages) {
    const bodies = extractScriptBodies(html);
    if (bodies.length === 0) throw new Error(`${name}: expected at least one inline <script>`);
    for (const body of bodies) {
      // `new Function` parses without executing — throws SyntaxError on invalid JS.
      // Before the fix this threw "Unexpected identifier 'approve'" / "missing )".
      new Function(body);
    }
  }
});
