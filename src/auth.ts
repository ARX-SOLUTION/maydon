/**
 * Auth Middleware — Telegram initData HMAC verification
 */

import { getAdmin } from "./kv.ts";
import type { AdminRole } from "./models.ts";

export interface AuthState {
  userId: number;
  userName?: string;
  isAdmin: boolean;
  role?: AdminRole;
  isOwner: boolean;
}

const DEFAULT_INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;
const MAX_INIT_DATA_FUTURE_SKEW_SECONDS = 60;

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let i = 0; i < left.length; i++) {
    difference |= left[i] ^ right[i];
  }
  return difference === 0;
}

function decodeHex(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;

  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function verifyInitData(initData: string): Promise<{
  valid: boolean;
  userId?: number;
  userName?: string;
  error?: string;
}> {
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    return { valid: false, error: "BOT_TOKEN not set" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    return { valid: false, error: "No hash" };
  }

  // Remove hash from params
  params.delete("hash");

  // Sort and build data check string
  const sorted = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // Secret key per Telegram spec: HMAC-SHA256(bot_token) keyed with "WebAppData"
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
    encoder.encode(botToken),
  );
  const finalKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  // Sign
  const signature = await crypto.subtle.sign(
    "HMAC",
    finalKey,
    encoder.encode(sorted),
  );
  const computedHash = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const expectedHash = decodeHex(hash);
  const actualHash = decodeHex(computedHash);
  if (!expectedHash || !actualHash || !constantTimeEqual(actualHash, expectedHash)) {
    return { valid: false, error: "Invalid hash" };
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isInteger(authDate) || authDate <= 0) {
    return { valid: false, error: "Invalid auth date" };
  }

  const now = Math.floor(Date.now() / 1000);
  const configuredMaxAge = Number(
    Deno.env.get("TELEGRAM_INIT_DATA_MAX_AGE_SECONDS"),
  );
  const maxAge = Number.isFinite(configuredMaxAge) && configuredMaxAge > 0
    ? configuredMaxAge
    : DEFAULT_INIT_DATA_MAX_AGE_SECONDS;
  if (
    authDate > now + MAX_INIT_DATA_FUTURE_SKEW_SECONDS ||
    now - authDate > maxAge
  ) {
    return { valid: false, error: "Expired auth data" };
  }

  // Extract user info
  const userParam = params.get("user");
  if (!userParam) {
    return { valid: false, error: "No user" };
  }

  try {
    const user = JSON.parse(userParam);
    if (!Number.isSafeInteger(user.id) || user.id <= 0) {
      return { valid: false, error: "Invalid user data" };
    }
    return { valid: true, userId: user.id, userName: user.first_name };
  } catch {
    return { valid: false, error: "Invalid user data" };
  }
}

export function authMiddleware() {
  return async (c: any, next: () => Promise<void>) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const initData = authHeader.slice(7);
    const result = await verifyInitData(initData);

    if (!result.valid) {
      return c.json({ error: result.error }, 401);
    }

    // Check admin status
    const admin = await getAdmin(result.userId!);

    c.set("auth", {
      userId: result.userId,
      userName: result.userName,
      isAdmin: !!admin,
      role: admin?.role,
      isOwner: admin?.role === "owner",
    });

    await next();
  };
}

export function requireAdmin() {
  return async (c: any, next: () => Promise<void>) => {
    const auth = c.get("auth") as AuthState | undefined;
    if (!auth?.isAdmin) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}

export function requireOwner() {
  return async (c: any, next: () => Promise<void>) => {
    const auth = c.get("auth") as AuthState | undefined;
    if (!auth?.isOwner) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}
