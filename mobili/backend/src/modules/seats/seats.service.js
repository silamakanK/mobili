const prisma = require('../../config/prisma')

async function listSeats(vehicleId) {
  return prisma.seat.findMany({
    where: { vehicleId },
    orderBy: { seatNumber: 'asc' },
  })
}

async function getSeatById(id) {
  const seat = await prisma.seat.findUnique({ where: { id } })
  if (!seat) {
    const err = new Error('Siège introuvable.')
    err.status = 404
    throw err
  }
  return seat
}

async function updateSeat(id, user, data) {
  const seat = await getSeatById(id)
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: seat.vehicleId },
    select: { companyId: true },
  })
  if (user.role !== 'SUPER_ADMIN' && vehicle?.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé à cette ressource.')
    err.status = 403
    throw err
  }
  return prisma.seat.update({ where: { id }, data })
}

async function deleteSeat(id, user) {
  const seat = await getSeatById(id)
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: seat.vehicleId },
    select: { companyId: true },
  })
  if (user.role !== 'SUPER_ADMIN' && vehicle?.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé à cette ressource.')
    err.status = 403
    throw err
  }
  return prisma.seat.delete({ where: { id } })
}

async function getSeatsForTrip(tripId, user) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      route: { select: { companyId: true } },
      vehicle: { select: { seats: { orderBy: { seatNumber: 'asc' } } } },
    },
  })
  if (!trip) {
    const err = new Error('Trajet introuvable.')
    err.status = 404
    throw err
  }
  if (user.role !== 'SUPER_ADMIN' && trip.route.companyId !== user.companyId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }

  const [reservedIds, blockedIds] = await Promise.all([
    prisma.reservation
      .findMany({
        where: { tripId, status: { in: ['PENDING', 'CONFIRMED'] } },
        select: { seatId: true },
      })
      .then((rs) => new Set(rs.map((r) => r.seatId))),
    prisma.tripSeatBlock
      .findMany({ where: { tripId }, select: { seatId: true } })
      .then((bs) => new Set(bs.map((b) => b.seatId))),
  ])

  return trip.vehicle.seats.map((seat) => ({
    ...seat,
    isReserved: reservedIds.has(seat.id),
    isTripBlocked: blockedIds.has(seat.id),
  }))
}

async function blockSeatForTrip(tripId, seatId, user) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { route: { select: { companyId: true } }, vehicle: { select: { id: true } } },
  })
  if (!trip) {
    const e = new Error('Trajet introuvable.')
    e.status = 404
    throw e
  }
  if (user.role !== 'SUPER_ADMIN' && trip.route.companyId !== user.companyId) {
    const e = new Error('Accès non autorisé.')
    e.status = 403
    throw e
  }

  const seat = await prisma.seat.findUnique({ where: { id: seatId } })
  if (seat?.vehicleId !== trip.vehicle.id) {
    const e = new Error("Ce siège n'appartient pas à ce trajet.")
    e.status = 400
    throw e
  }

  const reserved = await prisma.reservation.findFirst({
    where: { tripId, seatId, status: { in: ['PENDING', 'CONFIRMED'] } },
  })
  if (reserved) {
    const e = new Error('Ce siège est déjà réservé par un voyageur.')
    e.status = 409
    throw e
  }

  return prisma.$transaction(async (tx) => {
    await tx.tripSeatBlock.create({ data: { tripId, seatId } })
    await tx.trip.update({ where: { id: tripId }, data: { availableSeats: { decrement: 1 } } })
  })
}

async function unblockSeatForTrip(tripId, seatId, user) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { route: { select: { companyId: true } } },
  })
  if (!trip) {
    const e = new Error('Trajet introuvable.')
    e.status = 404
    throw e
  }
  if (user.role !== 'SUPER_ADMIN' && trip.route.companyId !== user.companyId) {
    const e = new Error('Accès non autorisé.')
    e.status = 403
    throw e
  }

  const block = await prisma.tripSeatBlock.findUnique({
    where: { tripId_seatId: { tripId, seatId } },
  })
  if (!block) {
    const e = new Error("Ce siège n'est pas bloqué.")
    e.status = 404
    throw e
  }

  return prisma.$transaction(async (tx) => {
    await tx.tripSeatBlock.delete({ where: { tripId_seatId: { tripId, seatId } } })
    await tx.trip.update({ where: { id: tripId }, data: { availableSeats: { increment: 1 } } })
  })
}

module.exports = {
  listSeats,
  getSeatById,
  updateSeat,
  deleteSeat,
  getSeatsForTrip,
  blockSeatForTrip,
  unblockSeatForTrip,
}
