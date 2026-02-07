/*
  Warnings:

  - You are about to drop the column `endDate` on the `recurring_plans` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `recurring_plans` table. All the data in the column will be lost.
  - Added the required column `startDate` to the `recurring_plan_infos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "recurring_plan_infos" ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "recurring_plans" DROP COLUMN "endDate",
DROP COLUMN "startDate";
