// Prisma client singleton (Deno-native). Uses the pg driver adapter with a direct
// DATABASE_URL. Server-side/scripts only — never import into browser/UI code.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const connectionString = Deno.env.get("DATABASE_URL");
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });
