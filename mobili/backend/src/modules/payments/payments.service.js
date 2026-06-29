const prisma = require('../../config/prisma')
const { isConfigured: stripeConfigured, getStripe } = require('../../config/stripe')
const {
  isConfigured: cinetpayConfigured,
  createPayment,
  checkPayment,
  CHECKOUT_BASE,
} = require('../../config/cinetpay')
const logger = require('../../config/logger')

async function initiatePayment({ reservationIds, userId }) {
  if (!reservationIds?.length) {
    const err = new Error('Au moins une réservation est requise.')
    err.status = 400
    throw err
  }

  const reservations = await prisma.reservation.findMany({
    where: { id: { in: reservationIds } },
    include: {
      payment: true,
      trip: { include: { route: true } },
    },
  })

  if (reservations.length !== reservationIds.length) {
    const err = new Error('Une ou plusieurs réservations sont introuvables.')
    err.status = 404
    throw err
  }

  // Preserve caller order
  const sorted = reservationIds.map((id) => reservations.find((r) => r.id === id))

  for (const r of sorted) {
    if (r.userId !== userId) {
      const err = new Error('Accès non autorisé.')
      err.status = 403
      throw err
    }
    if (r.payment?.status === 'CONFIRMED') {
      const err = new Error(`La réservation ${r.reservationCode} est déjà payée.`)
      err.status = 400
      throw err
    }
    if (r.status !== 'PENDING') {
      const err = new Error(`La réservation ${r.reservationCode} ne peut plus être payée.`)
      err.status = 400
      throw err
    }
  }

  const primary = sorted[0]
  const totalAmount = sorted.reduce((sum, r) => sum + r.totalAmount, 0)

  // Idempotency: primary payment already exists in PENDING
  if (primary.payment?.status === 'PENDING') {
    let redirectUrl = null
    if (stripeConfigured()) {
      if (primary.payment.transactionId?.startsWith('cs_')) {
        try {
          const stripe = getStripe()
          const session = await stripe.checkout.sessions.retrieve(primary.payment.transactionId)
          redirectUrl =
            session.status === 'open'
              ? session.url
              : await _createStripeSessionMulti(sorted, primary.payment, userId)
        } catch {
          redirectUrl = await _createStripeSessionMulti(sorted, primary.payment, userId)
        }
      } else {
        // Paiement PENDING sans session Stripe (erreur précédente) — en créer une
        redirectUrl = await _createStripeSessionMulti(sorted, primary.payment, userId)
      }
    }
    return {
      paymentId: primary.payment.id,
      amount: primary.payment.amount,
      status: 'PENDING',
      reservationCodes: sorted.map((r) => r.reservationCode),
      redirectUrl,
    }
  }

  // Create primary payment (amount = total for all seats in this session)
  const primaryPayment = await prisma.payment.create({
    data: { reservationId: primary.id, amount: totalAmount, method: 'CARD', status: 'PENDING' },
  })

  // Create secondary payments (individual amounts, confirmed later by webhook)
  for (const r of sorted.slice(1)) {
    if (!r.payment) {
      await prisma.payment.create({
        data: { reservationId: r.id, amount: r.totalAmount, method: 'CARD', status: 'PENDING' },
      })
    }
  }

  let redirectUrl = null
  if (stripeConfigured()) {
    redirectUrl = await _createStripeSessionMulti(sorted, primaryPayment, userId)
  } else if (cinetpayConfigured()) {
    redirectUrl = await _createCinetpayInvoice(primary, primaryPayment, userId)
  }

  return {
    paymentId: primaryPayment.id,
    amount: totalAmount,
    status: primaryPayment.status,
    reservationCodes: sorted.map((r) => r.reservationCode),
    redirectUrl,
  }
}

async function _createStripeSessionMulti(reservations, primaryPayment, userId) {
  const stripe = getStripe()
  const user = await prisma.user.findUnique({ where: { id: userId } })
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  const primary = reservations[0]
  const origin = primary.trip?.route?.origin || ''
  const destination = primary.trip?.route?.destination || ''
  const totalAmount = reservations.reduce((sum, r) => sum + r.totalAmount, 0)
  const seatLabel = reservations.length === 1 ? 'Billet' : `${reservations.length} billets`
  const reservationCodes = reservations.map((r) => r.reservationCode).join(',')

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          // XOF = franc CFA (devise zéro-décimale — unit_amount = montant direct en FCFA)
          currency: 'xof',
          product_data: {
            name: `Mobili — ${seatLabel} ${origin} → ${destination}`,
            description: reservations.map((r) => r.reservationCode).join(', '),
          },
          unit_amount: totalAmount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    customer_email: user?.email || undefined,
    success_url: `${frontendUrl}/payment/return`,
    cancel_url: `${frontendUrl}/payment`,
    metadata: { reservationCodes, paymentId: primaryPayment.id },
  })

  await prisma.payment.update({
    where: { id: primaryPayment.id },
    data: { transactionId: session.id },
  })

  return session.url
}

async function _createCinetpayInvoice(reservation, payment, userId) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`

    const cinetpayTxId = payment.id.replace(/-/g, '')
    const data = await createPayment({
      transaction_id: cinetpayTxId,
      amount: reservation.totalAmount,
      description: `Mobili — Réservation ${reservation.reservationCode}`,
      return_url: `${frontendUrl}/payment/return`,
      notify_url: `${backendUrl}/api/payments/webhook`,
      customer_name: user?.firstName || 'Voyageur',
      customer_surname: user?.lastName || '',
      customer_email: user?.email || '',
      customer_phone_number: user?.phone || '',
      metadata: reservation.reservationCode,
    })

    if (data?.code === '201' && data?.data?.payment_token) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { transactionId: data.data.payment_token },
      })
      return data.data.payment_url || `${CHECKOUT_BASE}/${data.data.payment_token}`
    }
    logger.warn('CinetPay createPayment — réponse inattendue', { data })
    return null
  } catch (err) {
    logger.error('CinetPay createPayment — erreur', { error: err.message })
    return null
  }
}

async function handleWebhook(body) {
  // Format IPN CinetPay : { cpm_trans_id, cpm_custom, ... }
  if (body?.cpm_trans_id) {
    const reservationCode = body.cpm_custom
    const cinetpayTxId = body.cpm_trans_id
    let success = false
    if (cinetpayConfigured()) {
      try {
        const check = await checkPayment(cinetpayTxId)
        success = check?.data?.status === 'ACCEPTED'
      } catch (err) {
        logger.error('CinetPay checkPayment — erreur', { error: err.message })
      }
    }
    return _processResult({ reservationCode, transactionId: cinetpayTxId, success })
  }

  // Format legacy / simulation : { reservationCode, transactionId, status }
  return _processResult({
    reservationCode: body.reservationCode,
    transactionId: body.transactionId,
    success: body.status === 'success',
  })
}

async function handleStripeWebhook(rawBody, signature) {
  const stripe = getStripe()
  let event

  if (process.env.STRIPE_WEBHOOK_SECRET) {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
  } else {
    event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString())
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const codes = (session.metadata?.reservationCodes || session.metadata?.reservationCode || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
    const transactionId = session.id

    const results = []
    for (let i = 0; i < codes.length; i++) {
      // Primary gets the Stripe session ID; secondary payments already have transactionId = null
      results.push(
        await _processResult({
          reservationCode: codes[i],
          transactionId: i === 0 ? transactionId : null,
          success: true,
        })
      )
    }
    return results
  }

  return { message: 'Événement ignoré.' }
}

async function _processResult({ reservationCode, transactionId, success }) {
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

  if (success) {
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: reservation.payment.id },
        data: {
          status: 'CONFIRMED',
          transactionId: transactionId ?? undefined,
          paidAt: new Date(),
        },
      })
      await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'CONFIRMED' } })
    })
    await generateTicket(reservation.id)
    const { notifyReservationConfirmed } = require('../notifications/notifications.service')
    notifyReservationConfirmed(reservation.id).catch(() => {})
    return { message: 'Paiement confirmé.' }
  }

  await prisma.payment.update({
    where: { id: reservation.payment.id },
    data: { status: 'FAILED', transactionId: transactionId ?? undefined },
  })
  return { message: 'Paiement échoué.' }
}

async function getPaymentStatus(paymentId, userId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      reservation: {
        select: {
          userId: true,
          reservationCode: true,
          ticket: { select: { id: true } },
        },
      },
    },
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

  // Fallback local : si le paiement est toujours PENDING mais que la session Stripe
  // est déjà payée (webhook non reçu en développement local), on confirme côté DB.
  if (
    payment.status === 'PENDING' &&
    payment.transactionId?.startsWith('cs_') &&
    stripeConfigured()
  ) {
    try {
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(payment.transactionId)
      if (session.payment_status === 'paid') {
        await _processResult({
          reservationCode: payment.reservation.reservationCode,
          transactionId: session.id,
          success: true,
        })
        // Re-fetch payment avec ticket mis à jour
        return prisma.payment.findUnique({
          where: { id: paymentId },
          include: {
            reservation: {
              select: {
                userId: true,
                reservationCode: true,
                ticket: { select: { id: true } },
              },
            },
          },
        })
      }
    } catch {
      // Stripe indisponible ou session expirée — retourner le statut DB tel quel
    }
  }

  return payment
}

async function generateTicket(reservationId) {
  const { generateTicket: create } = require('../tickets/tickets.service')
  return create(reservationId)
}

module.exports = { initiatePayment, handleWebhook, handleStripeWebhook, getPaymentStatus }
