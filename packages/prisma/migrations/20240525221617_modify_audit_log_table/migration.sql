-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "legacyUserFullName" TEXT,
ALTER COLUMN "actorUserId" DROP NOT NULL;
