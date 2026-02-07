/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `discounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `discounts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "discounts" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "discounts_code_key" ON "discounts"("code");
