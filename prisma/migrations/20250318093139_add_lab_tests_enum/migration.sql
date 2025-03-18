/*
  Warnings:

  - You are about to drop the column `testName` on the `LabTest` table. All the data in the column will be lost.
  - Added the required column `testType` to the `LabTest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('BLOOD_TEST', 'X_RAY', 'MRI', 'CT_SCAN', 'URINE_TEST', 'ECG');

-- AlterTable
ALTER TABLE "LabTest" DROP COLUMN "testName",
ADD COLUMN     "testType" "TestType" NOT NULL;
