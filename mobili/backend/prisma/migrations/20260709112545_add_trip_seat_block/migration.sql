-- CreateTable
CREATE TABLE "TripSeatBlock" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripSeatBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripSeatBlock_tripId_idx" ON "TripSeatBlock"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripSeatBlock_tripId_seatId_key" ON "TripSeatBlock"("tripId", "seatId");

-- AddForeignKey
ALTER TABLE "TripSeatBlock" ADD CONSTRAINT "TripSeatBlock_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSeatBlock" ADD CONSTRAINT "TripSeatBlock_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
