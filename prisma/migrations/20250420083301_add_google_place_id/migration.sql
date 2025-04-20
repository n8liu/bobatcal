/*
  Warnings:

  - A unique constraint covering the columns `[googlePlaceId]` on the table `Shop` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "googlePlaceId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Shop_googlePlaceId_key" ON "Shop"("googlePlaceId");
