const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const {
  initiatePaymentHandler,
  webhookHandler,
  stripeWebhookHandler,
  getPaymentStatusHandler,
} = require('./payments.controller')

const router = Router()

router.post('/initiate', authenticate, initiatePaymentHandler)
router.post('/webhook', webhookHandler)
// Stripe IPN — body raw nécessaire pour la vérification de signature (géré dans app.js)
router.post('/stripe-webhook', stripeWebhookHandler)
router.get('/:id/status', authenticate, getPaymentStatusHandler)

module.exports = router
