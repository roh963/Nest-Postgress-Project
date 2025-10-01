/*
  Warnings:

  - You are about to drop the column `message` on the `AuditLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."AuditLog" DROP COLUMN "message",
ADD COLUMN     "details" TEXT;
