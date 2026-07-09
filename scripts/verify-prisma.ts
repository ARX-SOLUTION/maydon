import { prisma } from "../lib/prisma.ts";

const [users, admins, bookings, settings] = await Promise.all([
  prisma.user.count(),
  prisma.admin.count(),
  prisma.booking.count(),
  prisma.settings.count(),
]);
console.log(
  `✅ Connected — users:${users} admins:${admins} bookings:${bookings} settings:${settings}`,
);
await prisma.$disconnect();
