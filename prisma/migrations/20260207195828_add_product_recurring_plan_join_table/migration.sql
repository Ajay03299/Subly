/*
  Warnings:

  - You are about to drop the column `recurringPlanId` on the `products` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_recurringPlanId_fkey";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "recurringPlanId";

-- CreateTable
CREATE TABLE "product_recurring_plans" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "recurringPlanId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_recurring_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_recurring_plans_productId_idx" ON "product_recurring_plans"("productId");

-- CreateIndex
CREATE INDEX "product_recurring_plans_recurringPlanId_idx" ON "product_recurring_plans"("recurringPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "product_recurring_plans_productId_recurringPlanId_key" ON "product_recurring_plans"("productId", "recurringPlanId");

-- AddForeignKey
ALTER TABLE "product_recurring_plans" ADD CONSTRAINT "product_recurring_plans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_recurring_plans" ADD CONSTRAINT "product_recurring_plans_recurringPlanId_fkey" FOREIGN KEY ("recurringPlanId") REFERENCES "recurring_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
