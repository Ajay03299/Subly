/*
  Warnings:

  - You are about to drop the `product_recurring_plans` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "product_recurring_plans" DROP CONSTRAINT "product_recurring_plans_productId_fkey";

-- DropForeignKey
ALTER TABLE "product_recurring_plans" DROP CONSTRAINT "product_recurring_plans_recurringPlanId_fkey";

-- DropTable
DROP TABLE "product_recurring_plans";

-- CreateTable
CREATE TABLE "recurring_plan_infos" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "recurringPlanId" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_plan_infos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_plan_infos_productId_idx" ON "recurring_plan_infos"("productId");

-- CreateIndex
CREATE INDEX "recurring_plan_infos_recurringPlanId_idx" ON "recurring_plan_infos"("recurringPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_plan_infos_productId_recurringPlanId_key" ON "recurring_plan_infos"("productId", "recurringPlanId");

-- AddForeignKey
ALTER TABLE "recurring_plan_infos" ADD CONSTRAINT "recurring_plan_infos_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_plan_infos" ADD CONSTRAINT "recurring_plan_infos_recurringPlanId_fkey" FOREIGN KEY ("recurringPlanId") REFERENCES "recurring_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
