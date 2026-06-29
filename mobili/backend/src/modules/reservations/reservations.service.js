const prisma = require('../../config/prisma')

function generateReservationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'MOB-'
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

async function createReservation({ userId, tripId, seatId }) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } })
  if (!trip) {
    const err = new Error('Trajet introuvable.')
    err.status = 404
    throw err
  }
  if (trip.status !== 'SCHEDULED') {
    const err = new Error("Ce trajet n'est plus disponible.")
    err.status = 400
    throw err
  }
  if (trip.availableSeats <= 0) {
    const err = new Error('Plus de places disponibles pour ce trajet.')
    err.status = 400
    throw err
  }

  const seat = await prisma.seat.findUnique({ where: { id: seatId } })
  if (!seat) {
    const err = new Error('Siège introuvable.')
    err.status = 404
    throw err
  }
  if (seat.vehicleId !== trip.vehicleId) {
    const err = new Error("Ce siège n'appartient pas au véhicule de ce trajet.")
    err.status = 400
    throw err
  }
  if (!seat.isAvailable) {
    const err = new Error('Ce siège est déjà réservé.')
    err.status = 409
    throw err
  }

  const existing = await prisma.reservation.findFirst({
    where: { tripId, seatId, status: { in: ['PENDING', 'CONFIRMED'] } },
  })
  if (existing) {
    const err = new Error('Ce siège est déjà réservé.')
    err.status = 409
    throw err
  }

  let reservationCode
  do {
    reservationCode = generateReservationCode()
  } while (await prisma.reservation.findUnique({ where: { reservationCode } }))

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.create({
      data: { userId, tripId, seatId, reservationCode, status: 'PENDING', totalAmount: trip.price },
      include: {
        trip: { include: { route: { select: { origin: true, destination: true } } } },
        seat: { select: { seatNumber: true, type: true } },
      },
    })
    await tx.seat.update({ where: { id: seatId }, data: { isAvailable: false } })
    await tx.trip.update({ where: { id: tripId }, data: { availableSeats: { decrement: 1 } } })
    return reservation
  })
}

async function getUserReservations(userId) {
  return prisma.reservation.findMany({
    where: { userId },
    include: {
      trip: { include: { route: { select: { origin: true, destination: true } } } },
      seat: { select: { seatNumber: true, type: true } },
      payment: { select: { status: true, method: true } },
      ticket: { select: { id: true, ticketCode: true, isUsed: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

async function getReservationById(id, userId) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      trip: {
        include: {
          route: { include: { company: { select: { name: true, contactPhone: true } } } },
          vehicle: { select: { type: true } },
        },
      },
      seat: { select: { seatNumber: true, type: true } },
      payment: true,
      ticket: { select: { id: true, ticketCode: true, isUsed: true, issuedAt: true } },
    },
  })
  if (!reservation) {
    const err = new Error('Réservation introuvable.')
    err.status = 404
    throw err
  }
  if (reservation.userId !== userId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }
  return reservation
}

async function cancelReservation(id, userId) {
  const reservation = await prisma.reservation.findUnique({ where: { id } })
  if (!reservation) {
    const err = new Error('Réservation introuvable.')
    err.status = 404
    throw err
  }
  if (reservation.userId !== userId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }
  if (reservation.status === 'CANCELLED') {
    const err = new Error('Cette réservation est déjà annulée.')
    err.status = 400
    throw err
  }
  if (reservation.status === 'CONFIRMED') {
    const err = new Error('Une réservation confirmée ne peut pas être annulée directement.')
    err.status = 400
    throw err
  }

  await prisma.$transaction(async (tx) => {
    await tx.reservation.update({ where: { id }, data: { status: 'CANCELLED' } })
    await tx.seat.update({ where: { id: reservation.seatId }, data: { isAvailable: true } })
    await tx.trip.update({
      where: { id: reservation.tripId },
      data: { availableSeats: { increment: 1 } },
    })
  })

  return { message: 'Réservation annulée avec succès.' }
}

async function listCompanyReservations(companyId, { page = 1, limit = 20, status } = {}) {
  const skip = (page - 1) * limit
  const where = {
    trip: { route: { companyId } },
    ...(status ? { status } : {}),
  }
  const [reservations, total] = await Promise.all([
    prisma.reservation.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, phone: true, email: true } },
        trip: {
          select: {
            id: true,
            departureDate: true,
            departureTime: true,
            route: { select: { origin: true, destination: true } },
          },
        },
        seat: { select: { seatNumber: true, type: true } },
        payment: { select: { method: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.reservation.count({ where }),
  ])
  return { reservations, total, page, limit }
}

module.exports = {
  createReservation,
  getUserReservations,
  getReservationById,
  cancelReservation,
  listCompanyReservations,
}
