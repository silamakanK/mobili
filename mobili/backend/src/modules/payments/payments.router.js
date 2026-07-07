const { Router } = require('express')
const { authenticate } = require('../../middleware/auth.middleware')
const { authorize } = require('../../middleware/rbac.middleware')
const {
  initiatePaymentHandler,
  webhookHandler,
  orangeMoneyWebhookHandler,
  stripeWebhookHandler,
  getPaymentStatusHandler,
  reverifyPaymentHandler,
  expireOldPaymentsHandler,
} = require('./payments.controller')

const router = Router()

router.post('/initiate', authenticate, initiatePaymentHandler)
router.post('/webhook', webhookHandler)
router.post('/orange-webhook', orangeMoneyWebhookHandler)
router.post('/stripe-webhook', stripeWebhookHandler)
router.get('/:id/status', authenticate, getPaymentStatusHandler)
// Re-vérification manuelle : utile quand le webhook n'est pas arrivé
router.post('/:id/reverify', authenticate, reverifyPaymentHandler)
// Expiration des paiements PENDING anciens (Super Admin uniquement)
router.post(
  '/admin/expire-pending',
  authenticate,
  authorize('SUPER_ADMIN'),
  expireOldPaymentsHandler
)

module.exports = router
