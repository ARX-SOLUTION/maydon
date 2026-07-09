-- Preserve the full Booking domain object in the Postgres adapter.
ALTER TABLE "Booking"
  ADD COLUMN "decidedBy" BIGINT,
  ADD COLUMN "decidedByName" TEXT,
  ADD COLUMN "inviteToken" TEXT,
  ADD COLUMN "participantIds" BIGINT[] NOT NULL DEFAULT ARRAY[]::BIGINT[];

CREATE UNIQUE INDEX "Booking_inviteToken_key" ON "Booking"("inviteToken");
CREATE UNIQUE INDEX "Booking_recurringId_date_key" ON "Booking"("recurringId", "date");

-- The application performs the same check in KV. This constraint is the final
-- guard when PgRepo is active and two confirmed writes race.
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_confirmed_no_overlap"
  EXCLUDE USING gist (
    "date" WITH =,
    (tsrange(
      ("date" || ' ' || "start")::timestamp,
      ("date" || ' ' || "end")::timestamp,
      '[)'
    )) WITH &&
  ) WHERE ("status" = 'confirmed'::"BookingStatus");
