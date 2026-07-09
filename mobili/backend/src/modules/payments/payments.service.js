const prisma = require('../../config/prisma')
const { isConfigured: stripeConfigured, getStripe } = require('../../config/stripe')
const {
  isConfigured: cinetpayConfigured,
  createPayment: cinetpayCreatePayment,
  checkPayment: cinetpayCheckPayment,
  CHECKOUT_BASE,
} = require('../../config/cinetpay')
const {
  isConfigured: omConfigured,
  createWebPayment,
  checkPaymentStatus: omCheckStatus,
} = require('../../config/orange-money')
const logger = require('../../config/logger')

function _throwError(message, status) {
  const err = new Error(message)
  err.status = status
  throw err
}

function _validateReservations(sorted, userId) {
  for (const r of sorted) {
    if (r.userId !== userId) _throwError('Accès non autorisé.', 403)
    if (r.payment?.status === 'CONFIRMED')
      _throwError(`La réservation ${r.reservationCode} est déjà payée.`, 400)
    if (r.status !== 'PENDING')
      _throwError(`La réservation ${r.reservationCode} ne peut plus être payée.`, 400)
  }
}

async function _resolveIdempotentRedirect(sorted, primary, userId) {
  if (!stripeConfigured()) return null
  if (primary.payment.transactionId?.startsWith('cs_')) {
    try {
      const stripe = getStripe()
      const session = await stripe.checkout.sessions.retrieve(primary.payment.transactionId)
      return session.status === 'open'
        ? session.url
        : await _createStripeSessionMulti(sorted, primary.payment, userId)
    } catch {
      return _createStripeSessionMulti(sorted, primary.payment, userId)
    }
  }
  return _createStripeSessionMulti(sorted, primary.payment, userId)
}

async function _createPaymentRecords(sorted, primary, totalAmount, paymentMethod) {
  const primaryPayment = await prisma.payment.create({
    data: {
      reservationId: primary.id,
      amount: totalAmount,
      method: paymentMethod,
      status: 'PENDING',
    },
  })
  for (const r of sorted.slice(1)) {
    if (!r.payment) {
      await prisma.payment.create({
        data: {
          reservationId: r.id,
          amount: r.totalAmount,
          method: paymentMethod,
          status: 'PENDING',
        },
      })
    }
  }
  return primaryPayment
}

async function initiatePayment({ reservationIds, userId, method = 'CARD' }) {
  if (!reservationIds?.length) _throwError('Au moins une réservation est requise.', 400)

  const reservations = await prisma.reservation.findMany({
    where: { id: { in: reservationIds } },
    include: { payment: true, trip: { include: { route: true } } },
  })

  if (reservations.length !== reservationIds.length)
    _throwError('Une ou plusieurs réservations sont introuvables.', 404)

  const sorted = reservationIds.map((id) => reservations.find((r) => r.id === id))
  _validateReservations(sorted, userId)

  const primary = sorted[0]
  const totalAmount = sorted.reduce((sum, r) => sum + r.totalAmount, 0)

  if (primary.payment?.status === 'PENDING') {
    const redirectUrl = await _resolveIdempotentRedirect(sorted, primary, userId)
    return {
      paymentId: primary.payment.id,
      amount: primary.payment.amount,
      status: 'PENDING',
      reservationCodes: sorted.map((r) => r.reservationCode),
      redirectUrl,
    }
  }

  const paymentMethod = method === 'ORANGE_MONEY' ? 'ORANGE_MONEY' : 'CARD'
  const primaryPayment = await _createPaymentRecords(sorted, primary, totalAmount, paymentMethod)

  let redirectUrl = null
  if (paymentMethod === 'ORANGE_MONEY' && omConfigured()) {
    redirectUrl = await _createOrangeMoneyPayment(primary, primaryPayment)
  } else if (stripeConfigured()) {
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

async function _createOrangeMoneyPayment(reservation, payment) {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`

    const data = await createWebPayment({
      order_id: payment.id,
      amount: payment.amount,
      reference: `Mobili — ${reservation.reservationCode}`,
      return_url: `${frontendUrl}/payment/return`,
      cancel_url: `${frontendUrl}/payment`,
      notif_url: `${backendUrl}/api/payments/orange-webhook`,
      lang: 'fr',
    })

    if (data?.payment_url) {
      // pay_token sert de référence de transaction côté Orange
      await prisma.payment.update({
        where: { id: payment.id },
        data: { transactionId: data.pay_token || payment.id },
      })
      return data.payment_url
    }

    logger.warn('Orange Money createWebPayment — réponse inattendue', { data })
    return null
  } catch (err) {
    logger.error('Orange Money createWebPayment — erreur', { error: err.message })
    return null
  }
}

async function _createCinetpayInvoice(reservation, payment, userId) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`

    const cinetpayTxId = payment.id.replaceAll('-', '')
    const data = await cinetpayCreatePayment({
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
        const check = await cinetpayCheckPayment(cinetpayTxId)
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

/**
 * IPN Orange Money WebPay.
 * Corps attendu : { order_id, status, txnstatus, notif_token, ... }
 * Orange considère txnstatus === '200' comme succès.
 */
async function handleOrangeMoneyWebhook(body) {
  const orderId = body?.order_id
  if (!orderId) {
    logger.warn('Orange Money IPN — order_id manquant', { body })
    return { message: 'order_id manquant.' }
  }

  const payment = await prisma.payment.findUnique({
    where: { id: orderId },
    include: { reservation: { select: { reservationCode: true } } },
  })

  if (!payment) {
    logger.warn('Orange Money IPN — paiement introuvable', { orderId })
    return { message: 'Paiement introuvable.' }
  }

  if (payment.status === 'CONFIRMED') {
    return { message: 'Paiement déjà confirmé.' }
  }

  // Vérification en double-call auprès d'Orange (plus fiable que le seul notif_token)
  let success = body?.txnstatus === '200' || body?.status === 'SUCCESS'
  if (omConfigured()) {
    try {
      const check = await omCheckStatus(orderId)
      success = check?.status === 'SUCCESS' || check?.txnstatus === '200'
    } catch (err) {
      logger.error('Orange Money IPN — checkPaymentStatus échoué', { error: err.message })
      // On garde la valeur du body comme fallback
    }
  }

  logger.info('Orange Money IPN reçu', { orderId, success, txnstatus: body?.txnstatus })
  return _processResult({
    reservationCode: payment.reservation.reservationCode,
    transactionId: body?.txnid || orderId,
    success,
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
  logger.warn('Paiement échoué', { reservationCode, transactionId })
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

// Vérifie manuellement le statut d'un paiement auprès de Stripe / CinetPay.
// Utile quand le webhook n'a pas été reçu ou que le statut local est PENDING/FAILED.
async function _reverifyStripe(payment, paymentId) {
  if (!payment.transactionId?.startsWith('cs_') || !stripeConfigured()) return null
  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(payment.transactionId)
    if (session.payment_status === 'paid') {
      await _processResult({
        reservationCode: payment.reservation.reservationCode,
        transactionId: session.id,
        success: true,
      })
      logger.info('Paiement re-vérifié : confirmé via Stripe', { paymentId })
      return { updated: true, status: 'CONFIRMED' }
    }
    if (session.status === 'expired') {
      await prisma.payment.update({ where: { id: paymentId }, data: { status: 'EXPIRED' } })
      return { updated: true, status: 'EXPIRED' }
    }
    if (session.status === 'complete' && session.payment_status === 'unpaid') {
      await prisma.payment.update({ where: { id: paymentId }, data: { status: 'CANCELLED' } })
      return { updated: true, status: 'CANCELLED' }
    }
  } catch (err) {
    logger.error('reverifyPayment — Stripe error', { error: err.message, paymentId })
  }
  return null
}

async function _reverifyOrangeMoney(payment, paymentId) {
  if (payment.method !== 'ORANGE_MONEY' || !omConfigured()) return null
  try {
    const check = await omCheckStatus(paymentId)
    if (check?.status === 'SUCCESS' || check?.txnstatus === '200') {
      await _processResult({
        reservationCode: payment.reservation.reservationCode,
        transactionId: payment.transactionId || paymentId,
        success: true,
      })
      logger.info('Paiement re-vérifié : confirmé via Orange Money', { paymentId })
      return { updated: true, status: 'CONFIRMED' }
    }
  } catch (err) {
    logger.error('reverifyPayment — Orange Money error', { error: err.message, paymentId })
  }
  return null
}

async function _reverifyCinetpay(payment, paymentId) {
  if (!payment.transactionId || !cinetpayConfigured()) return null
  try {
    const check = await cinetpayCheckPayment(payment.transactionId)
    if (check?.data?.status === 'ACCEPTED') {
      await _processResult({
        reservationCode: payment.reservation.reservationCode,
        transactionId: payment.transactionId,
        success: true,
      })
      return { updated: true, status: 'CONFIRMED' }
    }
  } catch (err) {
    logger.error('reverifyPayment — CinetPay error', { error: err.message, paymentId })
  }
  return null
}

async function reverifyPayment(paymentId, userId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { reservation: { select: { userId: true, reservationCode: true } } },
  })
  if (!payment) _throwError('Paiement introuvable.', 404)
  if (payment.reservation.userId !== userId) _throwError('Accès non autorisé.', 403)
  if (payment.status === 'CONFIRMED') return { alreadyConfirmed: true, status: 'CONFIRMED' }

  const result =
    (await _reverifyStripe(payment, paymentId)) ||
    (await _reverifyOrangeMoney(payment, paymentId)) ||
    (await _reverifyCinetpay(payment, paymentId))

  if (result) return result

  logger.info('reverifyPayment — statut inchangé', { paymentId, status: payment.status })
  return { updated: false, status: payment.status }
}

// Expire les paiements PENDING plus vieux que TTL (1h par défaut).
// À appeler via cron ou manuellement en Super Admin.
async function expireOldPendingPayments({ olderThanMinutes = 60 } = {}) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000)
  const result = await prisma.payment.updateMany({
    where: { status: 'PENDING', createdAt: { lt: cutoff } },
    data: { status: 'EXPIRED' },
  })
  logger.info(`expireOldPendingPayments: ${result.count} paiements expirés`)
  return { expired: result.count }
}

module.exports = {
  initiatePayment,
  handleWebhook,
  handleOrangeMoneyWebhook,
  handleStripeWebhook,
  getPaymentStatus,
  reverifyPayment,
  expireOldPendingPayments,
}
