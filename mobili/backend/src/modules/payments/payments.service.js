const prisma = require('../../config/prisma')

async function initiatePayment({ reservationId, method, userId }) {
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: { payment: true },
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
  if (reservation.status !== 'PENDING') {
    const err = new Error('Cette réservation ne peut plus être payée.')
    err.status = 400
    throw err
  }
  if (reservation.payment?.status === 'CONFIRMED') {
    const err = new Error('Cette réservation est déjà payée.')
    err.status = 400
    throw err
  }
  if (reservation.payment?.status === 'PENDING') {
    return {
      paymentId: reservation.payment.id,
      amount: reservation.payment.amount,
      method: reservation.payment.method,
      status: 'PENDING',
      reservationCode: reservation.reservationCode,
    }
  }

  const payment = await prisma.payment.create({
    data: { reservationId, amount: reservation.totalAmount, method, status: 'PENDING' },
  })

  return {
    paymentId: payment.id,
    amount: payment.amount,
    method: payment.method,
    status: payment.status,
    reservationCode: reservation.reservationCode,
  }
}

async function handleWebhook({ reservationCode, transactionId, status }) {
  const reservation = await prisma.reservation.findUnique({
    where: { reservationCode },
    include: { payment: true },
  })
  if (!reservation?.payment) {
    const err = new Error('Réservation ou paiement introuvable.')
    err.status = 404
    throw err
  }
  if (reservation.payment.status === 'CONFIRMED') {
    return { message: 'Paiement déjà confirmé.' }
  }

  if (status === 'success') {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: reservation.payment.id },
        data: { status: 'CONFIRMED', transactionId, paidAt: new Date() },
      })
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'CONFIRMED' } })
    })
    await generateTicket(reservation.id)
    const { notifyReservationConfirmed } = require('../notifications/notifications.service')
    notifyReservationConfirmed(reservation.id).catch(() => {})
    return { message: 'Paiement confirmé.' }
  }

  if (status === 'failed') {
    await prisma.payment.update({
      where: { id: reservation.payment.id },
      data: { status: 'FAILED', transactionId },
    })
    return { message: 'Paiement échoué.' }
  }

  return { message: 'Statut non reconnu.' }
}

async function getPaymentStatus(paymentId, userId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { reservation: { select: { userId: true, reservationCode: true } } },
  })
  if (!payment) {
    const err = new Error('Paiement introuvable.')
    err.status = 404
    throw err
  }
  if (payment.reservation.userId !== userId) {
    const err = new Error('Accès non autorisé.')
    err.status = 403
    throw err
  }
  return payment
}

async function generateTicket(reservationId) {
  const { generateTicket: create } = require('../tickets/tickets.service')
  return create(reservationId)
}

module.exports = { initiatePayment, handleWebhook, getPaymentStatus }
