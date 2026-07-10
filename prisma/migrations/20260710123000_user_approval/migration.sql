-- Persist the admin approval lifecycle for users in the Postgres adapter.
CREATE TYPE "UserApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE "User"
  ADD COLUMN "approvalStatus" "UserApprovalStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "approvalDecidedBy" BIGINT,
  ADD COLUMN "approvalDecidedByName" TEXT,
  ADD COLUMN "approvalDecidedAt" TIMESTAMP(3);
