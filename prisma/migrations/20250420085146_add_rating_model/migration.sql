/*
  Warnings:

  - You are about to drop the column `review` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the column `stars` on the `Rating` table. All the data in the column will be lost.
  - Added the required column `ratingValue` to the `Rating` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Rating" DROP COLUMN "review",
DROP COLUMN "stars",
ADD COLUMN     "ratingValue" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "reviewText" TEXT;

-- CreateIndex
CREATE INDEX "Rating_drinkId_idx" ON "Rating"("drinkId");

-- CreateIndex
CREATE INDEX "Rating_userId_idx" ON "Rating"("userId");
