/*
  Warnings:

  - You are about to drop the column `minimumQuantity` on the `recurring_plans` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `recurring_plans` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `recurring_plans` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "recurring_plans" DROP CONSTRAINT "recurring_plans_productId_fkey";

-- DropIndex
DROP INDEX "recurring_plans_productId_idx";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "recurringPlanId" TEXT;

-- AlterTable
ALTER TABLE "recurring_plans" DROP COLUMN "minimumQuantity",
DROP COLUMN "name",
DROP COLUMN "productId";

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_recurringPlanId_fkey" FOREIGN KEY ("recurringPlanId") REFERENCES "recurring_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
