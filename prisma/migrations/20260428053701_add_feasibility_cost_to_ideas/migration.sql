-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "estimatedDays" INTEGER,
ADD COLUMN     "estimatedMonthlyCost" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "feasibilityReasoning" TEXT,
ADD COLUMN     "feasible" BOOLEAN NOT NULL DEFAULT true;
