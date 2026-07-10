import { assertEquals, assertStringIncludes } from "@std/assert";

Deno.env.set("KV_PATH", `maydon_approval_test_${Date.now()}`);
Deno.env.set("TELEGRAM_BOT_TOKEN", "test-token-for-approval-spec");

const {
  addAdmin,
  decideUserApproval,
  getAllUsers,
  getUser,
  initDefaultSettings,
  keys,
  kv,
  upsertUser,
} = await import("./kv.ts");
const { createBooking } = await import("./services/booking.ts");
const { notifyNewUserApproval } = await import("./services/notify.ts");
const { default: adminApi } = await import("./api/admin.ts");
const { bot } = await import("./bot/client.ts");
bot.api.sendMessage = () => Promise.resolve({} as any);

async function clearKv() {
  for await (const entry of kv.list({ prefix: [] })) await kv.delete(entry.key);
}

async function authHeader(userId: number, firstName: string): Promise<string> {
  const params = new URLSearchParams({
    user: JSON.stringify({ id: userId, first_name: firstName }),
    auth_date: String(Math.floor(Date.now() / 1000)),
  });
  const encoder = new TextEncoder();
  const webAppDataKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const secretKey = await crypto.subtle.sign(
    "HMAC",
    webAppDataKey,
    encoder.encode(Deno.env.get("TELEGRAM_BOT_TOKEN")!),
  );
  const finalKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const hash = await crypto.subtle.sign("HMAC", finalKey, encoder.encode(sorted));
  params.set("hash", Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join(""));
  return "Bearer " + params.toString();
}

Deno.test("user approval is atomic, auditable, and gates booking", async () => {
  await clearKv();
  await initDefaultSettings();
  await addAdmin({
    telegramId: 9001,
    name: "Owner",
    role: "owner",
    addedAt: new Date().toISOString(),
  });
  await upsertUser({
    telegramId: 7001,
    name: "New User",
    phone: "+998900000000",
    isBlocked: false,
    isActive: true,
    approvalStatus: "pending",
    createdAt: new Date().toISOString(),
  });

  const blocked = await createBooking(7001, "New User", "+998900000000", "2099-01-01", "08:00", "09:00", "user");
  assertEquals(blocked.success, false);
  assertStringIncludes(blocked.error ?? "", "Admin tasdiqlashini kuting");

  const approved = await decideUserApproval(7001, "approved", { id: 9001, name: "Owner" });
  assertEquals(approved.success, true);
  assertEquals(approved.user?.approvalDecidedBy, 9001);
  assertEquals(approved.user?.approvalDecidedByName, "Owner");
  assertEquals((await decideUserApproval(7001, "rejected", { id: 9002, name: "Other" })).success, false);

  const user = await getUser(7001);
  assertEquals(user?.approvalStatus, "approved");
  assertEquals(user?.approvalDecidedByName, "Owner");
  assertEquals((await getAllUsers()).length, 1);
});

Deno.test("admin and booking invite namespaces cannot collide", async () => {
  await clearKv();
  const token = "same-token";
  assertEquals(keys.adminInviteToken(token), ["admin_invite_tokens", token]);
  assertEquals(keys.bookingInviteToken(token), ["booking_invite_tokens", token]);

  const sent: Array<{ chatId: number; text: string; options?: unknown }> = [];
  await notifyNewUserApproval({
    sendMessage: async (chatId, text, options) => {
      sent.push({ chatId, text, options });
    },
    editMessageText: async () => {},
  }, 9001, {
    telegramId: 7001,
    name: "New User",
    phone: "+998900000000",
    isBlocked: false,
    isActive: true,
    approvalStatus: "pending",
    createdAt: new Date().toISOString(),
  });
  assertEquals(sent.length, 1);
  assertStringIncludes(sent[0].text, "Yangi foydalanuvchi");
  assertStringIncludes(JSON.stringify(sent[0].options), "approve_user:7001");
  assertStringIncludes(JSON.stringify(sent[0].options), "reject_user:7001");
});

Deno.test("admin approval endpoint records the acting admin and rejects duplicate decisions", async () => {
  await clearKv();
  await addAdmin({
    telegramId: 9001,
    name: "Owner",
    role: "owner",
    addedAt: new Date().toISOString(),
  });
  await upsertUser({
    telegramId: 7002,
    name: "Endpoint User",
    isBlocked: false,
    isActive: true,
    approvalStatus: "pending",
    createdAt: new Date().toISOString(),
  });

  const headers = { Authorization: await authHeader(9001, "Owner") };
  const approve = await adminApi.request("/admin/users/7002/approve", {
    method: "POST",
    headers,
  });
  assertEquals(approve.status, 200);
  assertEquals((await approve.json()).user.approvalDecidedBy, 9001);

  const duplicate = await adminApi.request("/admin/users/7002/reject", {
    method: "POST",
    headers,
  });
  assertEquals(duplicate.status, 409);
});
