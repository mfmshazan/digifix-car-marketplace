-- Add the MANAGER role to the UserRole enum (additive — no existing rows affected)
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- Add the nullable manager link on User (salesman -> manager). Nullable, so all
-- existing users keep managerId = NULL. No data is rewritten.
ALTER TABLE "User" ADD COLUMN "managerId" TEXT;

-- Index for looking up a manager's salesmen
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- Self-referencing foreign key; ON DELETE SET NULL so removing a manager
-- detaches salesmen rather than deleting them
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
