/*
  Warnings:

  - The primary key for the `ExternalDoctor` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `ExternalDoctor` table. All the data in the column will be lost.
  - The primary key for the `LabAssistant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `LabAssistant` table. All the data in the column will be lost.
  - The primary key for the `LabHead` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `LabHead` table. All the data in the column will be lost.
  - The primary key for the `Patient` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Patient` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_patientId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_verifiedBy_fkey";

-- DropForeignKey
ALTER TABLE "AssistantSchedule" DROP CONSTRAINT "AssistantSchedule_assistantId_fkey";

-- DropForeignKey
ALTER TABLE "MedicalRecord" DROP CONSTRAINT "MedicalRecord_patientId_fkey";

-- DropIndex
DROP INDEX "ExternalDoctor_userId_key";

-- DropIndex
DROP INDEX "LabAssistant_userId_key";

-- DropIndex
DROP INDEX "LabHead_userId_key";

-- DropIndex
DROP INDEX "Patient_userId_key";

-- AlterTable
ALTER TABLE "ExternalDoctor" DROP CONSTRAINT "ExternalDoctor_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "ExternalDoctor_pkey" PRIMARY KEY ("userId");

-- AlterTable
ALTER TABLE "LabAssistant" DROP CONSTRAINT "LabAssistant_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "LabAssistant_pkey" PRIMARY KEY ("userId");

-- AlterTable
ALTER TABLE "LabHead" DROP CONSTRAINT "LabHead_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "LabHead_pkey" PRIMARY KEY ("userId");

-- AlterTable
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "Patient_pkey" PRIMARY KEY ("userId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "LabHead"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistantSchedule" ADD CONSTRAINT "AssistantSchedule_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "LabAssistant"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalRecord" ADD CONSTRAINT "MedicalRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
