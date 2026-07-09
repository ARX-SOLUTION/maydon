// Starter seed — replace with your own once the real schema lands.
import { prisma } from "../lib/prisma.ts";

const venue = await prisma.venue.create({
  data: {
    name: "Markaziy maydon",
    bookings: { create: [{ slot: "18:00-19:00" }, { slot: "19:00-20:00" }] },
  },
});
console.log(`Seeded venue #${venue.id} with 2 bookings.`);
await prisma.$disconnect();
