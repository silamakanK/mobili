const { z } = require('zod')
const service = require('./payments.service')

const initiateSchema = z.object({
  reservationId: z.string().uuid(),
  method: z.enum(['ORANGE_MONEY', 'MOOV_MONEY', 'WAVE', 'CARD']),
})

const webhookSchema = z.object({
  reservationCode: z.string().min(1),
  transactionId: z.string().min(1),
  status: z.enum(['success', 'failed']),
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

async function webhookHandler(req, res, next) {
  try {
    const data = webhookSchema.parse(req.body)
    const result = await service.handleWebhook(data)
    res.json({ success: true, data: result })
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ success: false, errors: err.errors })
    next(err)
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

module.exports = { initiatePaymentHandler, webhookHandler, getPaymentStatusHandler }
