import { prisma } from "../lib/prisma.ts";

const venues = await prisma.venue.count();
const bookings = await prisma.booking.count();
console.log(`✅ Connected — ${venues} venue(s), ${bookings} booking(s).`);
await prisma.$disconnect();
