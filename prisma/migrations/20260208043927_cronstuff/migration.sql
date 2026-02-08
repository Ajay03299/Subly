-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "parentSubscriptionId" TEXT,
ADD COLUMN     "paymentTermConfig" JSONB;

-- CreateTable
CREATE TABLE "attributes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "extraPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_parentSubscriptionId_idx" ON "subscriptions"("parentSubscriptionId");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_parentSubscriptionId_fkey" FOREIGN KEY ("parentSubscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
