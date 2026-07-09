-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "recurringTripId" TEXT;

-- CreateTable
CREATE TABLE "RecurringTrip" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "departureTime" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTrip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringTrip_routeId_idx" ON "RecurringTrip"("routeId");

-- CreateIndex
CREATE INDEX "RecurringTrip_vehicleId_idx" ON "RecurringTrip"("vehicleId");

-- CreateIndex
CREATE INDEX "Trip_recurringTripId_idx" ON "Trip"("recurringTripId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_recurringTripId_fkey" FOREIGN KEY ("recurringTripId") REFERENCES "RecurringTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTrip" ADD CONSTRAINT "RecurringTrip_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTrip" ADD CONSTRAINT "RecurringTrip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
