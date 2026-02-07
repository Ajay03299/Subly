-- AlterTable
ALTER TABLE "subscription_lines" ADD COLUMN     "rating" INTEGER;

-- CreateIndex
CREATE INDEX "subscription_lines_productId_idx" ON "subscription_lines"("productId");
