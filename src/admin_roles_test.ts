import { assertEquals } from "@std/assert";
import { roleFor } from "./models.ts";

// The single rule: owner is whoever matches ADMIN_TELEGRAM_ID; everyone else is a helper admin.
Deno.test("roleFor — the configured owner id maps to owner", () => {
  assertEquals(roleFor(5, 5), "owner");
});

Deno.test("roleFor — any other admin maps to helper 'admin'", () => {
  assertEquals(roleFor(6, 5), "admin");
});

Deno.test("roleFor — no configured owner id → helper 'admin'", () => {
  assertEquals(roleFor(6, null), "admin");
});
