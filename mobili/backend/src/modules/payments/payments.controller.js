const { z } = require('zod')
const service = require('./payments.service')

const initiateSchema = z.object({
  reservationIds: z.array(z.string().uuid()).min(1, 'Au moins une réservation est requise.'),
})

async function initiatePaymentHandler(req, res, next) {
  try {
    const data = initiateSchema.parse(req.body)
    const result = await service.initiatePayment({ ...data, userId: req.user.id })
    res.status(201).json({ success: true, data: result })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
  }
}

// Webhook CinetPay (IPN) + format legacy / simulation
async function webhookHandler(req, res, next) {
  try {
    const result = await service.handleWebhook(req.body)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
}

// Webhook Stripe — body raw (Buffer) requis pour vérification de signature
async function stripeWebhookHandler(req, res) {
  try {
    const signature = req.headers['stripe-signature']
    const result = await service.handleStripeWebhook(req.body, signature)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function getPaymentStatusHandler(req, res, next) {
  try {
    const payment = await service.getPaymentStatus(req.params.id, req.user.id)
    res.json({ success: true, data: payment })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  initiatePaymentHandler,
  webhookHandler,
  stripeWebhookHandler,
  getPaymentStatusHandler,
}
