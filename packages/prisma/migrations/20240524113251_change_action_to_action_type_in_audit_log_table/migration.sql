/*
  Warnings:

  - You are about to drop the column `action` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `actionType` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "action",
ADD COLUMN     "actionType" TEXT NOT NULL;
