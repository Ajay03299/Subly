/*
  Warnings:

  - You are about to drop the column `recurringPlanId` on the `products` table. All the data in the column will be lost.
  - Added the required column `productId` to the `recurring_plans` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_recurringPlanId_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "recurringPlanId";

-- AlterTable
ALTER TABLE "recurring_plans" ADD COLUMN     "productId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "recurring_plans_productId_idx" ON "recurring_plans"("productId");

-- AddForeignKey
ALTER TABLE "recurring_plans" ADD CONSTRAINT "recurring_plans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
