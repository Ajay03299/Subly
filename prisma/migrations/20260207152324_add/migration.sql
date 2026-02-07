-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountCode" TEXT;
