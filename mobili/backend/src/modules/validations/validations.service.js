const prisma = require('../../config/prisma')

async function validateTicket({ qrCode, agentId }) {
  const ticket = await prisma.ticket.findUnique({
    where: { qrCode },
    include: {
      reservation: {
        include: {
          trip: { include: { route: { select: { origin: true, destination: true } } } },
          seat: { select: { seatNumber: true } },
          user: { select: { firstName: true, lastName: true, phone: true } },
        },
      },
    },
  })

  if (!ticket) {
    return { status: 'NOT_FOUND', message: 'Billet introuvable.', ticket: null }
  }

  let validationStatus
  let reason = null

  if (ticket.isUsed) {
    validationStatus = 'ALREADY_USED'
    reason = 'Billet déjà utilisé.'
  } else if (ticket.reservation.status === 'CONFIRMED') {
    validationStatus = 'VALID'
  } else {
    validationStatus = 'INVALID'
    reason = 'Réservation non confirmée.'
  }

  await prisma.ticketValidation.create({
    data: { ticketId: ticket.id, agentId, status: validationStatus, reason },
  })

  if (validationStatus === 'VALID') {
    await prisma.ticket.update({ where: { id: ticket.id }, data: { isUsed: true } })
  }

  const { reservation } = ticket
  return {
    status: validationStatus,
    message: reason ?? 'Billet valide.',
    ticket: {
      ticketCode: ticket.ticketCode,
      passenger: `${reservation.user.firstName} ${reservation.user.lastName}`,
      phone: reservation.user.phone,
      route: `${reservation.trip.route.origin} → ${reservation.trip.route.destination}`,
      departureTime: reservation.trip.departureTime,
      seatNumber: reservation.seat.seatNumber,
    },
  }
}

module.exports = { validateTicket }
