-- AlterTable
ALTER TABLE "AuthEvent" ADD COLUMN     "organizationId" TEXT;

-- CreateIndex
CREATE INDEX "AuthEvent_organizationId_idx" ON "AuthEvent"("organizationId");
