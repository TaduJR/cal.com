/*
  Warnings:

  - Changed the type of `actionType` on the `AuditLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('EventTypeCreate', 'EventTypeUpdate', 'EventTypeDelete', 'BookingCreate', 'BookingUpdate', 'BookingDelete');

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "actionType",
ADD COLUMN     "actionType" "ActionType" NOT NULL;
