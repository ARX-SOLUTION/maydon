// Seed the Settings singleton the app needs (default working hours / rules).
import { prisma } from "../lib/prisma.ts";

await prisma.settings.upsert({
  where: { id: 1 },
  update: {},
  create: {
    id: 1,
    openTime: "08:00",
    closeTime: "23:00",
    horizonDays: 7,
    minDurMin: 60,
    maxDurMin: 180,
    snapMin: 30,
  },
});
console.log("Seeded Settings singleton (08:00–23:00, 7-day horizon).");
await prisma.$disconnect();
