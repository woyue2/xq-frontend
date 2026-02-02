/*
  Warnings:

  - Added the required column `updatedAt` to the `UserWhitelist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserWhitelist" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "UserWhitelist_isRegistered_idx" ON "UserWhitelist"("isRegistered");
