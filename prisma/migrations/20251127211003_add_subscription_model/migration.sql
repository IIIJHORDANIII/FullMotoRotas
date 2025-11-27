-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE', 'PENDING', 'TRIALING');

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "pagarmePlanId" TEXT NOT NULL,
    "pagarmeSubscriptionId" TEXT NOT NULL,
    "pagarmeCustomerId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_establishmentId_key" ON "Subscription"("establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_pagarmeSubscriptionId_key" ON "Subscription"("pagarmeSubscriptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "EstablishmentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
