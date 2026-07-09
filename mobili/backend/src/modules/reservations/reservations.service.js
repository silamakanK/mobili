const { randomInt } = require('node:crypto')
const prisma = require('../../config/prisma')

function generateReservationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'MOB-'
  for (let i = 0; i < 8; i++) code += chars[randomInt(chars.length)]
  return code
}

async function uniqueCode() {
  let code
  do {
    code = generateReservationCode()
  } while (await prisma.reservation.findUnique({ where: { reservationCode: code } }))
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
    const err = new Error('Ce siège est hors service.')
    err.status = 409
    throw err
  }

  const [existing, tripBlock] = await Promise.all([
    prisma.reservation.findFirst({
      where: { tripId, seatId, status: { in: ['PENDING', 'CONFIRMED'] } },
    }),
    prisma.tripSeatBlock.findUnique({ where: { tripId_seatId: { tripId, seatId } } }),
  ])
  if (existing) {
    const err = new Error('Ce siège est déjà réservé.')
    err.status = 409
    throw err
  }
  if (tripBlock) {
    const err = new Error('Ce siège est bloqué pour ce trajet.')
    err.status = 409
    throw err
  }

  const reservationCode = await uniqueCode()

  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.create({
      data: { userId, tripId, seatId, reservationCode, status: 'PENDING', totalAmount: trip.price },
      include: {
        trip: { include: { route: { select: { origin: true, destination: true } } } },
        seat: { select: { seatNumber: true, type: true } },
      },
    })
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

async function createBulkReservations({ userId, tripId, seatIds }) {
  if (new Set(seatIds).size !== seatIds.length) {
    const err = new Error('La liste contient des sièges en double.')
    err.status = 400
    throw err
  }

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
  if (trip.availableSeats < seatIds.length) {
    const err = new Error('Pas assez de places disponibles pour ce trajet.')
    err.status = 400
    throw err
  }

  const seats = await prisma.seat.findMany({ where: { id: { in: seatIds } } })
  if (seats.length !== seatIds.length) {
    const err = new Error('Un ou plusieurs sièges sont introuvables.')
    err.status = 404
    throw err
  }
  for (const seat of seats) {
    if (seat.vehicleId !== trip.vehicleId) {
      const err = new Error(
        `Le siège ${seat.seatNumber} n'appartient pas au véhicule de ce trajet.`
      )
      err.status = 400
      throw err
    }
    if (!seat.isAvailable) {
      const err = new Error(`Le siège ${seat.seatNumber} est hors service.`)
      err.status = 409
      throw err
    }
  }

  const [existing, tripBlocks] = await Promise.all([
    prisma.reservation.findFirst({
      where: { tripId, seatId: { in: seatIds }, status: { in: ['PENDING', 'CONFIRMED'] } },
    }),
    prisma.tripSeatBlock.findMany({ where: { tripId, seatId: { in: seatIds } } }),
  ])
  if (existing) {
    const err = new Error('Un ou plusieurs sièges sont déjà réservés.')
    err.status = 409
    throw err
  }
  if (tripBlocks.length > 0) {
    const err = new Error('Un ou plusieurs sièges sont bloqués pour ce trajet.')
    err.status = 409
    throw err
  }

  const codes = await Promise.all(seatIds.map(() => uniqueCode()))

  return prisma.$transaction(async (tx) => {
    const reservations = await Promise.all(
      seatIds.map((seatId, i) =>
        tx.reservation.create({
          data: {
            userId,
            tripId,
            seatId,
            reservationCode: codes[i],
            status: 'PENDING',
            totalAmount: trip.price,
          },
          include: {
            trip: { include: { route: { select: { origin: true, destination: true } } } },
            seat: { select: { seatNumber: true, type: true } },
          },
        })
      )
    )
    await tx.trip.update({
      where: { id: tripId },
      data: { availableSeats: { decrement: seatIds.length } },
    })
    return reservations
  })
}

module.exports = {
  createReservation,
  createBulkReservations,
  getUserReservations,
  getReservationById,
  cancelReservation,
  listCompanyReservations,
}
